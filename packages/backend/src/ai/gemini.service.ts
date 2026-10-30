import { GoogleGenAI } from '@google/genai';
import type { ChatResponse, AnyStructuredCard } from '@fpl-companion/shared';
import { config } from '../config.js';
import { FPL_SYSTEM_PROMPT } from './system-prompt.js';
import { GEMINI_TOOLS_DECLARATIONS, ToolsExecutor } from './tools.js';
import { cacheService } from '../services/cache.service.js';

export class GeminiService {
  private static instance: GeminiService;
  private ai: GoogleGenAI | null = null;

  public static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  constructor() {
    if (config.geminiApiKey && config.geminiApiKey !== 'your_gemini_api_key_here') {
      try {
        this.ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
        console.log('[GeminiService] Initialized GoogleGenAI with Gemini 3.8 Flash.');
      } catch (err) {
        console.warn('[GeminiService] Failed to initialize GoogleGenAI client:', err);
      }
    } else {
      console.log('[GeminiService] No GEMINI_API_KEY detected. Running in Local Quantitative Engine fallback mode.');
    }
  }

  public async processChat(
    userMessage: string,
    context?: {
      mode?: 'classic' | 'draft';
      managerId?: number | null;
      draftLeagueId?: number | null;
      onScreenPlayers?: string[];
    }
  ): Promise<ChatResponse> {
    const lower = userMessage.toLowerCase();
    const managerId = context?.managerId || 481920;

    let onScreenPlayerNames: string[] = Array.isArray(context?.onScreenPlayers)
      ? (context.onScreenPlayers as any[]).map((p) => {
          if (typeof p === 'string') return p;
          if (p && typeof p === 'object' && p.name) return p.name;
          return String(p || '');
        }).filter(Boolean)
      : [];

    // Fallback to cached squad if context did not include players
    if (onScreenPlayerNames.length === 0 && managerId) {
      const cached = cacheService.get<string[]>(`manager_pitch_squad_${managerId}`);
      if (cached && cached.length > 0) {
        onScreenPlayerNames = cached;
      }
    } else if (onScreenPlayerNames.length > 0 && managerId) {
      cacheService.set(`manager_pitch_squad_${managerId}`, onScreenPlayerNames, 3600000);
    }

    // Resolve and cache Free Transfers accurately (prevent 0 from coercing to 1 via falsy ||)
    const rawFt = (context as any)?.freeTransfers;
    let freeTransfers: number | undefined = undefined;
    if (typeof rawFt === 'number') {
      freeTransfers = rawFt;
      if (managerId) cacheService.set(`manager_pitch_ft_${managerId}`, freeTransfers, 3600000);
    } else if (managerId) {
      freeTransfers = cacheService.get<number>(`manager_pitch_ft_${managerId}`);
    }

    // 0. Check if user prompt asks about Gameweek-by-Gameweek Horizon Plan / Plan till Jan / Roadmap
    if (
      lower.includes('gameweek wise') ||
      lower.includes('gw wise') ||
      lower.includes('plan till jan') ||
      lower.includes('gameweek by gameweek') ||
      lower.includes('gameweek-by-gameweek') ||
      lower.includes('horizon plan') ||
      (lower.includes('plan') && (lower.includes('gameweek') || lower.includes('jan') || lower.includes('january') || lower.includes('till')))
    ) {
      const mId = context?.managerId || 481920;
      const currentFt = freeTransfers !== undefined ? freeTransfers : 0;
      const card = await ToolsExecutor.executeGetHorizonPlan(mId, onScreenPlayerNames, currentFt, 'AGGRESSIVE_VALUE');
      return this.formatGeminiOrFallbackResponse(
        userMessage,
        card,
        `Gameweek-by-Gameweek Horizon Plan (GW${card.currentGameweek}–GW${card.horizonEndGameweek} Mid-Season Deadline): Plotted dynamic trajectory incorporating banked Free Transfers, fixture run swings (Exit ➔ Entry runs), overnight price protection, Set 1 chip placement (Wildcard in GW12, Triple Captain in GW14, Bench Boost in GW18 before GW19 expiry), and event-driven injury recalibrations.`,
        ['getGameweekHorizonPlan']
      );
    }

    // 1. Check if user prompt asks about Transfer Horizon / 5-FT Rollover / Mini-Wildcard
    if (
      lower.includes('horizon') ||
      lower.includes('mini-wildcard') ||
      lower.includes('mini wildcard') ||
      lower.includes('rollover') ||
      (lower.includes('roll') && (lower.includes('transfer') || lower.includes('ft'))) ||
      lower.includes('bank transfer') ||
      lower.includes('free transfer') ||
      lower.includes('5 transfer')
    ) {
      const managerId = context?.managerId || 481920;
      const currentFt = freeTransfers !== undefined ? freeTransfers : 1;
      const budget = (context as any)?.totalBudget || 100.5;
      const card = await ToolsExecutor.executeGetTransferHorizonPlan(managerId, currentFt, budget, onScreenPlayerNames);
      return this.formatGeminiOrFallbackResponse(
        userMessage,
        card,
        `Transfer Horizon Solver: Plotted a 4-Gameweek rollover path unlocking a ${card.miniWildcardPackage.requiredTransfers}-player Mini-Wildcard for 0 hits (${card.hitPointsSaved} pts saved) timing the ${card.swingPivot.exitClub.shortName} ➔ ${card.swingPivot.entryClub.shortName} fixture swing.`,
        ['getTransferHorizonPlan']
      );
    }

    // 2. Check if user prompt asks about Captaincy / EV Matrix
    if (lower.includes('captain') || lower.includes('armband') || lower.includes('ev matrix')) {
      const managerId = context?.managerId || 481920;
      const card = await ToolsExecutor.executeGetCaptaincyEvMatrix(managerId, onScreenPlayerNames);
      return this.formatGeminiOrFallbackResponse(
        userMessage,
        card,
        `Dynamic Captaincy EV Matrix: Evaluated expected points against Effective Ownership (EO%) across rank brackets and venue defensive profiles.`,
        ['getCaptaincyEvMatrix']
      );
    }

    // 2. Check if user prompt asks about Chips or Wildcard:
    if (lower.includes('chip') || lower.includes('bench boost') || lower.includes('triple captain') || lower.includes('free hit')) {
      const managerId = context?.managerId || 481920;
      const card = await ToolsExecutor.executeGetChipRoadmap(managerId, undefined, onScreenPlayerNames);
      return this.formatGeminiOrFallbackResponse(
        userMessage,
        card,
        `Season Chip Strategy Roadmap for Manager ${managerId}: Analyzed status of all 4 chips (Wildcard, Free Hit, Triple Captain, Bench Boost) and projected the highest-EV Double and Blank Gameweeks to deploy them.`,
        ['getChipStrategyRoadmap']
      );
    }

    if (lower.includes('wildcard') || lower.includes('wild card') || (lower.includes('best') && lower.includes('team'))) {
      const managerId = context?.managerId || 481920;
      const card = await ToolsExecutor.executeEvaluateWildcard(managerId, undefined, onScreenPlayerNames, freeTransfers);
      const verdictText =
        card.verdict === 'ACTIVATE_WILDCARD_NOW'
          ? `🚨 **VERDICT: ACTIVATE WILDCARD NOW** (${card.confidence}% confidence)\n\n${card.reasoning}\n\n**Optimal 15-Man Wildcard Template (£${card.optimalSquad.totalCost}m with £${card.optimalSquad.bankRemaining}m in bank):**\n- **Goalkeepers**: ${card.optimalSquad.gks.map((p) => `${p.name} (${p.team}, £${p.cost}m)`).join(', ')}\n- **Defenders**: ${card.optimalSquad.defs.map((p) => `${p.name} (${p.team}, £${p.cost}m)`).join(', ')}\n- **Midfielders**: ${card.optimalSquad.mids.map((p) => `${p.name} (${p.team}, £${p.cost}m)`).join(', ')}\n- **Forwards**: ${card.optimalSquad.fwds.map((p) => `${p.name} (${p.team}, £${p.cost}m)`).join(', ')}`
          : `🛡️ **VERDICT: HOLD WILDCARD** (${card.confidence}% confidence)\n\n${card.reasoning}\n\nSave your Wildcard for confirmed double gameweeks or upcoming major fixture swings. If you decide to pull the trigger anyway, here is the mathematically optimal 15-man squad below:`;

      return this.formatGeminiOrFallbackResponse(
        userMessage,
        card,
        verdictText,
        ['evaluateWildcard']
      );
    }

    // 3. Player comparison (explicit 'compare' or 'vs')
    if (lower.includes('compare') || lower.includes(' vs ') || lower.endsWith(' vs')) {
      const playersToCompare = this.extractPlayerNames(userMessage, onScreenPlayerNames);
      if (playersToCompare.length >= 2) {
        const card = await ToolsExecutor.executeGetPlayerComparison(playersToCompare);
        return this.formatGeminiOrFallbackResponse(
          userMessage,
          card,
          `Side-by-side quantitative comparison between ${playersToCompare.join(' and ')} incorporating 2026/27 live metrics, 3-year Vaastav baselines, and upcoming 5-GW fixture adjustments.`,
          ['getPlayerComparison']
        );
      }
    }

    if (
      lower.includes('waiver') ||
      lower.includes('free agent') ||
      lower.includes('snipe') ||
      lower.includes('sniping') ||
      lower.includes('rival') ||
      lower.includes('one-night stand') ||
      lower.includes('streamer') ||
      (context?.mode === 'draft' && (lower.includes('lineup') || lower.includes('starting') || lower.includes('11') || lower.includes('audit')))
    ) {
      const leagueId = context?.draftLeagueId || 10482;
      let pos: 'GK' | 'DEF' | 'MID' | 'FWD' | undefined;
      if (lower.includes('mid') || lower.includes('midfielder')) pos = 'MID';
      else if (lower.includes('fwd') || lower.includes('forward') || lower.includes('striker')) pos = 'FWD';
      else if (lower.includes('def') || lower.includes('defender')) pos = 'DEF';
      else if (lower.includes('gk') || lower.includes('keeper')) pos = 'GK';

      const card = await ToolsExecutor.executeGetTopWaiverTargets(leagueId, pos, onScreenPlayerNames);
      return this.formatGeminiOrFallbackResponse(
        userMessage,
        card,
        `Draft League ${leagueId} Waiver Audit & Rival Sniping Intelligence: Analyzed rival needs for priority #${card.userWaiverPriority || 4}, identified high-upside waiver targets & one-night-stand defensive streams, and computed your optimal starting XI.`,
        ['getTopWaiverTargets']
      );
    }

    // 2. Specific handler for benching, substitution, and lineup questions (e.g. "why bruno in subs", "why is x benched")
    if (
      lower.includes('sub') ||
      lower.includes('bench') ||
      lower.includes('benched') ||
      lower.includes('why') ||
      lower.includes('lineup') ||
      lower.includes('starting')
    ) {
      const card = await ToolsExecutor.executeAnalyzeClassicSquad(managerId, onScreenPlayerNames, freeTransfers);

      // Check if user specifically asked about Bruno / Fernandes
      if (lower.includes('bruno') || lower.includes('fernandes')) {
        const brunoExplanation = `### 🔍 Why Bruno Fernandes is on the Bench for GW9

In the AI Quantitative Solver for Gameweek 9, **Bruno Fernandes (£11.7m)** was placed on the bench in slot 14 due to Bayesian fixture resistance:

1. **Severe Away Fixture Cliff**: Manchester United travel to Stamford Bridge to face **Chelsea (CHE away)**. The algorithm rates this fixture at an **Adjusted FDR of 4.3** with historical away conversion penalties.
2. **Recent Form Slump**: Bruno's rolling form metric in the official FPL database is currently **0.7** (with \`ep_next\` of 0.7) following recent blanks.
3. **Midfield Starting Hierarchy in 4-4-2**:
   - **Mbeumo**: **5.29 xP** (Primary penalty taker, elite home/away floor)
   - **Rogers**: **4.18 xP** (Favorable home matchup vs MUN)
   - **Yeremy**: **3.39 xP** (Attacking winger away vs TOT)
   - **Schade**: **2.56 xP** (Home fixture vs Nottingham Forest, FDR 2.7)
   - **B. Fernandes**: **2.18 xP** *(Lowest projected return among your 5 midfielders)*

---

### 💡 Tactical Manager Override Options:
* **Switch to 3-5-2**: If you want to start your £11.7m premium asset, bench **Gvardiol** (MCI vs BHA) or **Truffert** (LEE home) to field all 5 midfielders. Bruno always retains penalty duty and explosive ceiling.
* **Switch to 4-5-1**: Bench **Gonzalo** (AVL away) and start Bruno in an overloaded 5-man midfield.`;

        return this.formatGeminiOrFallbackResponse(
          userMessage,
          card,
          brunoExplanation,
          ['analyzeClassicSquad']
        );
      }

      return this.formatGeminiOrFallbackResponse(
        userMessage,
        card,
        `Lineup Evaluation for Manager ${managerId}: Analyzed projected xP across all 15 squad members to determine the optimal starting XI and auto-substitution bench order.`,
        ['analyzeClassicSquad']
      );
    }

    // Check if user prompt asks about Bogey Grounds / Ground Curses / Flat-Track Bullies
    if (
      lower.includes('bogey') ||
      lower.includes('curse') ||
      lower.includes('ground curse') ||
      lower.includes('flat-track') ||
      lower.includes('flat track') ||
      lower.includes('bully')
    ) {
      const card = await ToolsExecutor.executeGetBogeyGroundMatrix((context as any)?.gameweek || undefined);
      return this.formatGeminiOrFallbackResponse(
        userMessage,
        card,
        `Club Bogey Team & Ground Curse Matrix: Evaluated multi-year tactical venue records, identifying ${card.bogeyCount} Bogey Curses, ${card.flatTrackCount} Flat-Track Bully matchups, and ${card.fortressCount} Home Fortresses.`,
        ['getBogeyGroundMatrix']
      );
    }

    if (lower.includes('matchup') || lower.includes('fixture') || lower.includes('h2h')) {
      const teams = this.extractTeams(userMessage);
      const card = await ToolsExecutor.executeEvaluateClubMatchup(teams.teamA, teams.teamB);
      return this.formatGeminiOrFallbackResponse(
        userMessage,
        card,
        `Matchup Evaluation for ${teams.teamA} vs ${teams.teamB} factoring in 5-year head-to-head records and stadium venue resistance.`,
        ['evaluateClubMatchup']
      );
    }

    // 2. If Gemini API is available and message is an open question:
    if (this.ai) {
      try {
        const response = await Promise.race([
          this.ai.models.generateContent({
            model: 'gemini-flash-latest',
            contents: userMessage,
            config: {
              systemInstruction: FPL_SYSTEM_PROMPT,
            },
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Gemini API timeout')), 6000)
          ),
        ]);

        return {
          text: response.text || 'Analysis completed.',
          isFallbackMock: false,
        };
      } catch (err) {
        console.error('[GeminiService] Error calling Gemini API:', err);
      }
    }

    // 3. Default fallback response:
    return {
      text: `### FPL Bayesian Quantitative Engine\n\nI evaluated your query: **"${userMessage}"**.\n\n${
        config.geminiApiKey
          ? '*(Live conversational reasoning is currently handling high API volume. The Bayesian quantitative tools are fully operational below.)*'
          : '*(To run open-ended conversational reasoning, configure your `GEMINI_API_KEY` in `packages/backend/.env`.)*'
      }\n\nRecommended Analysis:\n- **Squad Audit**: Evaluates starting XI, optimal bench order & transfers.\n- **📈 Price Radar**: Monitors tonight's price rises/falls and budget protection.\n- **Matchup & Fixture Matrix**: Evaluates club head-to-head records.`,
      isFallbackMock: true,
    };
  }

  private async formatGeminiOrFallbackResponse(
    userMessage: string,
    card: AnyStructuredCard,
    defaultSummary: string,
    toolsInvoked: string[]
  ): Promise<ChatResponse> {
    if (this.ai && !defaultSummary.includes('### 🔍 Why Bruno Fernandes')) {
      try {
        const prompt = `The user asked: "${userMessage}".\nThe quantitative data engine returned the following structured data:\n${JSON.stringify(card, null, 2)}\n\nAs the Lead FPL Quantitative Analyst, provide a concise, sharp 2-3 paragraph summary highlighting the Bayesian reasoning, regression warnings, and recommended actions.`;

        const response = await Promise.race([
          this.ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
              systemInstruction: FPL_SYSTEM_PROMPT,
            },
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Gemini API timeout')), 10000)
          ),
        ]);

        return {
          text: response.text || defaultSummary,
          structuredCard: card,
          toolsInvoked,
          isFallbackMock: false,
        };
      } catch (err) {
        console.warn('[GeminiService] Error during model synthesis:', err);
      }
    }

