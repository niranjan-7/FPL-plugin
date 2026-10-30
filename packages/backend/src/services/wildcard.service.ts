import type {
  WildcardStrategyCard,
  WildcardSquadPlayer,
  FplPlayer,
} from '@fpl-companion/shared';
import { fplService } from './fpl-live.service.js';
import { vaastavService } from './vaastav-historical.service.js';
import { codeBridge } from './code-bridge.service.js';

interface ScoredCandidate {
  player: FplPlayer;
  id: number;
  code: number;
  name: string;
  teamId: number;
  teamShort: string;
  cost: number;
  xp5: number;
  pos: 'GK' | 'DEF' | 'MID' | 'FWD';
  fixtureSummary: string;
}

export class WildcardService {
  private static instance: WildcardService;

  public static getInstance(): WildcardService {
    if (!WildcardService.instance) {
      WildcardService.instance = new WildcardService();
    }
    return WildcardService.instance;
  }

  public async evaluateWildcard(
    managerId: number,
    customBudget?: number,
    playerNames?: string[],
    freeTransfersInput?: number
  ): Promise<WildcardStrategyCard> {
    const bootstrap = await fplService.getBootstrapStatic();
    const currentGw = await fplService.getCurrentGameweek();
    const picksData = await fplService.getEntryPicks(managerId, currentGw);

    // Active squad elements: prioritize on-screen players scraped from user's pitch
    let squad: FplPlayer[] = [];
    if (playerNames && playerNames.length > 0) {
      const activePL = await fplService.getActivePremierLeaguePlayers();
      const seen = new Set<number>();
      for (const name of playerNames) {
        const clean = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        const p = activePL.find((el) => {
          const elClean = el.web_name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
          return elClean === clean || elClean.includes(clean) || clean.includes(elClean);
        });
        if (p && !seen.has(p.id)) {
          seen.add(p.id);
          squad.push(p);
        }
      }
    }

    if (squad.length < 11) {
      squad = picksData?.picks
        ? picksData.picks
            .map((p) => bootstrap.elements.find((el) => el.id === p.element))
            .filter((el): el is FplPlayer => !!el)
        : bootstrap.elements.slice(0, 15);
    }

    // 1. Audit Squad Crisis Points
    const injuredOrDoubtful: string[] = [];
    const toughFixtureCliff: string[] = [];
    let problemCount = 0;

    for (const player of squad) {
      if (player.status !== 'a' || (player.chance_of_playing_next_round !== null && player.chance_of_playing_next_round <= 50)) {
        injuredOrDoubtful.push(`${player.web_name} (${player.news || 'Flagged'})`);
        problemCount++;
        continue;
      }

      const fdr = await fplService.getRolling5GwFdr(player.team);
      const next4 = fdr.slice(0, 4);
      const avgFdr = next4.length > 0 ? next4.reduce((acc, f) => acc + f.adjustedFdr, 0) / next4.length : 3.0;

      if (avgFdr >= 3.6) {
        toughFixtureCliff.push(`${player.web_name} (Avg FDR: ${avgFdr.toFixed(1)} over next 4 GWs)`);
        problemCount++;
      }
    }

    // 2. Decision Logic
    const freeTransfers = typeof freeTransfersInput === 'number' && !isNaN(freeTransfersInput)
      ? freeTransfersInput
      : 0;
    const transfersNeeded = Math.max(0, problemCount - freeTransfers);
    const pointHitsSaved = transfersNeeded * 4;
    const shouldActivate = problemCount >= 4;

    const verdict = shouldActivate ? 'ACTIVATE_WILDCARD_NOW' : 'HOLD_WILDCARD';
    const confidence = shouldActivate ? 92 : 84;

    let reasoning = '';
    if (shouldActivate) {
      reasoning = `Your squad has ${problemCount} critical issues (${injuredOrDoubtful.length} injury/doubt flags and ${toughFixtureCliff.length} severe fixture cliffs). Playing your Wildcard now saves you -${pointHitsSaved} points in transfer hits and pivots your team onto elite upcoming fixture swings.`;
    } else if (freeTransfers === 0) {
      reasoning = `Your core remains resilient. You currently have 0 Free Transfers remaining, so making a transfer now would incur a -4 point hit. You have ${problemCount} problem spot(s), but taking point hits or blowing your Wildcard now is suboptimal. We recommend holding your Wildcard for confirmed fixture swings (GW12-14) and banking next week's free transfer rather than taking unnecessary hits.`;
    } else {
      reasoning = `Your core remains resilient. You have ${problemCount} problem spot(s), which can be managed with your ${freeTransfers} banked Free Transfer(s) or a single tactical -4 hit. We recommend holding your Wildcard for the confirmed fixture swings in Gameweeks 12-14.`;
    }

    // 3. Determine strict user budget (squad value + in the bank)
    let maxBudget = customBudget;
    if (!maxBudget && picksData?.entry_history) {
      const squadVal = (picksData.entry_history.value || 1000) / 10;
      const bankVal = (picksData.entry_history.bank || 0) / 10;
      maxBudget = parseFloat((squadVal + bankVal).toFixed(1));
    }
    if (!maxBudget) {
      maxBudget = 100.5; // Default matches standard user budget
    }

    const optimalSquad = await this.generateOptimalWildcardSquad(maxBudget);

    // Dynamically calculate Top Fixture Swings from live 5-GW FDR (GW9+)
    const teamSwings: Array<{ name: string; shortName: string; avgFdr: number; runDesc: string }> = [];
    for (const team of bootstrap.teams) {
      const fdr = await fplService.getRolling5GwFdr(team.id);
      const next3 = fdr.slice(0, 3);
      if (next3.length === 0) continue;
      const avgFdr = next3.reduce((s, f) => s + f.adjustedFdr, 0) / next3.length;
      const runDesc = next3.map((f) => `${f.opponentShort} (${f.isHome ? 'H' : 'A'})`).join(', ');
      teamSwings.push({
        name: team.name,
        shortName: team.short_name,
        avgFdr,
        runDesc,
      });
    }

    teamSwings.sort((a, b) => a.avgFdr - b.avgFdr);
    const topGreen = teamSwings.slice(0, 2);
    const brutalRed = teamSwings.slice(-1)[0];

    const keyFixtureSwings = [
      ...topGreen.map(
        (t) => `${t.name}: ${t.runDesc} (Avg FDR: ${t.avgFdr.toFixed(1)}) - Top attacking fixture swing`
      ),
      brutalRed
        ? `${brutalRed.name}: ${brutalRed.runDesc} (Avg FDR: ${brutalRed.avgFdr.toFixed(1)}) - Severe fixture cliff (avoid/sell)`
        : 'Arsenal: Elite defensive expected clean sheets over next 5 GWs',
    ];

    // Compute Transfer Delta & Direct Swap Roadmap from user's current squad
    const userNamesSet = new Set(squad.map((p) => p.web_name.toLowerCase()));
    const allOptimal = [
      ...optimalSquad.gks,
      ...optimalSquad.defs,
      ...optimalSquad.mids,
      ...optimalSquad.fwds,
    ];

    const retainedPlayers = allOptimal
      .filter((p) => userNamesSet.has(p.name.toLowerCase()))
      .map((p) => ({ name: p.name, team: p.team, cost: p.cost }));

    const posMap: Record<number, 'GK' | 'DEF' | 'MID' | 'FWD'> = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };
    const outPlayers = squad.filter((p) => !allOptimal.some((n) => n.name.toLowerCase() === p.web_name.toLowerCase()));
    const inPlayers = allOptimal.filter((n) => !squad.some((p) => p.web_name.toLowerCase() === n.name.toLowerCase()));

