import type {
  CaptaincyEvMatrixCard,
  CaptaincyCandidateEv,
  CaptaincyRiskProfile,
  FplPlayer,
  PositionType,
} from '@fpl-companion/shared';
import { fplService } from './fpl-live.service.js';
import { vaastavService } from './vaastav-historical.service.js';
import { codeBridge } from './code-bridge.service.js';
import { cacheService } from './cache.service.js';

export class CaptaincyEvService {
  private static instance: CaptaincyEvService;

  public static getInstance(): CaptaincyEvService {
    if (!CaptaincyEvService.instance) {
      CaptaincyEvService.instance = new CaptaincyEvService();
    }
    return CaptaincyEvService.instance;
  }

  public async calculateEvMatrix(
    managerId: number,
    playerNames?: string[]
  ): Promise<CaptaincyEvMatrixCard> {
    const currentGw = await fplService.getCurrentGameweek();
    const bootstrap = await fplService.getBootstrapStatic();
    const activePL = await fplService.getActivePremierLeaguePlayers();

    // 1. Identify Candidate Pool
    // Prioritize user's on-screen pitch players (MIDs & FWDs, or highest-xP starters)
    let candidatePlayers: FplPlayer[] = [];
    let isUserSquadProvided = !!(playerNames && playerNames.length > 0);

    // If playerNames was not provided directly, check server-side squad cache
    if (!isUserSquadProvided && managerId) {
      const cached = cacheService.get<string[]>(`manager_pitch_squad_${managerId}`);
      if (cached && cached.length > 0) {
        playerNames = cached;
        isUserSquadProvided = true;
      }
    }

    if (isUserSquadProvided && playerNames) {
      const seen = new Set<number>();
      for (const name of playerNames) {
        const clean = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        // Priority 1: Exact web_name match
        let found = activePL.find((el) => {
          const elClean = el.web_name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
          return elClean === clean;
        });
        // Priority 2: Partial web_name or second_name match
        if (!found) {
          found = activePL.find((el) => {
            const elClean = el.web_name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
            const secClean = (el.second_name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
            return elClean.includes(clean) || clean.includes(elClean) || secClean === clean;
          });
        }
        if (found && !seen.has(found.id)) {
          seen.add(found.id);
          candidatePlayers.push(found);
        }
      }
    }

    if (candidatePlayers.length === 0) {
      const picksData = await fplService.getEntryPicks(managerId, currentGw);
      if (picksData?.picks) {
        candidatePlayers = picksData.picks
          .map((p) => bootstrap.elements.find((el) => el.id === p.element))
          .filter((el): el is FplPlayer => !!el);
      }
    }

    // STRICT 100% IN-SQUAD ENFORCEMENT:
    // External template players (like Haaland or Salah when not owned) are NEVER inserted into candidate pool!
    // Filter candidate list: focus on MIDs & FWDs with high expected minutes and positive status
    const attackingCandidates = candidatePlayers.filter(
      (el) => (el.element_type === 3 || el.element_type === 4) && el.status !== 'i' && el.status !== 's'
    );

    // If squad has fewer than 2 attacking candidates, include top defenders
    const effectivePool = attackingCandidates.length >= 2
      ? attackingCandidates
      : candidatePlayers.filter((el) => el.status !== 'i');

    const uniquePool = Array.from(new Map(effectivePool.map((p) => [p.id, p])).values());

    // 2. Pre-load FDR and Opponent Venues
    const posMap: Record<number, PositionType> = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };

    const evaluatedCandidates: CaptaincyCandidateEv[] = await Promise.all(
      uniquePool.map(async (player) => {
        const pos = posMap[player.element_type] || 'MID';
        const teamShort = codeBridge.getTeamShortName(player.team);
        const fixtures = await fplService.getRolling5GwFdr(player.team);
        const currentFixture = fixtures[0] || {
          gw: currentGw,
          opponentShort: 'OPP',
          isHome: true,
          fplFdr: 3,
          adjustedFdr: 3,
        };

        const opponentShort = currentFixture.opponentShort;
        const isHome = currentFixture.isHome;
        const fixtureStr = `${opponentShort} (${isHome ? 'H' : 'A'})`;

        // 3. Opponent Club Defensive History at Home/Away Ground
        const opponentVenue = vaastavService.getVenueProfile(opponentShort);
        const opponentClub = vaastavService.getClub(opponentShort);

        let cleanSheetRate = 0.25;
        let avgGoalsConceded = 1.35;
        let stadium = opponentVenue.stadiumName;

        if (isHome) {
          // Player is at HOME, opponent is AWAY
          // Opponent away defensive numbers:
          cleanSheetRate = Math.max(0.10, parseFloat((opponentVenue.cleanSheetRate * 0.75).toFixed(2)));
          avgGoalsConceded = parseFloat((opponentVenue.avgGoalsConceded * 1.25).toFixed(2));
          stadium = `${teamShort} Home Ground`;
        } else {
          // Player is AWAY, opponent is at HOME
          cleanSheetRate = opponentVenue.cleanSheetRate;
          avgGoalsConceded = opponentVenue.avgGoalsConceded;
          stadium = opponentVenue.stadiumName;
        }

        // Venue Vulnerability Rating
        let venueVulnerability: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
        if (avgGoalsConceded >= 1.60 || cleanSheetRate <= 0.20) {
          venueVulnerability = 'HIGH';
        } else if (avgGoalsConceded <= 1.10 && cleanSheetRate >= 0.35) {
          venueVulnerability = 'LOW';
        }

        // 4. Bayesian Base xP Calculation
        const baseXp = fplService.calculateBayesianProjectedXp(player, currentFixture);

        // 5. Effective Ownership (EO) Modeling across Rank Brackets
        // Model EO dynamically using live ownership % and expected captaincy gravity
        const startingOwnership = parseFloat(player.selected_by_percent) || 10.0;
        const isHaaland = player.web_name.toLowerCase().includes('haaland');
        const isSalah = player.web_name.toLowerCase().includes('salah');
        const isPalmer = player.web_name.toLowerCase().includes('palmer');
        const isSaka = player.web_name.toLowerCase().includes('saka');

        let eoTop10k = 15;
        let eoTop100k = 18;
        let eoOverall = Math.round(startingOwnership * 1.1);

        if (isHaaland) {
          eoTop10k = 168;
          eoTop100k = 152;
          eoOverall = 118;
        } else if (isSalah) {
          eoTop10k = 72;
          eoTop100k = 65;
          eoOverall = 52;
        } else if (isPalmer || isSaka) {
          eoTop10k = 48;
          eoTop100k = 44;
          eoOverall = 38;
        } else if (startingOwnership >= 20.0) {
          eoTop10k = Math.round(startingOwnership * 1.25);
          eoTop100k = Math.round(startingOwnership * 1.20);
        } else {
          eoTop10k = Math.max(2, Math.round(startingOwnership * 0.8));
          eoTop100k = Math.max(3, Math.round(startingOwnership * 0.9));
        }

        // 6. Shield Score (Protection / Safety) & Sword Score (Differential Leverage)
        // Shield Score (0-100): High when player has high EO and high xP (covers against rank drops)
        const shieldScore = Math.min(
          100,
          Math.max(5, Math.round((eoTop100k / 160) * 55 + (baseXp / 8.5) * 45))
        );

        // Sword Score (0-100): High when player has LOW EO and high xP (huge rank gains against the field)
        const eoInversion = Math.max(0, 1.0 - eoTop100k / 170);
        const swordScore = Math.min(
          100,
          Math.max(5, Math.round(eoInversion * 60 + (baseXp / 8.5) * 40))
        );

        // 7. Dynamic EV calculations
        // Protect Rank EV: covers template exposure
        const protectRankEv = parseFloat(
          (2.0 * baseXp * Math.min(1.4, Math.max(0.65, eoTop100k / 100))).toFixed(2)
        );

        // Chase Rank EV: rewards differential multiplier
        const chaseRankEv = parseFloat(
          (2.0 * baseXp * Math.min(2.0, Math.max(0.65, 2.0 - eoTop100k / 100))).toFixed(2)
        );

        // Balanced EV: blended mathematical expectation
        const balancedEv = parseFloat(
          ((protectRankEv * 0.5 + chaseRankEv * 0.5) * 0.95).toFixed(2)
        );

        // Risk Profile Classification
        let riskProfile: CaptaincyRiskProfile = 'CALCULATED_DIFFERENTIAL';
        if (eoTop100k >= 100) {
          riskProfile = 'SAFE_TEMPLATE_SHIELD';
        } else if (eoTop100k < 25) {
          riskProfile = 'HIGH_RISK_PUNT';
        }

        // Tactical Verdict
        let verdict = '';
        if (riskProfile === 'SAFE_TEMPLATE_SHIELD') {
          verdict = `🛡️ Essential Template Shield. ${eoTop100k}% EO in Top 100k means failing to captain them risks catastrophic rank damage if they score.`;
        } else if (riskProfile === 'CALCULATED_DIFFERENTIAL') {
          verdict = `⚡ High-Upside Differential. ${eoTop100k}% EO offers massive rank climb leverage without extreme downside exposure.`;
        } else {
          verdict = `💣 Rank-Chaser Punt. Low ${eoTop100k}% EO offers 2.5x+ rank acceleration if they haul against ${opponentShort}.`;
        }

        return {
          id: player.id,
          code: player.code,
          name: player.web_name,
          team: teamShort,
          position: pos,
          fixture: fixtureStr,
          isHome,
          opponent: opponentShort,
          opponentDefensiveRating: {
            cleanSheetRate,
            avgGoalsConceded,
            stadium,
            venueVulnerability,
          },
          baseXp,
          effectiveOwnership: {
            top10k: eoTop10k,
            top100k: eoTop100k,
            overall: eoOverall,
          },
          shieldScore,
          swordScore,
          dynamicEv: {
            protectRankEv,
            chaseRankEv,
            balancedEv,
          },
          riskProfile,
          recommendationVerdict: verdict,
        };
      })
    );

    // Sort candidates: Top overall dynamic EV
    evaluatedCandidates.sort((a, b) => b.dynamicEv.balancedEv - a.dynamicEv.balancedEv);

    // Identify Top Safe Pick (Highest Shield Score strictly within user's squad)
    const safeSorted = [...evaluatedCandidates].sort((a, b) => b.shieldScore - a.shieldScore);
    const topSafe = safeSorted[0] || evaluatedCandidates[0];

    // Identify Top Differential Pick (Highest Sword Score strictly within user's squad, distinct from topSafe if possible)
    const otherCandidates = evaluatedCandidates.filter((c) => c.id !== topSafe.id);
    const differentialSorted = [...(otherCandidates.length > 0 ? otherCandidates : evaluatedCandidates)]
      .sort((a, b) => b.swordScore - a.swordScore);
    const topDiff = differentialSorted[0] || evaluatedCandidates[0];

    const leverageMultiplier = topDiff
      ? `+${((200 - topDiff.effectiveOwnership.top100k) / 50).toFixed(1)}x rank gain per goal`
      : '+2.5x rank climb';

    const topSafePick = {
      name: topSafe.name,
      team: topSafe.team,
      projectedXp: topSafe.baseXp,
      eoTop100k: topSafe.effectiveOwnership.top100k,
      rationale: `Highest Shield Score (${topSafe.shieldScore}/100) with ${topSafe.effectiveOwnership.top100k}% EO. Protects rank floor against opposing template hauls.`,
    };

    const topDifferentialPick = {
      name: topDiff.name,
      team: topDiff.team,
      projectedXp: topDiff.baseXp,
      eoTop100k: topDiff.effectiveOwnership.top100k,
      leverageMultiplier,
      rationale: `${topDiff.name} provides ${topDiff.swordScore}/100 Sword Score with only ${topDiff.effectiveOwnership.top100k}% EO against ${topDiff.opponent} (conceding ${topDiff.opponentDefensiveRating.avgGoalsConceded} g/m).`,
    };

    const executiveVerdict =
      topSafe.effectiveOwnership.top100k >= 120
        ? `Template captain ${topSafe.name} is the mathematically optimal choice to Protect Rank (${topSafe.effectiveOwnership.top100k}% Top 100k EO). If chasing rank or trailing in mini-leagues, pivot to ${topDiff.name} (${topDiff.effectiveOwnership.top100k}% EO) for explosive upside.`
        : `Captaining ${topSafe.name} provides the optimal balance of Bayesian expected returns (${topSafe.baseXp} xP) and protective coverage. ${topDiff.name} serves as the primary differential alternative.`;

    return {
      type: 'CAPTAINCY_EV_MATRIX',
      gameweek: currentGw,
      managerId,
      topSafePick,
      topDifferentialPick,
      candidates: evaluatedCandidates,
      bracketAnalysis: {
        rankTier: 'TOP_100K',
        templateCaptain: topSafe.name,
        templateRiskThreshold: `${topSafe.effectiveOwnership.top100k}% EO`,
      },
      executiveVerdict,
    };
  }
}

export const captaincyEvService = CaptaincyEvService.getInstance();