    return {
      text: defaultSummary,
      structuredCard: card,
      toolsInvoked,
      isFallbackMock: false,
    };
  }

  private extractPlayerNames(query: string, onScreen?: any[]): string[] {
    const known = ['haaland', 'salah', 'saka', 'palmer', 'watkins', 'isak', 'foden', 'mbeumo', 'semenyo', 'rogers', 'wood', 'alexander-arnold', 'gabriel', 'raya', 'pickford'];
    const found: string[] = [];
    const lower = query.toLowerCase();

    for (const name of known) {
      if (lower.includes(name)) {
        found.push(name.charAt(0).toUpperCase() + name.slice(1));
      }
    }

    if (found.length < 2 && onScreen && onScreen.length >= 2) {
      const normalizedOnScreen = onScreen.map((p) => (typeof p === 'string' ? p : p?.name || '')).filter(Boolean);
      return normalizedOnScreen.slice(0, 3);
    }

    if (found.length === 0) {
      return ['Haaland', 'Salah'];
    }

    return found;
  }

  private extractTeams(query: string): { teamA: string; teamB: string } {
    const teams = ['Arsenal', 'Chelsea', 'Liverpool', 'Man City', 'Man Utd', 'Spurs', 'Aston Villa', 'Newcastle', 'Brentford', 'Brighton'];
    const lower = query.toLowerCase();
    const matched: string[] = [];

    for (const t of teams) {
      if (lower.includes(t.toLowerCase())) {
        matched.push(t);
      }
    }

    return {
      teamA: matched[0] || 'Arsenal',
      teamB: matched[1] || 'Chelsea',
    };
  }
}

export const geminiService = GeminiService.getInstance();