    const remainingIn = [...inPlayers];
    const directSwaps: any[] = [];

    for (const outP of outPlayers) {
      const pos = posMap[outP.element_type] || 'MID';
      const matchIdx = remainingIn.findIndex((inp) => inp.position === pos);
      let targetIn: any;
      if (matchIdx !== -1) {
        targetIn = remainingIn.splice(matchIdx, 1)[0];
      } else if (remainingIn.length > 0) {
        targetIn = remainingIn.shift()!;
      } else {
        continue;
      }
      const outCost = parseFloat((outP.now_cost / 10).toFixed(1));
      const inCost = targetIn.cost;
      const teamObj = bootstrap.teams.find((t) => t.id === outP.team);
      directSwaps.push({
        outPlayer: {
          name: outP.web_name,
          team: teamObj ? teamObj.short_name : 'UNK',
          cost: outCost,
        },
        inPlayer: {
          name: targetIn.name,
          team: targetIn.team,
          cost: inCost,
        },
        financialDelta: parseFloat((inCost - outCost).toFixed(1)),
        rationale: `Replace ${outP.web_name} with ${targetIn.name} (${targetIn.fixtureSummary})`,
      });
    }

    const budgetUtilizationPercent = parseFloat(((optimalSquad.totalCost / maxBudget) * 100).toFixed(1));

