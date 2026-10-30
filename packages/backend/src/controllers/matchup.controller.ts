import { Request, Response } from 'express';
import { ToolsExecutor } from '../ai/tools.js';
import { fplService } from '../services/fpl-live.service.js';

export async function evaluateMatchup(req: Request, res: Response): Promise<void> {
  try {
    const teamA = (req.query.teamA as string) || 'Arsenal';
    const teamB = (req.query.teamB as string) || 'Chelsea';
    const card = await ToolsExecutor.executeEvaluateClubMatchup(teamA, teamB);
    res.json(card);
  } catch (err) {
    console.error('Error evaluating matchup:', err);
    res.status(500).json({ error: 'Failed to evaluate matchup' });
  }
}

export async function getFdrMatrix(req: Request, res: Response): Promise<void> {
  try {
    const teamId = parseInt(req.params.teamId, 10) || 1;
    const fdr = await fplService.getRolling5GwFdr(teamId);
    res.json(fdr);
  } catch (err) {
    console.error('Error fetching FDR matrix:', err);
    res.status(500).json({ error: 'Failed to fetch FDR matrix' });
  }
}

export async function getFdrLeaderboard(req: Request, res: Response): Promise<void> {
  try {
    const bootstrap = await fplService.getBootstrapStatic();
    const activePL = await fplService.getActivePremierLeaguePlayers();

    const isFit = (p: any) =>
      p.status === 'a' &&
      (p.chance_of_playing_next_round === null || p.chance_of_playing_next_round >= 75);

    const teamsAnalysis = [];

    for (const t of bootstrap.teams) {
      const fdr5 = await fplService.getRolling5GwFdr(t.id);
      const avg5 = fdr5.reduce((s, f) => s + f.adjustedFdr, 0) / Math.max(1, fdr5.length);
      const next3 = fdr5.slice(0, 3);
      const avg3 = next3.reduce((s, f) => s + f.adjustedFdr, 0) / Math.max(1, next3.length);

      const teamPlayers = activePL.filter((p) => p.team === t.id && isFit(p));

      // Key Attacker
      const attackers = teamPlayers
        .filter((p) => p.element_type === 3 || p.element_type === 4)
        .sort((a, b) => {
          const formA = parseFloat(a.form || '0');
          const formB = parseFloat(b.form || '0');
          const ppgA = parseFloat(a.points_per_game || '0');
          const ppgB = parseFloat(b.points_per_game || '0');
          return (formB * 0.5 + ppgB * 0.3 + (b.total_points / 10) * 0.2) - (formA * 0.5 + ppgA * 0.3 + (a.total_points / 10) * 0.2);
        });

      // Best Defender / GKP
      const defenders = teamPlayers
        .filter((p) => p.element_type === 1 || p.element_type === 2)
        .sort((a, b) => {
          const formA = parseFloat(a.form || '0');
          const formB = parseFloat(b.form || '0');
          return (formB * 0.6 + (b.total_points / 10) * 0.4) - (formA * 0.6 + (a.total_points / 10) * 0.4);
        });

      const keyAttacker = attackers[0];
      const secondaryAttacker = attackers[1];
      const bestDefender = defenders[0];

      teamsAnalysis.push({
        id: t.id,
        name: t.name,
        shortName: t.short_name,
        avg5Fdr: parseFloat(avg5.toFixed(2)),
        avg3Fdr: parseFloat(avg3.toFixed(2)),
        fixtures: fdr5.map((f) => ({
          gw: f.gw,
          opp: f.opponentShort,
          isHome: f.isHome,
          desc: f.isHome ? `${f.opponentShort} (H)` : `${f.opponentShort} (A)`,
          rawFdr: f.fplFdr,
          adjFdr: f.adjustedFdr,
        })),
        keyAttacker: keyAttacker
          ? {
              name: keyAttacker.web_name,
              pos: keyAttacker.element_type === 4 ? 'FWD' : 'MID',
              cost: keyAttacker.now_cost / 10,
              form: parseFloat(keyAttacker.form || '0'),
              totalPoints: keyAttacker.total_points,
            }
          : null,
        secondaryAttacker: secondaryAttacker
          ? {
              name: secondaryAttacker.web_name,
              pos: secondaryAttacker.element_type === 4 ? 'FWD' : 'MID',
              cost: secondaryAttacker.now_cost / 10,
              form: parseFloat(secondaryAttacker.form || '0'),
              totalPoints: secondaryAttacker.total_points,
            }
          : null,
        bestDefender: bestDefender
          ? {
              name: bestDefender.web_name,
              pos: bestDefender.element_type === 1 ? 'GKP' : 'DEF',
              cost: bestDefender.now_cost / 10,
              form: parseFloat(bestDefender.form || '0'),
              totalPoints: bestDefender.total_points,
            }
          : null,
      });
    }

    teamsAnalysis.sort((a, b) => a.avg5Fdr - b.avg5Fdr);
    res.json(teamsAnalysis);
  } catch (err) {
    console.error('Error calculating FDR leaderboard:', err);
    res.status(500).json({ error: 'Failed to calculate FDR leaderboard' });
  }
}

export async function comparePlayers(req: Request, res: Response): Promise<void> {
  try {
    const query = req.query.players as string;
    const playerNames = query ? query.split(',').map((p) => p.trim()) : ['Haaland', 'Salah'];
    const card = await ToolsExecutor.executeGetPlayerComparison(playerNames);
    res.json(card);
  } catch (err) {
    console.error('Error comparing players:', err);
    res.status(500).json({ error: 'Failed to compare players' });
  }
}

export async function getBogeyMatrix(req: Request, res: Response): Promise<void> {
  try {
    const gw = req.query.gw ? parseInt(req.query.gw as string, 10) : undefined;
    const card = await ToolsExecutor.executeGetBogeyGroundMatrix(gw);
    res.json(card);
  } catch (err) {
    console.error('Error fetching Bogey Ground Matrix:', err);
    res.status(500).json({ error: 'Failed to fetch Bogey Ground Matrix' });
  }
}
