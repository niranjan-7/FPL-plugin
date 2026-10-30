import { Request, Response } from 'express';
import { ToolsExecutor } from '../ai/tools.js';
import { expertIntelService } from '../services/expert-intel.service.js';
import { horizonPlannerService } from '../services/horizon-planner.service.js';
import { priceChangeService } from '../services/price-change.service.js';
import { cacheService } from '../services/cache.service.js';

const DEFAULT_USER_15_SQUAD = [
  'Raya',
  'Kinsky',
  'Truffert',
  'Mitchell',
  'Virgil',
  'Gvardiol',
  'Vuskovic',
  'Rogers',
  'Schade',
  'Yeremy',
  'B.Fernandes',
  'Mbeumo',
  'João Pedro',
  'Isak',
  'Gonzalo',
];

function resolveSquadPlayers(managerId: number, queryPlayers?: string): string[] {
  if (queryPlayers) {
    const list = queryPlayers.split(',').map((s) => s.trim()).filter(Boolean);
    if (list.length >= 5) {
      cacheService.set(`manager_pitch_squad_${managerId}`, list, 36000000);
      cacheService.set('last_known_manager_pitch_squad', list, 36000000);
      return list;
    }
  }
  const cached = cacheService.get<string[]>(`manager_pitch_squad_${managerId}`);
  if (cached && cached.length >= 5) {
    return cached;
  }
  const lastKnown = cacheService.get<string[]>('last_known_manager_pitch_squad');
  if (lastKnown && lastKnown.length >= 5) {
    return lastKnown;
  }
  return DEFAULT_USER_15_SQUAD;
}

function resolveFreeTransfers(managerId: number, queryFt?: string): number | undefined {
  if (queryFt !== undefined && queryFt !== '') {
    const parsed = parseInt(queryFt, 10);
    if (!isNaN(parsed)) {
      cacheService.set(`manager_pitch_ft_${managerId}`, parsed, 3600000);
      return parsed;
    }
  }
  const cached = cacheService.get<number>(`manager_pitch_ft_${managerId}`);
  if (cached !== undefined) {
    return cached;
  }
  return undefined;
}

export async function getClassicSquadAudit(req: Request, res: Response): Promise<void> {
  try {
    const managerId = parseInt(req.params.managerId, 10) || 481920;
    const playerNames = resolveSquadPlayers(managerId, req.query.players as string);
    const ft = resolveFreeTransfers(managerId, req.query.ft as string);
    const card = await ToolsExecutor.executeAnalyzeClassicSquad(managerId, playerNames, ft);
    res.json(card);
  } catch (err) {
    console.error('Error auditing classic squad:', err);
    res.status(500).json({ error: 'Failed to audit classic squad' });
  }
}

export async function getDraftWaiverAudit(req: Request, res: Response): Promise<void> {
  try {
    const leagueId = parseInt(req.params.leagueId, 10) || 10482;
    const position = req.query.position as string | undefined;
    const priority = req.query.priority ? parseInt(req.query.priority as string, 10) : undefined;
    const playerNames = resolveSquadPlayers(leagueId, req.query.players as string);
    const card = await ToolsExecutor.executeGetTopWaiverTargets(leagueId, position, playerNames, priority);
    res.json(card);
  } catch (err) {
    console.error('Error auditing draft waivers:', err);
    res.status(500).json({ error: 'Failed to audit draft waivers' });
  }
}

export async function getWildcardAudit(req: Request, res: Response): Promise<void> {
  try {
    const managerId = parseInt(req.params.managerId, 10) || 481920;
    const customBudget = req.query.budget ? parseFloat(req.query.budget as string) : undefined;
    const playerNames = resolveSquadPlayers(managerId, req.query.players as string);
    const ft = resolveFreeTransfers(managerId, req.query.ft as string);
    const card = await ToolsExecutor.executeEvaluateWildcard(managerId, customBudget, playerNames, ft);
    res.json(card);
  } catch (err) {
    console.error('Error evaluating wildcard:', err);
    res.status(500).json({ error: 'Failed to evaluate wildcard' });
  }
}

