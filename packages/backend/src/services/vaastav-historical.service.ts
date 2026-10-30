import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  VaastavPlayerPer90,
  VaastavClubH2H,
  VaastavVenueProfile,
  RegressionAnalysis,
} from '@fpl-companion/shared';
import { codeBridge } from './code-bridge.service.js';
import { cacheService } from './cache.service.js';

interface SeedDataStructure {
  lastUpdated: string;
  source: string;
  seasonsIncluded: string[];
  clubs: Array<{
    code: number;
    name: string;
    shortName: string;
    stadium: string;
    historicalStrength: {
      attackHome: number;
      defenceHome: number;
      attackAway: number;
      defenceAway: number;
    };
    venueStats: {
      winRate: number;
      cleanSheetRate: number;
      avgGoalsScored: number;
      avgGoalsConceded: number;
    };
  }>;
  h2hMatrix: VaastavClubH2H[];
  playerBaselines: Array<{
    code: number;
    name: string;
    webName: string;
    position: 'GK' | 'DEF' | 'MID' | 'FWD';
    team: string;
    careerPer90: VaastavPlayerPer90;
    seasons: Record<string, { points: number; goals: number; assists: number; xG: number; xA: number; minutes: number }>;
  }>;
}

export class VaastavHistoricalService {
  private static instance: VaastavHistoricalService;

  private clubs = new Map<string, SeedDataStructure['clubs'][0]>();
  private h2h = new Map<string, VaastavClubH2H>();
  private baselines = new Map<number, SeedDataStructure['playerBaselines'][0]>();
  private baselinesByName = new Map<string, SeedDataStructure['playerBaselines'][0]>();
  private isLoaded = false;

  public static getInstance(): VaastavHistoricalService {
    if (!VaastavHistoricalService.instance) {
      VaastavHistoricalService.instance = new VaastavHistoricalService();
    }
    return VaastavHistoricalService.instance;
  }

  public init(): void {
    if (this.isLoaded) return;

    try {
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const seedPath = path.resolve(__dirname, '../../data/seed-vaastav.json');

      if (fs.existsSync(seedPath)) {
        const raw = fs.readFileSync(seedPath, 'utf-8');
        const data: SeedDataStructure = JSON.parse(raw);

        for (const club of data.clubs) {
          const norm = codeBridge.normalizeTeamName(club.name);
          this.clubs.set(norm, club);
          this.clubs.set(club.shortName.toUpperCase(), club);
        }

        for (const record of data.h2hMatrix) {
          const a = codeBridge.normalizeTeamName(record.teamA);
          const b = codeBridge.normalizeTeamName(record.teamB);
          this.h2h.set(`${a}__${b}`, record);
          this.h2h.set(`${b}__${a}`, {
            ...record,
            teamA: b,
            teamB: a,
            winsA: record.winsB,
            winsB: record.winsA,
            goalsA: record.goalsB,
            goalsB: record.goalsA,
            cleanSheetsA: record.cleanSheetsB,
            cleanSheetsB: record.cleanSheetsA,
          });
        }

        for (const player of data.playerBaselines) {
          this.baselines.set(player.code, player);
          this.baselinesByName.set(player.webName.toLowerCase(), player);
          this.baselinesByName.set(player.name.toLowerCase(), player);
        }

        this.isLoaded = true;
        console.log(`[VaastavService] Loaded ${this.baselines.size} historical player baselines & ${this.clubs.size / 2} clubs.`);
      }
    } catch (err) {
      console.error('[VaastavService] Failed to load seed-vaastav.json:', err);
    }
  }

  public getPlayerBaseline(
    code: number,
    webName?: string,
    position?: string
  ): SeedDataStructure['playerBaselines'][0] | undefined {
    this.init();
    if (this.baselines.has(code)) {
      return this.baselines.get(code);
    }
    if (webName) {
      const clean = webName.toLowerCase().trim();
      const direct = this.baselinesByName.get(clean);
      if (direct && (!position || direct.position === position)) {
        return direct;
      }
      for (const [name, baseline] of this.baselinesByName.entries()) {
        if ((name.includes(clean) || clean.includes(name)) && (!position || baseline.position === position)) {
          return baseline;
        }
      }
    }
    return undefined;
  }

  public getAllPlayerBaselines(): Array<SeedDataStructure['playerBaselines'][0]> {
    this.init();
    return Array.from(this.baselines.values());
  }

  public getClub(teamName: string): SeedDataStructure['clubs'][0] | undefined {
    this.init();
    const norm = codeBridge.normalizeTeamName(teamName);
    return this.clubs.get(norm);
  }

  public getClubH2H(teamA: string, teamB: string): VaastavClubH2H {
    this.init();
    const a = codeBridge.normalizeTeamName(teamA);
    const b = codeBridge.normalizeTeamName(teamB);
    const key = `${a}__${b}`;

    const existing = this.h2h.get(key);
    if (existing) {
      return existing;
    }

    // Promoted teams or clubs that have not faced each other in recent PL seasons (last 3 years in Vaastav DB)
    return {
      teamA: a,
      teamB: b,
      meetings: 0,
      winsA: 0,
      winsB: 0,
      draws: 0,
      goalsA: 0,
      goalsB: 0,
      cleanSheetsA: 0,
      cleanSheetsB: 0,
      avgTotalGoals: 0,
      venueBias: { homeAdvantagePct: 0.16 },
    };
  }

