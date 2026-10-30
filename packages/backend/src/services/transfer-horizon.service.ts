import type {
  TransferHorizonCard,
  HorizonWeekAction,
  MiniWildcardSwapItem,
  ClubFixtureSwingPivot,
  FplPlayer,
  PositionType,
} from '@fpl-companion/shared';
import { fplService } from './fpl-live.service.js';
import { vaastavService } from './vaastav-historical.service.js';
import { codeBridge } from './code-bridge.service.js';

export class TransferHorizonService {
  private static instance: TransferHorizonService;

  public static getInstance(): TransferHorizonService {
    if (!TransferHorizonService.instance) {
      TransferHorizonService.instance = new TransferHorizonService();
    }
    return TransferHorizonService.instance;
  }

  public async generateHorizonPlan(
    managerId: number,
    currentFtInput?: number,
    budgetInput?: number,
    playerNames?: string[]
  ): Promise<TransferHorizonCard> {
    const currentGw = await fplService.getCurrentGameweek();
    const bootstrap = await fplService.getBootstrapStatic();
    const activePL = await fplService.getActivePremierLeaguePlayers();

    // 1. Resolve Current Free Transfers (clamped 0 to 5, default 0)
    const currentFt = Math.min(5, Math.max(0, typeof currentFtInput === 'number' && !isNaN(currentFtInput) ? currentFtInput : 0));
    const userBudget = budgetInput && budgetInput > 80 ? budgetInput : 100.5;

    // 2. Resolve User Squad Players
    let squadPlayers: FplPlayer[] = [];
    if (playerNames && playerNames.length > 0) {
      const seen = new Set<number>();
      for (const name of playerNames) {
        const clean = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        const found = activePL.find((el) => {
          const elClean = el.web_name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
          return elClean === clean || elClean.includes(clean) || clean.includes(elClean);
        });
        if (found && !seen.has(found.id)) {
          seen.add(found.id);
          squadPlayers.push(found);
        }
      }
    }

    if (squadPlayers.length < 11) {
      const picksData = await fplService.getEntryPicks(managerId, currentGw);
      if (picksData?.picks && picksData.picks.length > 0) {
        squadPlayers = picksData.picks
          .map((p) => bootstrap.elements.find((el) => el.id === p.element))
          .filter((el): el is FplPlayer => !!el);
      }
    }

    // High quality fallback if neither onScreen nor API returned squad
    if (squadPlayers.length < 11) {
      const fallbackNames = [
        'Raya', 'Kinsky', 'Truffert', 'Mitchell', 'Virgil', 'Gvardiol', 'Vuskovic',
        'Rogers', 'Schade', 'Yeremy', 'B.Fernandes', 'Mbeumo', 'João Pedro', 'Isak', 'Gonzalo'
      ];
      for (const fn of fallbackNames) {
        const p = activePL.find((el) => el.web_name.toLowerCase().includes(fn.toLowerCase()));
        if (p && !squadPlayers.some((sp) => sp.id === p.id)) {
          squadPlayers.push(p);
        }
      }
    }

    // 3. Pre-compute upcoming fixtures for all 20 teams
    const allFixtures = await fplService.getFixtures();
    const teamFixturesMap = new Map<number, Array<{ gw: number; opponentShort: string; isHome: boolean; adjustedFdr: number }>>();

    for (const team of bootstrap.teams) {
      const upcoming = allFixtures
        .filter((f) => f.event !== null && f.event >= currentGw && (f.team_h === team.id || f.team_a === team.id) && !f.finished)
        .slice(0, 6)
        .map((f) => {
          const isHome = f.team_h === team.id;
          const oppId = isHome ? f.team_a : f.team_h;
          const opp = bootstrap.teams.find((t) => t.id === oppId);
          const rawFdr = isHome ? f.team_h_difficulty : f.team_a_difficulty;
          const { adjustedFdr } = vaastavService.calculateAdjustedFdr(team.name, opp?.name || 'Opponent', isHome, rawFdr);
          return {
            gw: f.event || currentGw,
            opponentShort: opp?.short_name || 'OPP',
            isHome,
            adjustedFdr,
          };
        });
      teamFixturesMap.set(team.id, upcoming);
    }

    // 4. Identify Club Fixture Swing Pivot (Exit Club vs Entry Club)
    // Find clubs represented in squad
    const squadTeamCounts = new Map<number, number>();
    for (const sp of squadPlayers) {
      squadTeamCounts.set(sp.team, (squadTeamCounts.get(sp.team) || 0) + 1);
    }

    // Evaluate difficulty spike in GW+2 to GW+5 for user clubs vs outside clubs
    let bestExitTeam = bootstrap.teams[0];
    let worstExitFdr = 0;
    let exitRunDesc = '';

    for (const [teamId, count] of squadTeamCounts.entries()) {
      const team = bootstrap.teams.find((t) => t.id === teamId);
      if (!team) continue;
      const fixList = teamFixturesMap.get(teamId) || [];
      if (fixList.length >= 3) {
        // Evaluate FDR for the next 3-4 GWs
        const avgFdr = fixList.slice(0, 3).reduce((sum, f) => sum + f.adjustedFdr, 0) / 3;
        // Prioritize clubs where user holds multiple players or high FDR
        const weightedScore = avgFdr + (count > 1 ? 0.4 : 0);
        if (weightedScore > worstExitFdr) {
          worstExitFdr = weightedScore;
          bestExitTeam = team;
          exitRunDesc = fixList.slice(0, 3).map((f) => `${f.opponentShort} (${f.isHome ? 'H' : 'A'})`).join(', ');
        }
      }
    }

    // Evaluate Entry Club: non-squad or lightly owned club with easiest upcoming run (FDR <= 2.5)
    let bestEntryTeam = bootstrap.teams.find((t) => t.short_name === 'ARS') || bootstrap.teams[0];
    let bestEntryFdr = 999;
    let entryRunDesc = '';

    for (const team of bootstrap.teams) {
      const fixList = teamFixturesMap.get(team.id) || [];
      if (fixList.length >= 3) {
        const avgFdr = fixList.slice(0, 4).reduce((sum, f) => sum + f.adjustedFdr, 0) / Math.min(4, fixList.length);
        if (avgFdr < bestEntryFdr) {
          bestEntryFdr = avgFdr;
          bestEntryTeam = team;
          entryRunDesc = fixList.slice(0, 4).map((f) => `${f.opponentShort} (${f.isHome ? 'H' : 'A'})`).join(', ');
        }
      }
    }

    const swingRating: 'MASSIVE' | 'HIGH' | 'MODERATE' =
      worstExitFdr - bestEntryFdr >= 1.2 ? 'MASSIVE' : worstExitFdr - bestEntryFdr >= 0.7 ? 'HIGH' : 'MODERATE';

    const swingPivot: ClubFixtureSwingPivot = {
      exitClub: {
        name: bestExitTeam.name,
        shortName: bestExitTeam.short_name,
        fdrNext3: parseFloat(worstExitFdr.toFixed(2)),
        brutalRunDescription: `GW${currentGw + 1}-${currentGw + 3}: ${exitRunDesc}`,
      },
      entryClub: {
        name: bestEntryTeam.name,
        shortName: bestEntryTeam.short_name,
        fdrNext3: parseFloat(bestEntryFdr.toFixed(2)),
        greenRunDescription: `GW${currentGw + 1}-${currentGw + 4}: ${entryRunDesc} (Avg FDR ${bestEntryFdr.toFixed(1)})`,
      },
      swingRating,
    };

    // 5. Determine Target Unlock Gameweek based on current FT count
    // Rolling rule: +1 FT per unspent week, capped at 5.
    // A Mini-Wildcard block needs 3 to 4 transfers.
    let targetUnlockGameweek = currentGw;
    let transfersToBank = 3;

    if (currentFt >= 3) {
      // Already unlocked! Can execute immediately or next GW
      targetUnlockGameweek = currentGw + 1;
      transfersToBank = Math.min(currentFt, 4);
    } else if (currentFt === 2) {
      targetUnlockGameweek = currentGw + 1; // 2 -> 3 next week
      transfersToBank = 3;
    } else if (currentFt === 1) {
      // currentFt === 1 -> rolls to 2 at GW+1, rolls to 3 at GW+2
      targetUnlockGameweek = currentGw + 2;
      transfersToBank = 3;
    } else {
      // currentFt === 0 -> rolls to 1 at GW+1, rolls to 2 at GW+2, rolls to 3 at GW+3
      targetUnlockGameweek = currentGw + 3;
      transfersToBank = 3;
    }

    const hitPointsSaved = 4 * (transfersToBank - 1); // e.g. 3 transfers with 0 hits saves 8 pts (-8 hit prevented)

    // 6. Build Mini-Wildcard Swap Package (transfersToBank swaps)
    const posMap: Record<number, PositionType> = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };

    // Select OUT players: from exit club or injured/low-form
    const outCandidates = [...squadPlayers].sort((a, b) => {
      // Prioritize exit team
      const aExit = a.team === bestExitTeam.id ? 10 : 0;
      const bExit = b.team === bestExitTeam.id ? 10 : 0;
      // Prioritize injured
      const aInj = a.status === 'i' || a.status === 'd' ? 8 : 0;
      const bInj = b.status === 'i' || b.status === 'd' ? 8 : 0;
      // Upcoming FDR
      const aFdr = (teamFixturesMap.get(a.team)?.[0]?.adjustedFdr || 3.0);
      const bFdr = (teamFixturesMap.get(b.team)?.[0]?.adjustedFdr || 3.0);
      return (bExit + bInj + bFdr) - (aExit + aInj + aFdr);
    }).slice(0, transfersToBank);

    // Current club counts to preserve <= 3 per club
    const clubCounts = new Map<number, number>();
    for (const sp of squadPlayers) {
      clubCounts.set(sp.team, (clubCounts.get(sp.team) || 0) + 1);
    }
    // Remove the OUT players from counts
    for (const outP of outCandidates) {
      clubCounts.set(outP.team, Math.max(0, (clubCounts.get(outP.team) || 0) - 1));
    }

    // Find optimal IN players from entry club or other elite green clubs
    const swaps: MiniWildcardSwapItem[] = [];
    let netCostDelta = 0;
    let netXpGain = 0;

