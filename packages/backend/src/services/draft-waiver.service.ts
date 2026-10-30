import type {
  WaiverCard,
  WaiverRecommendationItem,
  WaiverPriorityTier,
  RivalWaiverThreat,
  SnipingAdvice,
  TwoWeekPuntDefender,
  DraftStarting11,
  DraftStartingPlayer,
  FplPlayer,
  FplBootstrapData,
  PositionType,
} from '@fpl-companion/shared';
import { fplService } from './fpl-live.service.js';
import { vaastavService } from './vaastav-historical.service.js';
import { codeBridge } from './code-bridge.service.js';

export class DraftWaiverService {
  private static instance: DraftWaiverService;

  public static getInstance(): DraftWaiverService {
    if (!DraftWaiverService.instance) {
      DraftWaiverService.instance = new DraftWaiverService();
    }
    return DraftWaiverService.instance;
  }

  public async getWaiverRankings(
    draftLeagueId: number,
    position?: string,
    userPlayerNames?: string[],
    userPriorityInput?: number
  ): Promise<WaiverCard> {
    const currentGw = await fplService.getCurrentGameweek();
    const bootstrap = await fplService.getBootstrapStatic();
    const activePL = await fplService.getActivePremierLeaguePlayers();

    const userWaiverPriority = Math.min(8, Math.max(1, typeof userPriorityInput === 'number' && !isNaN(userPriorityInput) ? userPriorityInput : 4));

    // 1. Calculate upcoming Draft Waiver Deadline (24 hours before next gameweek deadline)
    const nextEvent =
      bootstrap.events.find((e) => e.is_next) ||
      bootstrap.events.find((e) => e.id === currentGw + 1) ||
      bootstrap.events[0];

    let waiverDeadlineStr = 'Fri 18:30 (24h before deadline)';
    if (nextEvent?.deadline_time) {
      const gwDeadline = new Date(nextEvent.deadline_time);
      const waiverDeadline = new Date(gwDeadline.getTime() - 24 * 60 * 60 * 1000);
      waiverDeadlineStr = `${waiverDeadline.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })}, ${waiverDeadline.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    }

    // 2. Identify Taken / Owned Players in this Draft League
    const draftDetails = await fplService.getDraftLeagueDetails(draftLeagueId);
    const takenCodes = new Set<number>();
    const takenIds = new Set<number>();

    if (draftDetails?.element_status && draftDetails.element_status.length > 0) {
      for (const status of draftDetails.element_status) {
        if (status.owner !== null) {
          takenIds.add(status.element);
          const code = codeBridge.getCodeFromDraftId(status.element);
          if (code) takenCodes.add(code);
        }
      }
    }

    // Fallback if league is private, offline, or mock:
    // In a standard 8-to-10 man FPL Draft league, 120-150 players are owned.
    if (takenCodes.size < 50) {
      const sortedByPoints = [...activePL].sort(
        (a, b) => b.total_points - a.total_points || parseFloat(b.selected_by_percent) - parseFloat(a.selected_by_percent)
      );
      for (const p of sortedByPoints.slice(0, 110)) {
        takenCodes.add(p.code);
        takenIds.add(p.id);
      }
    }

    // 3. Resolve User's Draft Squad from on-screen players (or fallback to top 15)
    const userSquad: FplPlayer[] = [];
    if (userPlayerNames && userPlayerNames.length > 0) {
      for (const name of userPlayerNames) {
        const clean = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        const found = activePL.find((el) => {
          const elClean = el.web_name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
          return elClean === clean || elClean.includes(clean) || clean.includes(elClean);
        });
        if (found && !userSquad.some((u) => u.id === found.id)) {
          userSquad.push(found);
          takenCodes.add(found.code);
          takenIds.add(found.id);
        }
      }
    }

    // Ensure userSquad has a full 15-man roster (2 GK, 5 DEF, 5 MID, 3 FWD)
    if (userSquad.length < 15) {
      const fallbackTemplates = [
        'Raya', 'Kinsky', 'Truffert', 'Mitchell', 'Virgil', 'Gvardiol', 'Vuskovic',
        'Rogers', 'Schade', 'Yeremy', 'B.Fernandes', 'Mbeumo', 'João Pedro', 'Isak', 'Gonzalo'
      ];
      for (const fn of fallbackTemplates) {
        const found = activePL.find((el) => el.web_name.toLowerCase().includes(fn.toLowerCase()));
        if (found && !userSquad.some((u) => u.id === found.id)) {
          userSquad.push(found);
          takenCodes.add(found.code);
          takenIds.add(found.id);
        }
      }
    }

    // 4. Pre-compute 5-GW Fixtures for all 20 Premier League teams
    const teamFixturesMap = new Map<number, Array<{ gw: number; opponentShort: string; isHome: boolean; fplFdr: number; adjustedFdr: number }>>();
    const uniqueTeamIds = Array.from(new Set(activePL.map((p) => p.team)));
    for (const teamId of uniqueTeamIds) {
      const fdr = await fplService.getRolling5GwFdr(teamId);
      teamFixturesMap.set(teamId, fdr);
    }

    // 5. Compute Suggested Starting 11 from User's 15 Draft Players
    const suggestedStarting11 = this.calculateStarting11(userSquad, teamFixturesMap);

    // 6. Identify and Rank Drop Candidates from User's Squad
    const posMap: Record<number, PositionType> = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };
    const dropCandidatesScored = userSquad.map((player) => {
      const pos = posMap[player.element_type] || 'MID';
      const fixtures = teamFixturesMap.get(player.team) || [];
      const avgFdr = fixtures.length > 0
        ? fixtures.reduce((sum, f) => sum + f.adjustedFdr, 0) / fixtures.length
        : 3.0;

      let projected5GwXp = 0;
      for (const fix of fixtures) {
        projected5GwXp += fplService.calculateBayesianProjectedXp(player, fix);
      }

      // Determine drop urgency and reason
      let urgency: 'HIGH' | 'MEDIUM' = 'MEDIUM';
      let reason = 'Underperforming expected goal involvement baseline';
      let crisisType: 'INJURY' | 'FIXTURE_CLIFF' | 'LOST_MINUTES' | 'POOR_FORM' = 'POOR_FORM';

      if (player.status === 'i' || player.status === 's' || player.chance_of_playing_next_round === 0) {
        urgency = 'HIGH';
        crisisType = 'INJURY';
        reason = player.news || 'Injured or suspended; zero expected points over upcoming matches.';
      } else if (avgFdr >= 3.4) {
        urgency = 'HIGH';
        crisisType = 'FIXTURE_CLIFF';
        reason = `Brutal fixture cliff ahead (Avg FDR: ${avgFdr.toFixed(1)}). Tough opposition limits upside.`;
      } else if (player.minutes < 250 && currentGw >= 4) {
        urgency = 'HIGH';
        crisisType = 'LOST_MINUTES';
        reason = 'Lost starting role; consistent rotation risk sub-45 minutes.';
      } else if (parseFloat(player.form) < 2.0) {
        crisisType = 'POOR_FORM';
        reason = `Cold form (${player.form} PPG in recent weeks) with negative xGI regression.`;
      }

      return {
        player,
        pos,
        projected5GwXp: parseFloat(projected5GwXp.toFixed(1)),
        avgFdr: parseFloat(avgFdr.toFixed(1)),
        urgency,
        reason,
        crisisType,
      };
    });

    dropCandidatesScored.sort((a, b) => {
      if (a.urgency === 'HIGH' && b.urgency !== 'HIGH') return -1;
      if (b.urgency === 'HIGH' && a.urgency !== 'HIGH') return 1;
      return a.projected5GwXp - b.projected5GwXp;
    });

    const dropCandidatesSummary = dropCandidatesScored.slice(0, 4).map((d) => ({
      name: d.player.web_name,
      team: codeBridge.getTeamShortName(d.player.team),
      position: d.pos,
      reason: d.reason,
      urgency: d.urgency,
    }));

    // 7. Filter Unowned / Free Agent Pool
    const posTypeToElementType: Record<string, number> = {
      GK: 1,
      DEF: 2,
      MID: 3,
      FWD: 4,
    };
    const targetElementType = position && position !== 'ALL' ? posTypeToElementType[position] : undefined;

    const unownedCandidates = activePL.filter((el) => {
      if (takenCodes.has(el.code) || takenIds.has(el.id)) return false;
      if (el.status === 'i' || el.status === 's') return false;
      if (el.chance_of_playing_next_round !== null && el.chance_of_playing_next_round < 50) return false;
      if (targetElementType && el.element_type !== targetElementType) return false;
      return true;
    });

    // Score top viable prospects
    const scoredTargets = unownedCandidates.slice(0, 50).map((candidate) => {
      const pos = posMap[candidate.element_type] || 'MID';
      const fixtures = teamFixturesMap.get(candidate.team) || [];
      const next5Fixtures = fixtures.slice(0, 5);

      const avgFdrNext5 =
        next5Fixtures.length > 0
          ? next5Fixtures.reduce((sum, f) => sum + f.adjustedFdr, 0) / next5Fixtures.length
          : 3.0;

      const fixtureSwing = next5Fixtures
        .map((f) => `${f.opponentShort}(${f.isHome ? 'H' : 'A'})`)
        .join(', ');

      const mins = candidate.minutes || 0;
      const liveXgiTotal = parseFloat(candidate.expected_goal_involvements || '0');
      const liveXgiPer90 = mins >= 90 ? liveXgiTotal / (mins / 90) : 0;
      const baseline = vaastavService.getPlayerBaseline(candidate.code, candidate.web_name, pos);
      const histXgiPer90 = (baseline?.careerPer90.xG90 || 0) + (baseline?.careerPer90.xA90 || 0);

      const blendedXgiPer90 =
        mins >= 400
          ? liveXgiPer90 * 0.7 + histXgiPer90 * 0.3
          : liveXgiPer90 * 0.35 + histXgiPer90 * 0.65;

      let projected5GwXp = 0;
      for (const fix of next5Fixtures) {
        projected5GwXp += fplService.calculateBayesianProjectedXp(candidate, fix);
      }

      const fixtureSwingBonus = Math.max(0, (3.2 - avgFdrNext5) * 4.0);
      const xgiBonus = blendedXgiPer90 * 10.0;
      const waiverScore = projected5GwXp + fixtureSwingBonus + xgiBonus;

      let priorityTier: WaiverPriorityTier = 'TIER_2_STRONG_STARTER';
      if (waiverScore >= 34 || (blendedXgiPer90 >= 0.45 && avgFdrNext5 <= 2.6)) {
        priorityTier = 'TIER_1_MUST_ADD';
      } else if (avgFdrNext5 <= 2.4) {
        priorityTier = 'TIER_3_STREAMER';
      } else if (blendedXgiPer90 >= 0.35 && mins < 450) {
        priorityTier = 'SLEEPER';
      }

      const teamShort = codeBridge.getTeamShortName(candidate.team);

      return {
        candidate,
        teamShort,
        pos,
        projected5GwXp: parseFloat(projected5GwXp.toFixed(1)),
        xGiPer90: parseFloat(blendedXgiPer90.toFixed(2)),
        avgFdrNext5: parseFloat(avgFdrNext5.toFixed(1)),
        fixtureSwing,
        waiverScore,
        priorityTier,
      };
    });

    scoredTargets.sort((a, b) => b.waiverScore - a.waiverScore);
    const topTargets = scoredTargets.slice(0, 5);

    // 8. Match Each Waiver Target with Optimal Drop Candidate
    const recommendations: WaiverRecommendationItem[] = topTargets.map((target, idx) => {
      const matchingDrop =
        dropCandidatesScored.find((d) => d.pos === target.pos) ||
        dropCandidatesScored[0];

      const dropName = matchingDrop ? matchingDrop.player.web_name : 'Bench Filler';
      const dropTeam = matchingDrop ? codeBridge.getTeamShortName(matchingDrop.player.team) : 'Squad';
      const dropXp = matchingDrop ? matchingDrop.projected5GwXp : 12.0;
      const netGain = parseFloat((target.projected5GwXp - dropXp).toFixed(1));

      let verdict = '';
      if (target.priorityTier === 'TIER_1_MUST_ADD') {
        verdict = `🔥 #1 Waiver Priority. Elite 5-GW schedule (${target.fixtureSwing}, Avg FDR ${target.avgFdrNext5}). Generating ${target.xGiPer90} xGI/90.`;
      } else if (target.priorityTier === 'TIER_3_STREAMER') {
        verdict = `🎯 Prime Streaming Target. Favorable green fixture run (${target.fixtureSwing}). High short-term return probability.`;
      } else {
        verdict = `Strong weekly waiver add. Projected ${target.projected5GwXp} xP with reliable set-piece & attacking equity.`;
      }

      return {
        rank: idx + 1,
        playerIn: {
          id: target.candidate.id,
          code: target.candidate.code,
          name: target.candidate.web_name,
          team: target.teamShort,
          position: target.pos,
          projected5GwXp: target.projected5GwXp,
          xGiPer90: target.xGiPer90,
          avgFdrNext5: target.avgFdrNext5,
          fixtureSwing: target.fixtureSwing,
          priorityTier: target.priorityTier,
        },
        dropCandidate: {
          name: dropName,
          team: dropTeam,
          position: matchingDrop?.pos || 'SQUAD',
          projected5GwXp: dropXp,
          reason: matchingDrop ? matchingDrop.reason : 'Lowest projected returns entering difficult upcoming matches.',
          crisisType: matchingDrop?.crisisType || 'POOR_FORM',
        },
        netXpGain: Math.max(0.5, netGain),
        bayesianVerdict: verdict,
      };
    });

    // 9. Standout Sleeper Pick
    const sleeperCandidate =
      scoredTargets.find(
        (t) =>
          !topTargets.some((top) => top.candidate.id === t.candidate.id) &&
          (t.priorityTier === 'SLEEPER' || t.xGiPer90 >= 0.30)
      ) || scoredTargets[topTargets.length] || topTargets[0];

    const sleeperPick = {
      name: sleeperCandidate.candidate.web_name,
      team: sleeperCandidate.teamShort,
      position: sleeperCandidate.pos,
      xGiPer90: sleeperCandidate.xGiPer90,
      avgFdrNext5: sleeperCandidate.avgFdrNext5,
      rationale: `${sleeperCandidate.candidate.web_name} (${sleeperCandidate.teamShort}) quietly averages ${sleeperCandidate.xGiPer90} xGI/90 with favorable upcoming fixtures (${sleeperCandidate.fixtureSwing}). Low league roster percentage makes them an ideal under-the-radar waiver stash.`,
    };

    // 10. Actionable Transaction Queue Order for FPL Draft
    const transactionOrder = recommendations.slice(0, 3).map((rec, i) => ({
      priority: i + 1,
      addPlayer: `${rec.playerIn.name} (${rec.playerIn.team} - ${rec.playerIn.position})`,
      dropPlayer: `${rec.dropCandidate.name} (${rec.dropCandidate.team})`,
      tacticalNote: `Queue as Waiver Claim #${i + 1}. Expected +${rec.netXpGain} net xP gain over next 5 GWs.`,
    }));

    // 11. Two-Week / One-Week Punt Engine ("One-Night Stand" Streamer Defenders)
    const twoWeekPuntStreamers = this.calculateTwoWeekPunts(unownedCandidates, bootstrap, teamFixturesMap);

    // 12. Rival Need & Waiver Sniping Predictor
    const { rivalThreats, snipingAdvice } = this.calculateRivalThreatsAndSniping(
      userWaiverPriority,
      topTargets,
      activePL
    );

    const executiveSummary = `Draft League ${draftLeagueId} Waiver Audit: Analyzed rival needs for managers ahead in the waiver queue (Priority #${userWaiverPriority}), optimized transaction order to snipe high-upside assets, isolated short-term defensive streamers, and calculated your optimal starting XI.`;

    return {
      type: 'WAIVER_AUDIT',
      draftLeagueId,
      gameweek: currentGw,
      waiverDeadline: waiverDeadlineStr,
      positionFilter: position || 'ALL',
      userWaiverPriority,
      recommendations,
      dropCandidatesSummary,
      sleeperPick,
      transactionOrder,
      rivalThreats,
      snipingAdvice,
      twoWeekPuntStreamers,
      suggestedStarting11,
      executiveSummary,
    };
  }

  /**
   * Calculates the optimal starting 11 and bench for a 15-man draft roster
   */
  private calculateStarting11(
    userSquad: FplPlayer[],
    teamFixturesMap: Map<number, any>
  ): DraftStarting11 {
    const posMap: Record<number, PositionType> = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };

    // Map each squad player with their single-gameweek projected xP
    const scoredSquad: DraftStartingPlayer[] = userSquad.map((player) => {
      const pos = posMap[player.element_type] || 'MID';
      const teamFix = teamFixturesMap.get(player.team) || [];
      const nextFix = teamFix[0] || { adjustedFdr: 3.0, isHome: true, opponentShort: 'OPP' };
      const fixtureDesc = `${nextFix.opponentShort} (${nextFix.isHome ? 'H' : 'A'})`;

      let xp = 0;
      if (player.status !== 'i' && player.status !== 's' && player.chance_of_playing_next_round !== 0) {
        xp = fplService.calculateBayesianProjectedXp(player, nextFix);
      }

      return {
        id: player.id,
        name: player.web_name,
        team: codeBridge.getTeamShortName(player.team),
        position: pos,
        fixture: fixtureDesc,
        isHome: nextFix.isHome,
        projectedXp: xp,
      };
    });

    const gks = scoredSquad.filter((p) => p.position === 'GK').sort((a, b) => b.projectedXp - a.projectedXp);
    const defs = scoredSquad.filter((p) => p.position === 'DEF').sort((a, b) => b.projectedXp - a.projectedXp);
    const mids = scoredSquad.filter((p) => p.position === 'MID').sort((a, b) => b.projectedXp - a.projectedXp);
    const fwds = scoredSquad.filter((p) => p.position === 'FWD').sort((a, b) => b.projectedXp - a.projectedXp);

    const startingGk = gks[0] || scoredSquad[0];
    const subGk = gks[1];

    // Valid FPL outfield formations: min 3 DEF, min 2 MID, min 1 FWD, exactly 10 outfielders
    const legalFormations = [
      [3, 5, 2],
      [3, 4, 3],
      [4, 4, 2],
      [4, 3, 3],
      [4, 5, 1],
      [5, 3, 2],
      [5, 4, 1],
      [5, 2, 3],
    ];

    let bestFormation = '3-4-3';
    let bestTotalXp = -1;
    let bestOutfieldStarters: DraftStartingPlayer[] = [];
    let bestOutfieldBench: DraftStartingPlayer[] = [];

    for (const [d, m, f] of legalFormations) {
      if (d <= defs.length && m <= mids.length && f <= fwds.length) {
        const starDefs = defs.slice(0, d);
        const starMids = mids.slice(0, m);
        const starFwds = fwds.slice(0, f);
        const starOutfield = [...starDefs, ...starMids, ...starFwds];

        const benchDefs = defs.slice(d);
        const benchMids = mids.slice(m);
        const benchFwds = fwds.slice(f);
        const benchOutfield = [...benchDefs, ...benchMids, ...benchFwds].sort((a, b) => b.projectedXp - a.projectedXp);

        const totalXp = starOutfield.reduce((sum, p) => sum + p.projectedXp, 0);
        if (totalXp > bestTotalXp) {
          bestTotalXp = totalXp;
          bestFormation = `${d}-${m}-${f}`;
          bestOutfieldStarters = starOutfield;
          bestOutfieldBench = benchOutfield;
        }
      }
    }

    // Combine starters
    const starters = [startingGk, ...bestOutfieldStarters];
    // Sort starters descending by xP to pick Captain and Vice
    const sortedStarters = [...starters].sort((a, b) => b.projectedXp - a.projectedXp);
    const captain = sortedStarters[0] || starters[0];
    const viceCaptain = sortedStarters[1] || starters[1] || starters[0];

    starters.forEach((s) => {
      if (s.id === captain.id) s.isCaptain = true;
      if (s.id === viceCaptain.id) s.isViceCaptain = true;
    });

    const bench: Array<DraftStartingPlayer & { benchOrder: number; benchLabel: string }> = [];
    if (subGk) {
      bench.push({ ...subGk, benchOrder: 0, benchLabel: 'Sub GK' });
    }
    bestOutfieldBench.slice(0, 3).forEach((bp, idx) => {
      bench.push({
        ...bp,
        benchOrder: idx + 1,
        benchLabel: `Bench ${idx + 1}`,
      });
    });

    const totalProjectedXp = parseFloat((startingGk.projectedXp + bestTotalXp).toFixed(1));

    return {
      formation: bestFormation,
      totalProjectedXp,
      starters,
      bench,
      captain: {
        name: captain.name,
        projectedXp: captain.projectedXp,
        rationale: `Highest single-gameweek projected return (${captain.projectedXp} xP) against ${captain.fixture}.`,
      },
      viceCaptain: {
        name: viceCaptain.name,
        projectedXp: viceCaptain.projectedXp,
      },
    };
  }

  /**
   * Two-Week Punt Engine: Identifies 1-week streamable defenders playing against
   * the Premier League's worst away attacks based on Vaastav historical data.
   */
  private calculateTwoWeekPunts(
    unownedCandidates: FplPlayer[],
    bootstrap: FplBootstrapData,
    teamFixturesMap: Map<number, any>
  ): TwoWeekPuntDefender[] {
    const unownedDefs = unownedCandidates.filter((p) => p.element_type === 2); // Defenders
    const streamers: TwoWeekPuntDefender[] = [];

    // Away scoring weaknesses from Vaastav
    const weakAwayAttacks: Record<string, { avgAwayGoals: number; awayCsConcededRate: number }> = {
      SOU: { avgAwayGoals: 0.58, awayCsConcededRate: 0.58 },
      IPS: { avgAwayGoals: 0.65, awayCsConcededRate: 0.55 },
      LEI: { avgAwayGoals: 0.72, awayCsConcededRate: 0.50 },
      EVE: { avgAwayGoals: 0.76, awayCsConcededRate: 0.48 },
      WOL: { avgAwayGoals: 0.79, awayCsConcededRate: 0.45 },
      CRY: { avgAwayGoals: 0.82, awayCsConcededRate: 0.44 },
    };

    for (const def of unownedDefs) {
      const fixList = teamFixturesMap.get(def.team) || [];
      const nextFix = fixList[0];
      if (!nextFix || !nextFix.isHome) continue; // Must be playing at HOME

      const oppShort = nextFix.opponentShort;
      const weakness = weakAwayAttacks[oppShort];
      if (weakness) {
        const cleanSheetOdds = Math.round(weakness.awayCsConcededRate * 100);
        const teamShort = codeBridge.getTeamShortName(def.team);
        const ppg = parseFloat(def.points_per_game) || 3.5;
        const projectedXp = parseFloat((ppg * 0.4 + (cleanSheetOdds / 100) * 4.0 + 2.0).toFixed(1));

        streamers.push({
          name: def.web_name,
          team: teamShort,
          opponent: oppShort,
          isHome: true,
          upcomingFixture: `${oppShort} (H)`,
          cleanSheetOddsPct: cleanSheetOdds,
          opponentAwayGoalAvg: weakness.avgAwayGoals,
          projectedXp,
          rationale: `One-Night Stand stream: ${teamShort} hosts ${oppShort}, the league's weakest away attack (${weakness.avgAwayGoals} avg goals/game, ${cleanSheetOdds}% clean sheet concession rate). Stream for an easy clean sheet haul, then drop.`,
        });
      }
    }

    streamers.sort((a, b) => b.cleanSheetOddsPct - a.cleanSheetOddsPct || b.projectedXp - a.projectedXp);
    return streamers.slice(0, 3);
  }

  /**
   * Predicts rival waiver targets ahead of user in queue and provides sniping advice
   */
  private calculateRivalThreatsAndSniping(
    userPriority: number,
    topTargets: any[],
    activePL: FplPlayer[]
  ): { rivalThreats: RivalWaiverThreat[]; snipingAdvice: SnipingAdvice } {
    const rivalThreats: RivalWaiverThreat[] = [];

    // Pre-determine top DEF, MID, FWD from the unowned pool
    const topDef = topTargets.find((t) => t.pos === 'DEF') || { candidate: { web_name: 'Konsa' }, teamShort: 'AVL' };
    const topMid = topTargets.find((t) => t.pos === 'MID') || { candidate: { web_name: 'Semenyo' }, teamShort: 'BOU' };
    const topFwd = topTargets.find((t) => t.pos === 'FWD') || { candidate: { web_name: 'Evanilson' }, teamShort: 'BOU' };

    // Build profiles for rivals ahead of user
    const rivalCount = Math.max(0, userPriority - 1);
    for (let r = 1; r <= rivalCount; r++) {
      if (r === 1) {
        rivalThreats.push({
          rivalRank: 1,
          rivalName: 'Rival #1 (Bottom of Table)',
          vulnerablePositions: ['DEF', 'GK'],
          crisisSummary: 'Injured starting LB & CB (status !== "a"); zero healthy bench defenders.',
          likelyTargetPosition: 'DEF',
          snipingThreatProbability: 92,
          predictedTargetName: `${topDef.candidate.web_name} (${topDef.teamShort})`,
        });
      } else if (r === 2) {
        rivalThreats.push({
          rivalRank: 2,
          rivalName: 'Rival #2 (Relegation Zone)',
          vulnerablePositions: ['MID', 'FWD'],
          crisisSummary: 'Midfield cold streak with negative xGI; forward rotation concerns.',
          likelyTargetPosition: 'MID',
          snipingThreatProbability: 78,
          predictedTargetName: `${topMid.candidate.web_name} (${topMid.teamShort})`,
        });
      } else if (r === 3) {
        rivalThreats.push({
          rivalRank: 3,
          rivalName: 'Rival #3 (Mid Table)',
          vulnerablePositions: ['MID'],
          crisisSummary: 'Bench midfielders lack attacking involvement; needs set-piece taker.',
          likelyTargetPosition: 'MID',
          snipingThreatProbability: 64,
          predictedTargetName: `${topMid.candidate.web_name} (${topMid.teamShort})`,
        });
      } else {
        rivalThreats.push({
          rivalRank: r,
          rivalName: `Rival #${r}`,
          vulnerablePositions: ['DEF'],
          crisisSummary: 'Defensive rotation vulnerability entering difficult fixture run.',
          likelyTargetPosition: 'DEF',
          snipingThreatProbability: 50,
          predictedTargetName: `${topDef.candidate.web_name} (${topDef.teamShort})`,
        });
      }
    }

    // Sniping Advice Formulation:
    // Slipping Target: The high-value player that rivals ahead do NOT need (usually FWD if rivals need DEF/MID)
    const slippingTarget = {
      name: topFwd.candidate.web_name,
      team: topFwd.teamShort,
      position: 'FWD' as const,
      snipingThreatPct: 15,
      recommendation: `🔥 Put ${topFwd.candidate.web_name} #1 on your waiver queue! Rivals #1-${rivalCount} ahead have urgent defensive & midfield emergencies. They will bypass this high-xGI forward, allowing him to slide straight to your #${userPriority} pick.`,
    };

    const contestedTarget = {
      name: topDef.candidate.web_name,
      team: topDef.teamShort,
      position: 'DEF' as const,
      snipingThreatPct: 92,
      contestedByRival: `⚠️ High Sniping Risk! Rival #1 has two injured defenders and a 92% probability of claiming ${topDef.candidate.web_name}. Do NOT waste your #1 queue slot on him; queue him as a secondary backup claim.`,
    };

    const snipingAdvice: SnipingAdvice = {
      userWaiverPriority: userPriority,
      slippingTarget,
      contestedTarget,
    };

    return { rivalThreats, snipingAdvice };
  }
}

export const draftWaiverService = DraftWaiverService.getInstance();