export async function getChipRoadmap(req: Request, res: Response): Promise<void> {
  try {
    const managerId = parseInt(req.params.managerId, 10) || 481920;
    const playerNames = resolveSquadPlayers(managerId, req.query.players as string);

    let onScreenChips: Record<string, 'AVAILABLE' | 'PLAYED'> | undefined;
    if (req.query.chips) {
      try {
        onScreenChips = JSON.parse(req.query.chips as string);
      } catch (e) {
        // ignore
      }
    }

    const card = await ToolsExecutor.executeGetChipRoadmap(managerId, onScreenChips, playerNames);
    res.json(card);
  } catch (err) {
    console.error('Error generating chip roadmap:', err);
    res.status(500).json({ error: 'Failed to generate chip roadmap' });
  }
}

export async function getExpertIntelAudit(req: Request, res: Response): Promise<void> {
  try {
    const playerNames = resolveSquadPlayers(481920, req.query.players as string);
    const card = await expertIntelService.getExpertIntel(playerNames);
    res.json(card);
  } catch (err) {
    console.error('Error fetching expert intel:', err);
    res.status(500).json({ error: 'Failed to fetch expert intel' });
  }
}

export async function getCaptaincyEvAudit(req: Request, res: Response): Promise<void> {
  try {
    const managerId = parseInt(req.params.managerId, 10) || 481920;
    const playerNames = resolveSquadPlayers(managerId, req.query.players as string);
    const card = await ToolsExecutor.executeGetCaptaincyEvMatrix(managerId, playerNames);
    res.json(card);
  } catch (err) {
    console.error('Error calculating captaincy EV matrix:', err);
    res.status(500).json({ error: 'Failed to calculate captaincy EV matrix' });
  }
}

export async function getTransferHorizonAudit(req: Request, res: Response): Promise<void> {
  try {
    const managerId = parseInt(req.params.managerId, 10) || 481920;
    const currentFt = resolveFreeTransfers(managerId, req.query.ft as string);
    const customBudget = req.query.budget ? parseFloat(req.query.budget as string) : undefined;
    const playerNames = resolveSquadPlayers(managerId, req.query.players as string);
    const card = await ToolsExecutor.executeGetTransferHorizonPlan(managerId, currentFt, customBudget, playerNames);
    res.json(card);
  } catch (err) {
    console.error('Error calculating transfer horizon plan:', err);
    res.status(500).json({ error: 'Failed to calculate transfer horizon plan' });
  }
}

export async function getHorizonPlanAudit(req: Request, res: Response): Promise<void> {
  try {
    const managerId = parseInt(req.params.managerId, 10) || 481920;
    const currentFt = resolveFreeTransfers(managerId, req.query.ft as string);
    const playerNames = resolveSquadPlayers(managerId, req.query.players as string);
    const planningMode = (req.query.mode as any) || 'AGGRESSIVE_VALUE';
    const card = await horizonPlannerService.generateHorizonPlan(managerId, playerNames, currentFt, planningMode);
    res.json(card);
  } catch (err) {
    console.error('Error calculating horizon plan:', err);
    res.status(500).json({ error: 'Failed to calculate horizon plan' });
  }
}

export async function getPriceChangeAudit(req: Request, res: Response): Promise<void> {
  try {
    const managerId = parseInt(req.params.managerId, 10) || 481920;
    const playerNames = resolveSquadPlayers(managerId, req.query.players as string);
    let scrapedSquad: any;
    let scrapedTargets: any;
    if (req.query.squadDetailed) {
      try {
        scrapedSquad = JSON.parse(req.query.squadDetailed as string);
      } catch (e) {}
    }
    if (req.query.targetsDetailed) {
      try {
        scrapedTargets = JSON.parse(req.query.targetsDetailed as string);
      } catch (e) {}
    }
    const card = await priceChangeService.evaluatePriceChanges(managerId, playerNames, scrapedSquad, scrapedTargets);
    res.json(card);
  } catch (err) {
    console.error('Error evaluating price changes:', err);
    res.status(500).json({ error: 'Failed to evaluate price changes' });
  }
}