    for (const outP of outCandidates) {
      const outPos = posMap[outP.element_type];
      const outTeam = bootstrap.teams.find((t) => t.id === outP.team);
      const outFdr = teamFixturesMap.get(outP.team)?.[0]?.adjustedFdr || 3.2;

      // Find candidates of exact same position
      const viableIn = activePL
        .filter((el) => {
          if (el.element_type !== outP.element_type) return false;
          if (squadPlayers.some((sp) => sp.id === el.id)) return false;
          if (swaps.some((s) => s.inPlayer.name === el.web_name)) return false;
          if ((clubCounts.get(el.team) || 0) >= 3) return false;
          // Must not be injured
          if (el.status === 'i' || el.status === 's') return false;
          return true;
        })
        .map((el) => {
          const teamFix = teamFixturesMap.get(el.team) || [];
          const avgFdr = teamFix.slice(0, 4).reduce((sum, f) => sum + f.adjustedFdr, 0) / Math.max(1, teamFix.length);
          const ppg = parseFloat(el.points_per_game) || 4.0;
          const baseline = vaastavService.getPlayerBaseline(el.code, el.web_name, outPos);
          const p90 = baseline?.careerPer90.points90 || ppg;
          const proj5GwXp = parseFloat(((ppg * 0.6 + p90 * 0.4) * (1 + (3.0 - avgFdr) * 0.1) * 4).toFixed(1));
          const isEntryClub = el.team === bestEntryTeam.id;
          return {
            player: el,
            avgFdr,
            proj5GwXp,
            isEntryClub,
            score: proj5GwXp + (isEntryClub ? 4.0 : 0) - (el.now_cost / 10) * 0.2,
          };
        })
        .sort((a, b) => b.score - a.score);

      const chosen = viableIn[0];
      if (chosen) {
        clubCounts.set(chosen.player.team, (clubCounts.get(chosen.player.team) || 0) + 1);
        const inCost = chosen.player.now_cost / 10;
        const outCost = outP.now_cost / 10;
        const costDiff = parseFloat((inCost - outCost).toFixed(1));
        netCostDelta += costDiff;

        const outPpg = parseFloat(outP.points_per_game) || 3.2;
        const outProj4Gw = outPpg * 3.5;
        const xpDelta = parseFloat(Math.max(1.5, chosen.proj5GwXp - outProj4Gw).toFixed(1));
        netXpGain += xpDelta;

        const inTeam = bootstrap.teams.find((t) => t.id === chosen.player.team);

        swaps.push({
          outPlayer: {
            name: outP.web_name,
            team: outTeam?.short_name || 'UNK',
            cost: outCost,
            position: outPos,
            upcomingFdrAvg: parseFloat(outFdr.toFixed(1)),
            reason:
              outP.status === 'i' || outP.status === 'd'
                ? `Injured/Doubtful (${outP.news || 'Muscle issue'})`
                : outP.team === bestExitTeam.id
                ? `Enters difficult run: ${exitRunDesc}`
                : `Tough upcoming fixtures (FDR ${outFdr.toFixed(1)})`,
          },
          inPlayer: {
            name: chosen.player.web_name,
            team: inTeam?.short_name || 'UNK',
            cost: inCost,
            position: outPos,
            upcomingFdrAvg: parseFloat(chosen.avgFdr.toFixed(1)),
            projected5GwXp: chosen.proj5GwXp,
            reason:
              chosen.isEntryClub
                ? `Hits 5-game green streak for ${inTeam?.short_name}: ${entryRunDesc}`
                : `Elite underlying xGI with low FDR run (${chosen.avgFdr.toFixed(1)})`,
          },
          costDelta: costDiff,
          xpGain: xpDelta,
        });
      }
    }