  public getVenueProfile(teamName: string): VaastavVenueProfile {
    this.init();
    const club = this.getClub(teamName);
    if (club) {
      return {
        teamCode: club.code,
        stadiumName: club.stadium,
        matchesPlayed: 57, // 3 seasons x 19 home matches
        winRate: club.venueStats.winRate,
        drawRate: parseFloat((1 - club.venueStats.winRate - 0.25).toFixed(2)),
        lossRate: 0.25,
        cleanSheetRate: club.venueStats.cleanSheetRate,
        avgGoalsScored: club.venueStats.avgGoalsScored,
        avgGoalsConceded: club.venueStats.avgGoalsConceded,
      };
    }

    return {
      teamCode: 0,
      stadiumName: `${teamName} Ground`,
      matchesPlayed: 38,
      winRate: 0.45,
      drawRate: 0.25,
      lossRate: 0.30,
      cleanSheetRate: 0.30,
      avgGoalsScored: 1.5,
      avgGoalsConceded: 1.4,
    };
  }

  public calculateRegression(
    playerCode: number,
    liveGoals: number,
    liveXG: number,
    liveMinutes: number,
    webName: string
  ): RegressionAnalysis {
    this.init();
    const baseline = this.getPlayerBaseline(playerCode);

    const live90s = Math.max(1, liveMinutes / 90);
    const liveXG90 = liveXG / live90s;
    const historicalXG90 = baseline?.careerPer90.xG90 || liveXG90;
    const careerConversion = baseline?.careerPer90.conversionRate || 0.20;

    // Conversion efficiency = actual goals / expected goals
    const liveFinishingEfficiency = liveXG > 0 ? liveGoals / liveXG : 1.0;

    let regressionStatus: RegressionAnalysis['regressionStatus'] = 'FAIR_VALUE';
    let confidenceNote = 'Returns closely align with underlying expected data.';

    if (liveMinutes >= 360) {
      if (liveFinishingEfficiency >= 2.0 && liveGoals >= 4 && careerConversion < 0.22) {
        regressionStatus = 'UNSUSTAINABLE_HOT_STREAK';
        confidenceNote = `Finishing at ${(liveFinishingEfficiency * 100).toFixed(0)}% of xG. Historic conversion rate is ${(careerConversion * 100).toFixed(0)}%. Expect negative goal regression.`;
      } else if (liveFinishingEfficiency >= 1.3 && (baseline?.careerPer90.finishingDelta || 0) > 0.05) {
        regressionStatus = 'SUSTAINED_ELITE_FINISHING';
        confidenceNote = `Consistently outperforms xG over multiple Vaastav seasons (+${((baseline?.careerPer90.finishingDelta || 0.05) * 100).toFixed(0)}% finishing delta). Sustainable form.`;
      } else if (liveFinishingEfficiency <= 0.45 && liveXG >= 2.5) {
        regressionStatus = 'UNLUCKY_DUE_POSITIVE_REBOUND';
        confidenceNote = `Underperforming xG (${liveGoals} goals from ${liveXG.toFixed(1)} xG). Historic baseline indicates high probability of positive rebound.`;
      }
    }

    return {
      playerCode,
      webName,
      liveGoals,
      liveXG,
      historicalXG90: parseFloat(historicalXG90.toFixed(2)),
      liveXG90: parseFloat(liveXG90.toFixed(2)),
      finishingEfficiency: parseFloat(liveFinishingEfficiency.toFixed(2)),
      regressionStatus,
      confidenceNote,
    };
  }

  public calculateAdjustedFdr(
    teamName: string,
    opponentName: string,
    isHome: boolean,
    rawFplFdr: number
  ): { adjustedFdr: number; rationale: string } {
    this.init();
    const h2h = this.getClubH2H(teamName, opponentName);
    const oppVenue = this.getVenueProfile(opponentName);

    // Baseline FPL FDR is 1 to 5.
    // Factor in historical away venue resistance or home advantage
    let adjustment = 0;

    if (isHome) {
      adjustment -= 0.3; // Standard home advantage
      if (h2h.meetings > 0 && h2h.winsA / h2h.meetings > 0.6) {
        adjustment -= 0.3; // Strong historic home dominance
      }
    } else {
      adjustment += 0.3; // Standard away penalty
      if (oppVenue.cleanSheetRate > 0.45) {
        adjustment += 0.4; // Opponent has historically elite home clean sheet rate
      }
      if (h2h.meetings > 0 && h2h.winsB / h2h.meetings > 0.6) {
        adjustment += 0.3; // Opponent historically dominates this fixture
      }
    }

    const finalFdr = Math.min(5.0, Math.max(1.0, parseFloat((rawFplFdr + adjustment).toFixed(1))));

    return {
      adjustedFdr: finalFdr,
      rationale: isHome
        ? `${teamName} at home with ${Math.round(h2h.venueBias.homeAdvantagePct * 100)}% historic venue bump.`
        : `Away at ${oppVenue.stadiumName} (historic clean sheet rate: ${Math.round(oppVenue.cleanSheetRate * 100)}%).`,
    };
  }
}

export const vaastavService = VaastavHistoricalService.getInstance();
