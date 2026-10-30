import { Request, Response } from 'express';
import type { AiBadgePayload } from '@fpl-companion/shared';
import { fplService } from '../services/fpl-live.service.js';
import { vaastavService } from '../services/vaastav-historical.service.js';
import { codeBridge } from '../services/code-bridge.service.js';
import { bogeyMatrixService } from '../services/bogey-matrix.service.js';

export async function getAiBadges(req: Request, res: Response): Promise<void> {
  try {
    const rawIds = (req.query.elementIds as string) || '';
    const elementIds = rawIds
      ? rawIds.split(',').map((id) => parseInt(id.trim(), 10)).filter((id) => !isNaN(id))
      : [351, 328, 18, 182, 45, 98, 325, 11, 9, 432, 75];

    const bootstrap = await fplService.getBootstrapStatic();
    const badges: AiBadgePayload[] = [];

    for (const id of elementIds) {
      const player = bootstrap.elements.find((el) => el.id === id);
      if (!player) continue;

      const fdr = await fplService.getRolling5GwFdr(player.team);
      const nextFdr = fdr[0] || { fplFdr: 3, adjustedFdr: 3, isHome: true, opponentShort: 'OPP' };
      const xp = fplService.calculateBayesianProjectedXp(player, nextFdr);

      const baseline = vaastavService.getPlayerBaseline(player.code);
      const histXgi90 = baseline?.careerPer90.xGI90 || 0.5;
      const liveXgi90 = parseFloat(player.expected_goal_involvements) / Math.max(1, player.minutes / 90);

      // YoY delta in xGI per 90
      const deltaPct = histXgi90 > 0 ? Math.round(((liveXgi90 - histXgi90) / histXgi90) * 100) : 0;

      const regression = vaastavService.calculateRegression(
        player.code,
        player.goals_scored,
        parseFloat(player.expected_goals) || 0,
        player.minutes,
        player.web_name
      );

      let regressionFlag: AiBadgePayload['regressionFlag'] = 'STABLE';
      if (regression.regressionStatus === 'UNSUSTAINABLE_HOT_STREAK') regressionFlag = 'HOT';
      if (regression.regressionStatus === 'UNLUCKY_DUE_POSITIVE_REBOUND') regressionFlag = 'COLD';

      const playerTeamShort = codeBridge.getTeamShortName(player.team);
      const fixtureModifier = bogeyMatrixService.getFixtureModifierForPlayer(
        playerTeamShort,
        nextFdr.opponentShort || 'OPP',
        nextFdr.isHome
      );

      badges.push({
        elementId: player.id,
        playerCode: player.code,
        webName: player.web_name,
        projectedXp: xp,
        yoyDeltaPct: deltaPct,
        clubMatchupRating: parseFloat(nextFdr.adjustedFdr.toFixed(1)),
        regressionFlag,
        fixtureModifier,
      });
    }

    res.json(badges);
  } catch (err) {
    console.error('Error generating AI badges:', err);
    res.status(500).json({ error: 'Failed to generate AI badges' });
  }
}