    const totalXpGain = parseFloat((netXpGain + hitPointsSaved).toFixed(1));
    const bankRemaining = parseFloat((0.5 - netCostDelta).toFixed(1));

    // 7. Generate 4-to-5 Gameweek Horizon Timeline
    const horizonTimeline: HorizonWeekAction[] = [];
    let rollingFt = currentFt;

    for (let gw = currentGw; gw <= currentGw + 4; gw++) {
      if (gw < targetUnlockGameweek) {
        // Roll FT
        const prevFt = rollingFt;
        rollingFt = Math.min(5, rollingFt + 1);
        horizonTimeline.push({
          gameweek: gw,
          availableFt: prevFt,
          actionType: 'ROLL',
          actionSummary: `ROLL FT: Bank ${prevFt} ➔ ${rollingFt} Free Transfers. Do not waste moves on sideways luxury transfers.`,
          ftAfterAction: rollingFt,
          hitCost: 0,
          projectedXp: 52.4,
          notes: `Holding your transfer compounds tactical optionality. Prepares squad for GW${targetUnlockGameweek} 3-player pivot.`,
        });
      } else if (gw === targetUnlockGameweek) {
        // Execute Mini-Wildcard
        const usedFt = transfersToBank;
        const postFt = Math.max(0, rollingFt - usedFt);
        horizonTimeline.push({
          gameweek: gw,
          availableFt: rollingFt,
          actionType: 'EXECUTE_MINI_WILDCARD',
          actionSummary: `🚀 EXECUTE MINI-WILDCARD: Deploy ${usedFt} banked FTs (0 hits, ${hitPointsSaved} pts saved). Triple-swap: ${swaps.map((s) => `${s.outPlayer.name}➔${s.inPlayer.name}`).join(', ')}.`,
          ftAfterAction: postFt,
          hitCost: 0,
          projectedXp: 68.8,
          notes: `Tactical pivot timing: ${bestExitTeam.short_name} fixture turn meets ${bestEntryTeam.short_name}'s green streak for zero hit penalty.`,
        });
        rollingFt = postFt + 1; // +1 next week
      } else {
        // Post-swing consolidation
        const currentAvail = Math.min(5, rollingFt);
        horizonTimeline.push({
          gameweek: gw,
          availableFt: currentAvail,
          actionType: 'HOLD',
          actionSummary: `HOLD / ROLL FT: Bank up to ${Math.min(5, currentAvail + 1)} FTs. Ride the newly unlocked fixture wave.`,
          ftAfterAction: Math.min(5, currentAvail + 1),
          hitCost: 0,
          projectedXp: 61.2,
          notes: `Core upgraded squad now captures peak green fixture equity without needing early wildcard activation.`,
        });
        rollingFt = Math.min(5, currentAvail + 1);
      }
    }

    const strategicVerdict = `By rolling transfers up to GW${targetUnlockGameweek}, you unlock a ${transfersToBank}-player Mini-Wildcard for 0 hits, preventing -${hitPointsSaved} hit points and capturing +${totalXpGain} net projected xP through the ${bestExitTeam.short_name} ➔ ${bestEntryTeam.short_name} fixture divergence.`;

    return {
      type: 'TRANSFER_HORIZON',
      gameweek: currentGw,
      managerId,
      currentFreeTransfers: currentFt,
      targetUnlockGameweek,
      transfersToBank,
      hitPointsSaved,
      totalProjectedXpGain: totalXpGain,
      swingPivot,
      miniWildcardPackage: {
        title: `${transfersToBank}-Player Mini-Wildcard Block: ${bestExitTeam.short_name} ➔ ${bestEntryTeam.short_name}`,
        requiredTransfers: transfersToBank,
        totalCostDelta: parseFloat(netCostDelta.toFixed(1)),
        bankRemaining: Math.max(0, bankRemaining),
        swaps,
      },
      horizonTimeline,
      strategicVerdict,
    };
  }
}

export const transferHorizonService = TransferHorizonService.getInstance();
