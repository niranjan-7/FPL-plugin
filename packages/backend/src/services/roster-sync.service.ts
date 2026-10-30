import type { FplPlayer, FplTeam } from '@fpl-companion/shared';
import { fplService } from './fpl-live.service.js';
import { cacheService } from './cache.service.js';

export interface RegisteredPlayerProfile {
  id: number;
  code: number;
  name: string;
  fullName: string;
  teamId: number;
  teamName: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  nowCost: number;
  status: string; // 'a' | 'd' | 'i' | 's' | 'u'
  chanceOfPlaying: number | null;
  news: string;
  newsAdded: string | null;
  isAvailable: boolean;
  totalPoints: number;
  form: number;
}

export interface ClubRosterSummary {
  teamId: number;
  teamName: string;
  shortName: string;
  squadCount: number;
  fitCount: number;
  injuredCount: number;
  players: RegisteredPlayerProfile[];
}

export class RosterSyncService {
  private static instance: RosterSyncService;
  private lastSyncTimestamp: number = 0;
  private syncIntervalMs: number = 10 * 60 * 1000; // 10 minutes automatic refresh

  public static getInstance(): RosterSyncService {
    if (!RosterSyncService.instance) {
      RosterSyncService.instance = new RosterSyncService();
    }
    return RosterSyncService.instance;
  }

  constructor() {
    this.initSync().catch((err) => console.warn('[RosterSyncService] Initial sync warning:', err));
  }

  /**
   * Initializes and warms registered club rosters & availability monitoring
   */
  public async initSync(): Promise<void> {
    const now = Date.now();
    if (now - this.lastSyncTimestamp < 60000) return; // Debounce 1 min

    try {
      const bootstrap = await fplService.getBootstrapStatic();
      const activePL = await fplService.getActivePremierLeaguePlayers();

      const posMap: Record<number, 'GK' | 'DEF' | 'MID' | 'FWD'> = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };

      const teamMap = new Map<number, FplTeam>();
      for (const t of bootstrap.teams) {
        teamMap.set(t.id, t);
      }

      // Group players by club
      const clubRosters = new Map<number, ClubRosterSummary>();
      for (const t of bootstrap.teams) {
        clubRosters.set(t.id, {
          teamId: t.id,
          teamName: t.name,
          shortName: t.short_name,
          squadCount: 0,
          fitCount: 0,
          injuredCount: 0,
          players: [],
        });
      }

      for (const p of activePL) {
        const team = teamMap.get(p.team);
        if (!team) continue;

        const isAvailable =
          p.status === 'a' &&
          (p.chance_of_playing_next_round === null || p.chance_of_playing_next_round >= 75);

        const profile: RegisteredPlayerProfile = {
          id: p.id,
          code: p.code,
          name: p.web_name,
          fullName: `${p.first_name} ${p.second_name}`.trim(),
          teamId: p.team,
          teamName: team.name,
          position: posMap[p.element_type] || 'MID',
          nowCost: p.now_cost / 10,
          status: p.status,
          chanceOfPlaying: p.chance_of_playing_next_round,
          news: p.news || '',
          newsAdded: (p as any).news_added || null,
          isAvailable,
          totalPoints: p.total_points,
          form: parseFloat(p.form || '0'),
        };

        const roster = clubRosters.get(p.team);
        if (roster) {
          roster.players.push(profile);
          roster.squadCount++;
          if (isAvailable) roster.fitCount++;
          else roster.injuredCount++;
        }
      }

      // Cache all rosters
      cacheService.set('all_pl_rosters', Array.from(clubRosters.values()), 3600000);
      this.lastSyncTimestamp = now;
      console.log(`[RosterSyncService] Successfully synchronized registered rosters across ${bootstrap.teams.length} PL clubs (${activePL.length} players).`);
    } catch (err) {
      console.error('[RosterSyncService] Error during roster sync:', err);
    }
  }

  /**
   * Returns all 20 official Premier League clubs
   */
  public async getPremierLeagueClubs(): Promise<Array<{ id: number; name: string; short_name: string; strength: number }>> {
    const bootstrap = await fplService.getBootstrapStatic();
    return bootstrap.teams.map((t) => ({
      id: t.id,
      name: t.name,
      short_name: t.short_name,
      strength: t.strength,
    })).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Returns registered squad and live availability for a given club
   */
  public async getClubRoster(teamId: number): Promise<ClubRosterSummary | null> {
    await this.ensureFresh();
    const rosters = cacheService.get<ClubRosterSummary[]>('all_pl_rosters');
    if (!rosters) return null;
    return rosters.find((r) => r.teamId === teamId) || null;
  }

  /**
   * Returns all injured, doubtful, and suspended players across the Premier League
   */
  public async getInjuredPlayers(): Promise<RegisteredPlayerProfile[]> {
    await this.ensureFresh();
    const rosters = cacheService.get<ClubRosterSummary[]>('all_pl_rosters');
    if (!rosters) return [];
    const injured: RegisteredPlayerProfile[] = [];
    for (const r of rosters) {
      for (const p of r.players) {
        if (!p.isAvailable) {
          injured.push(p);
        }
      }
    }
    return injured.sort((a, b) => b.totalPoints - a.totalPoints);
  }

  private async ensureFresh(): Promise<void> {
    const now = Date.now();
    if (now - this.lastSyncTimestamp > this.syncIntervalMs) {
      await this.initSync();
    }
  }
}

export const rosterSyncService = RosterSyncService.getInstance();