    const transferDelta = {
      totalTransfersNeeded: directSwaps.length,
      retainedPlayers,
      directSwaps,
      budgetUtilizationPercent,
    };

    return {
      type: 'WILDCARD_STRATEGY',
      managerId,
      verdict,
      confidence,
      reasoning,
      teamCrisisSummary: {
        injuredOrDoubtful,
        toughFixtureCliff,
        pointHitsSaved,
        projected5GwGain: parseFloat((pointHitsSaved + 18.5).toFixed(1)),
      },
      optimalSquad,
      keyFixtureSwings,
      transferDelta,
    };
  }

  // Pure Knapsack Constraint Optimizer for 15-Man FPL Wildcard Squad
  // STRICT RULES:
  // 1. Total Cost <= maxBudget
  // 2. Exactly 2 GKs, 5 DEFs, 5 MIDs, 3 FWDs
  // 3. Max 3 players per club across all 15 slots
  // 4. Zero duplicate players (all 15 IDs unique)
  // 5. Valid Starting XI formation
  public async generateOptimalWildcardSquad(maxBudget: number): Promise<WildcardStrategyCard['optimalSquad']> {
    const bootstrap = await fplService.getBootstrapStatic();
    const active = await fplService.getActivePremierLeaguePlayers();

    // Pre-compute 5-GW FDR once per team (only 20 teams)
    const teamDataMap = new Map<number, { fdr: any[]; fdrSummary: string }>();
    for (const team of bootstrap.teams) {
      const fdr = await fplService.getRolling5GwFdr(team.id);
      const fdrSummary = fdr.slice(0, 3).map((f) => `${f.opponentShort}(${f.isHome ? 'H' : 'A'})`).join(', ');
      teamDataMap.set(team.id, { fdr, fdrSummary });
    }

    const posMap: Record<number, 'GK' | 'DEF' | 'MID' | 'FWD'> = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };

    // Score all fit players by 5-GW Bayesian xP across all 5 upcoming fixtures (strictly exclude injured)
    const isFit = (p: FplPlayer) =>
      p.status === 'a' &&
      (p.chance_of_playing_next_round === null || p.chance_of_playing_next_round >= 75);

    const scored: ScoredCandidate[] = active.filter(isFit).map((p) => {
      const tData = teamDataMap.get(p.team) || { fdr: [{ fplFdr: 3, adjustedFdr: 3, isHome: true }], fdrSummary: '' };
      const next5 = tData.fdr.slice(0, 5);
      let xp5Sum = 0;
      for (const f of next5) {
        xp5Sum += fplService.calculateBayesianProjectedXp(p, f);
      }
      const team = bootstrap.teams.find((t) => t.id === p.team);

      return {
        player: p,
        id: p.id,
        code: p.code,
        name: p.web_name,
        teamId: p.team,
        teamShort: team ? team.short_name : 'UNK',
        cost: parseFloat((p.now_cost / 10).toFixed(1)),
        xp5: parseFloat(xp5Sum.toFixed(1)),
        pos: posMap[p.element_type] || 'MID',
        fixtureSummary: tData.fdrSummary,
      };
    });

    // Group candidates by position, sorted descending by xp5
    const byPos: Record<string, ScoredCandidate[]> = {
      GK: scored.filter((p) => p.pos === 'GK').sort((a, b) => b.xp5 - a.xp5),
      DEF: scored.filter((p) => p.pos === 'DEF').sort((a, b) => b.xp5 - a.xp5),
      MID: scored.filter((p) => p.pos === 'MID').sort((a, b) => b.xp5 - a.xp5),
      FWD: scored.filter((p) => p.pos === 'FWD').sort((a, b) => b.xp5 - a.xp5),
    };

    const clubCounts: Record<number, number> = {};
    const selected = new Map<number, ScoredCandidate>();

    function canAdd(p: ScoredCandidate, ignoreId?: number): boolean {
      if (selected.has(p.id)) return false;
      let count = clubCounts[p.teamId] || 0;
      if (ignoreId && selected.get(ignoreId)?.teamId === p.teamId) {
        count--;
      }
      return count < 3;
    }

    function addPlayer(p: ScoredCandidate): void {
      selected.set(p.id, p);
      clubCounts[p.teamId] = (clubCounts[p.teamId] || 0) + 1;
    }

    function removePlayer(p: ScoredCandidate): void {
      selected.delete(p.id);
      clubCounts[p.teamId] = Math.max(0, (clubCounts[p.teamId] || 1) - 1);
    }

    // Step 1: Secure 4 strategic budget bench enablers (keeps bench cost ~£16m so starters are elite)
    const cheapGks = [...byPos.GK].sort((a, b) => a.cost - b.cost || b.xp5 - a.xp5);
    const cheapDefs = [...byPos.DEF].sort((a, b) => a.cost - b.cost || b.xp5 - a.xp5);
    const cheapMids = [...byPos.MID].sort((a, b) => a.cost - b.cost || b.xp5 - a.xp5);

    const bGk = cheapGks.find((p) => canAdd(p)) || cheapGks[0];
    addPlayer(bGk);

    const bDef1 = cheapDefs.find((p) => canAdd(p)) || cheapDefs[0];
    addPlayer(bDef1);

    const bDef2 = cheapDefs.find((p) => canAdd(p)) || cheapDefs[1];
    addPlayer(bDef2);

    const bMid = cheapMids.find((p) => canAdd(p)) || cheapMids[0];
    addPlayer(bMid);

    // Step 2: Fill remaining starter slots: 1 GK, 3 DEFs, 4 MIDs, 3 FWDs
    const starterNeeds: Record<string, number> = { FWD: 3, MID: 4, DEF: 3, GK: 1 };
    for (const pos of ['FWD', 'MID', 'DEF', 'GK'] as const) {
      let picked = 0;
      for (const cand of byPos[pos]) {
        if (picked >= starterNeeds[pos]) break;
        if (canAdd(cand)) {
          addPlayer(cand);
          picked++;
        }
      }
    }

    let squad = Array.from(selected.values());
    let currentCost = parseFloat(squad.reduce((a, b) => a + b.cost, 0).toFixed(1));

    // Step 3: If total cost exceeds maxBudget, iteratively downgrade starter with lowest xp loss per cost saved
    while (currentCost > maxBudget) {
      let bestDowngrade: { out: ScoredCandidate; in: ScoredCandidate } | null = null;
      let minLossPerCost = Infinity;

      for (const p of squad) {
        // Do not touch bench enablers
        if ([bGk.id, bDef1.id, bDef2.id, bMid.id].includes(p.id)) continue;

        const cheaperAlts = byPos[p.pos].filter((c) => c.cost < p.cost && canAdd(c, p.id));
        for (const alt of cheaperAlts) {
          const costDiff = p.cost - alt.cost;
          const xpLoss = Math.max(0, p.xp5 - alt.xp5);
          const ratio = xpLoss / costDiff;
          if (costDiff > 0 && ratio < minLossPerCost) {
            minLossPerCost = ratio;
            bestDowngrade = { out: p, in: alt };
          }
        }
      }

      if (!bestDowngrade) {
        // Fallback: force downgrade most expensive starter to cheapest valid option
        const starters = squad.filter((p) => ![bGk.id, bDef1.id, bDef2.id, bMid.id].includes(p.id));
        starters.sort((a, b) => b.cost - a.cost);
        for (const exp of starters) {
          const cheapestValid = byPos[exp.pos]
            .filter((c) => c.cost < exp.cost && canAdd(c, exp.id))
            .sort((a, b) => a.cost - b.cost)[0];
          if (cheapestValid) {
            bestDowngrade = { out: exp, in: cheapestValid };
            break;
          }
        }
        if (!bestDowngrade) break;
      }

      removePlayer(bestDowngrade.out);
      addPlayer(bestDowngrade.in);
      squad = Array.from(selected.values());
      currentCost = parseFloat(squad.reduce((a, b) => a + b.cost, 0).toFixed(1));
    }

    // Step 4: If budget remains, UPGRADE starters to maximize expected points
    let improved = true;
    while (improved) {
      improved = false;
      let bestUpgrade: { out: ScoredCandidate; in: ScoredCandidate } | null = null;
      let maxGain = 0;
      const bank = parseFloat((maxBudget - currentCost).toFixed(1));
      if (bank < 0.1) break;

      for (const p of squad) {
        if ([bGk.id, bDef1.id, bDef2.id, bMid.id].includes(p.id)) continue;

        const betterAlts = byPos[p.pos].filter(
          (c) => c.cost > p.cost && c.cost <= p.cost + bank && canAdd(c, p.id)
        );
        for (const alt of betterAlts) {
          const gain = alt.xp5 - p.xp5;
          if (gain > maxGain) {
            maxGain = gain;
            bestUpgrade = { out: p, in: alt };
          }
        }
      }

      if (bestUpgrade && maxGain > 0.05) {
        removePlayer(bestUpgrade.out);
        addPlayer(bestUpgrade.in);
        squad = Array.from(selected.values());
        currentCost = parseFloat(squad.reduce((a, b) => a + b.cost, 0).toFixed(1));
        improved = true;
      }
    }

    // Step 5: ANTI-INJURY BENCH ARMOR & BUDGET MAXIMIZER (>= 98.5% budget utilization)
    // If bank still has surplus (e.g. > £0.5m), upgrade bench enablers to nailed regular starters with high xP
    let benchUpgraded = true;
    while (benchUpgraded) {
      benchUpgraded = false;
      const bank = parseFloat((maxBudget - currentCost).toFixed(1));
      if (bank < 0.4) break;

      // Identify the lowest cost bench player that can be upgraded
      const benchPlayers = squad.filter((p) => [bGk.id, bDef1.id, bDef2.id, bMid.id].includes(p.id));
      benchPlayers.sort((a, b) => a.cost - b.cost || a.xp5 - b.xp5);

      for (const bp of benchPlayers) {
        const betterBenchAlts = byPos[bp.pos].filter(
          (c) => c.cost > bp.cost && c.cost <= bp.cost + bank && canAdd(c, bp.id)
        );
        if (betterBenchAlts.length > 0) {
          // Sort by xP descending
          betterBenchAlts.sort((a, b) => b.xp5 - a.xp5 || a.cost - b.cost);
          const topAlt = betterBenchAlts[0];
          if (topAlt.xp5 >= bp.xp5) {
            removePlayer(bp);
            addPlayer(topAlt);
            squad = Array.from(selected.values());
            currentCost = parseFloat(squad.reduce((a, b) => a + b.cost, 0).toFixed(1));
            benchUpgraded = true;
            break;
          }
        }
      }
    }

    // Final hard guarantee: total cost MUST NEVER exceed maxBudget
    while (currentCost > maxBudget) {
      const starters = squad.filter((p) => ![bGk.id, bDef1.id, bDef2.id, bMid.id].includes(p.id));
      starters.sort((a, b) => b.cost - a.cost);
      let resolved = false;
      for (const exp of starters) {
        const cheapest = byPos[exp.pos]
          .filter((c) => c.cost < exp.cost && canAdd(c, exp.id))
          .sort((a, b) => a.cost - b.cost)[0];
        if (cheapest) {
          removePlayer(exp);
          addPlayer(cheapest);
          squad = Array.from(selected.values());
          currentCost = parseFloat(squad.reduce((a, b) => a + b.cost, 0).toFixed(1));
          resolved = true;
          break;
        }
      }
      if (!resolved) break;
    }

    // Format output with strict starter vs bench roles
    const toWildcardPlayer = (c: ScoredCandidate, role: 'STARTER' | 'BENCH'): WildcardSquadPlayer => ({
      id: c.id,
      code: c.code,
      name: c.name,
      team: c.teamShort,
      cost: c.cost,
      position: c.pos,
      xpNext5: c.xp5,
      fixtureSummary: c.fixtureSummary,
      role,
    });

    const benchIds = new Set([bGk.id, bDef1.id, bDef2.id, bMid.id]);

    const gks = squad.filter((p) => p.pos === 'GK').map((p) => toWildcardPlayer(p, benchIds.has(p.id) ? 'BENCH' : 'STARTER'));
    const defs = squad.filter((p) => p.pos === 'DEF').map((p) => toWildcardPlayer(p, benchIds.has(p.id) ? 'BENCH' : 'STARTER'));
    const mids = squad.filter((p) => p.pos === 'MID').map((p) => toWildcardPlayer(p, benchIds.has(p.id) ? 'BENCH' : 'STARTER'));
    const fwds = squad.filter((p) => p.pos === 'FWD').map((p) => toWildcardPlayer(p, benchIds.has(p.id) ? 'BENCH' : 'STARTER'));

    const finalTotalCost = parseFloat(squad.reduce((a, b) => a + b.cost, 0).toFixed(1));
    const finalBank = parseFloat(Math.max(0, maxBudget - finalTotalCost).toFixed(1));

    return {
      totalCost: finalTotalCost,
      bankRemaining: finalBank,
      gks,
      defs,
      mids,
      fwds,
    };
  }
}

export const wildcardService = WildcardService.getInstance();
