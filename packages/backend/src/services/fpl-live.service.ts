import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  FplBootstrapData,
  FplFixture,
  FplEntryPicksResponse,
  FplPlayer,
  FplDraftLeagueDetails,
} from '@fpl-companion/shared';
import { config } from '../config.js';
import { cacheService } from './cache.service.js';
import { codeBridge } from './code-bridge.service.js';
import { vaastavService } from './vaastav-historical.service.js';

export class FplDataService {
  private static instance: FplDataService;

  public static getInstance(): FplDataService {
    if (!FplDataService.instance) {
      FplDataService.instance = new FplDataService();
    }
    return FplDataService.instance;
  }

  // Determines whether a player is legitimately an active, playing Premier League asset
  // Filters out players transferred abroad, loaned out, retired, or unlisted
  public isValidActivePremierLeaguePlayer(player: FplPlayer): boolean {
    // 1. Must belong to a valid Premier League club (teams 1 through 20)
    if (!player.team || player.team < 1 || player.team > 20) {
      return false;
    }

    // 2. FPL explicitly marks departed/unregistered players with status 'u' (unavailable)
    if (player.status === 'u') {
      return false;
    }

    // 3. News string check: if player transferred out or loaned to another league
    if (player.news) {
      const lowerNews = player.news.toLowerCase();
      if (
        lowerNews.includes('transferred to') ||
        lowerNews.includes('loaned to') ||
        lowerNews.includes('contract terminated') ||
        lowerNews.includes('joined') ||
        lowerNews.includes('departed') ||
        lowerNews.includes('released by')
      ) {
        return false;
      }
    }

    return true;
  }

  public async getActivePremierLeaguePlayers(): Promise<FplPlayer[]> {
    const bootstrap = await this.getBootstrapStatic();
    return bootstrap.elements.filter((player) => this.isValidActivePremierLeaguePlayer(player));
  }

  public async getBootstrapStatic(): Promise<FplBootstrapData> {
    const cacheKey = 'fpl_bootstrap_static';
    const cached = cacheService.get<FplBootstrapData>(cacheKey);
    if (cached) return cached;

    try {
      const res = await fetch(`${config.fplBaseUrl}/bootstrap-static/`, {
        headers: { 'User-Agent': 'Mozilla/5.0 FPL-AI-Companion/1.0' },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch FPL bootstrap: ${res.statusText}`);
      }

      const rawData = (await res.json()) as FplBootstrapData;

      // Filter and lock active Premier League players
      const validElements = rawData.elements.filter((el) => this.isValidActivePremierLeaguePlayer(el));

      const data: FplBootstrapData = {
        elements: validElements,
        teams: rawData.teams,
        events: rawData.events,
      };

      // Persist locked active roster snapshot
      try {
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const lockPath = path.resolve(__dirname, '../../data/locked-active-roster.json');
        fs.writeFileSync(
          lockPath,
          JSON.stringify(
            {
              lockedAt: new Date().toISOString(),
              transferWindowStatus: 'Post-Transfer Window Active Roster Locked',
              activePlayersCount: validElements.length,
              totalRawPlayersInApi: rawData.elements.length,
              departedPlayersFiltered: rawData.elements.length - validElements.length,
              sampleActivePlayers: validElements.slice(0, 10).map((p) => ({
                id: p.id,
                name: p.web_name,
                team: p.team,
                cost: p.now_cost / 10,
              })),
            },
            null,
            2
          )
        );
        console.log(`[FplDataService] Locked ${validElements.length} valid PL players (filtered ${rawData.elements.length - validElements.length} departed/inactive players).`);
      } catch (err) {
        console.debug('Failed to write lock file:', err);
      }

      codeBridge.registerTeams(data.teams);
      codeBridge.registerClassicPlayers(data.elements, data.teams);

      cacheService.set(cacheKey, data, config.cacheTtl.bootstrap);
      return data;
    } catch (err) {
      console.warn('[FplDataService] Network fetch failed, using fallback bootstrap:', err);
      return this.getFallbackBootstrap();
    }
  }

  public async getFixtures(): Promise<FplFixture[]> {
    const cacheKey = 'fpl_fixtures';
    const cached = cacheService.get<FplFixture[]>(cacheKey);
    if (cached) return cached;

    try {
      const res = await fetch(`${config.fplBaseUrl}/fixtures/`, {
        headers: { 'User-Agent': 'Mozilla/5.0 FPL-AI-Companion/1.0' },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch FPL fixtures: ${res.statusText}`);
      }

      const data = (await res.json()) as FplFixture[];
      cacheService.set(cacheKey, data, config.cacheTtl.fixtures);
      return data;
    } catch (err) {
      console.warn('[FplDataService] Network fixtures failed, using fallback fixtures:', err);
      return this.getFallbackFixtures();
    }
  }

  public async getEntryPicks(managerId: number, gameweek?: number): Promise<FplEntryPicksResponse | null> {
    const gw = gameweek || (await this.getCurrentGameweek());
    const cacheKey = `fpl_picks_${managerId}_gw${gw}`;
    const cached = cacheService.get<FplEntryPicksResponse>(cacheKey);
    if (cached) return cached;

    try {
      const res = await fetch(`${config.fplBaseUrl}/entry/${managerId}/event/${gw}/picks/`, {
        headers: { 'User-Agent': 'Mozilla/5.0 FPL-AI-Companion/1.0' },
      });

      if (!res.ok) {
        console.warn(`[FplDataService] Picks for manager ${managerId} not available (${res.status})`);
        return null;
      }

      const data = (await res.json()) as FplEntryPicksResponse;
      cacheService.set(cacheKey, data, config.cacheTtl.picks);
      return data;
    } catch (err) {
      console.error('[FplDataService] Error fetching manager picks:', err);
      return null;
    }
  }

  public async getDraftBootstrap(): Promise<Array<{ id: number; code: number }>> {
    const cacheKey = 'draft_bootstrap';
    const cached = cacheService.get<Array<{ id: number; code: number }>>(cacheKey);
    if (cached) return cached;

    try {
      const res = await fetch(`${config.draftBaseUrl}/bootstrap-static`, {
        headers: { 'User-Agent': 'Mozilla/5.0 FPL-AI-Companion/1.0' },
      });

      if (res.ok) {
        const data = (await res.json()) as { elements: Array<{ id: number; code: number }> };
        codeBridge.registerDraftElements(data.elements);
        cacheService.set(cacheKey, data.elements, config.cacheTtl.bootstrap);
        return data.elements;
      }
    } catch (err) {
      console.warn('[FplDataService] Draft bootstrap fetch error, using synthetic mapping:', err);
    }

    return [];
  }

  public async getDraftLeagueDetails(leagueId: number): Promise<FplDraftLeagueDetails | null> {
    const cacheKey = `draft_league_${leagueId}`;
    const cached = cacheService.get<FplDraftLeagueDetails>(cacheKey);
    if (cached) return cached;

    try {
      const res = await fetch(`${config.draftBaseUrl}/league/${leagueId}/details`, {
        headers: { 'User-Agent': 'Mozilla/5.0 FPL-AI-Companion/1.0' },
      });

      if (res.ok) {
        const data = (await res.json()) as FplDraftLeagueDetails;
        cacheService.set(cacheKey, data, config.cacheTtl.draft);
        return data;
      }
    } catch (err) {
      console.warn(`[FplDataService] Draft league ${leagueId} error:`, err);
    }

    return null;
  }

  public async getCurrentGameweek(): Promise<number> {
    const bootstrap = await this.getBootstrapStatic();
    const next = bootstrap.events.find((e) => e.is_next);
    if (next) return next.id;
    const current = bootstrap.events.find((e) => e.is_current);
    if (current && !current.finished) return current.id;
    if (current) return current.id;
    return 9;
  }

  public async getRolling5GwFdr(teamId: number): Promise<Array<{ gw: number; opponentShort: string; isHome: boolean; fplFdr: number; adjustedFdr: number }>> {
    const fixtures = await this.getFixtures();
    const currentGw = await this.getCurrentGameweek();
    const bootstrap = await this.getBootstrapStatic();

    const team = bootstrap.teams.find((t) => t.id === teamId);
    const teamName = team?.name || 'Team';

    const upcoming = fixtures
      .filter((f) => f.event !== null && f.event >= currentGw && (f.team_h === teamId || f.team_a === teamId) && !f.finished)
      .slice(0, 5);

    return upcoming.map((f) => {
      const isHome = f.team_h === teamId;
      const oppId = isHome ? f.team_a : f.team_h;
      const oppTeam = bootstrap.teams.find((t) => t.id === oppId);
      const oppName = oppTeam?.name || 'Opponent';
      const rawFdr = isHome ? f.team_h_difficulty : f.team_a_difficulty;

      const { adjustedFdr } = vaastavService.calculateAdjustedFdr(teamName, oppName, isHome, rawFdr);

      return {
        gw: f.event || currentGw,
        opponentShort: oppTeam?.short_name || 'OPP',
        isHome,
        fplFdr: rawFdr,
        adjustedFdr,
      };
    });
  }

  public calculateBayesianProjectedXp(
    player: FplPlayer,
    nextFdr: { fplFdr: number; adjustedFdr: number; isHome: boolean }
  ): number {
    const posMap: Record<number, string> = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };
    const position = posMap[player.element_type];
    const baseline = vaastavService.getPlayerBaseline(player.code, player.web_name, position);

    // 1. Live Form per-game:
    const livePpg = parseFloat(player.points_per_game) || 4.0;
    const liveForm = parseFloat(player.form) || livePpg;

    // 2. Historical Vaastav baseline or price-implied quality floor:
    const priceQualityFloor = (player.now_cost / 10) * 0.52;
    const histP90 = baseline?.careerPer90.points90 || Math.max(livePpg, priceQualityFloor);

    // 3. Weighting based on minutes played:
    // If player has played >= 600 mins, weight live 65% and hist 35%. Otherwise weight hist 60%.
    const liveWeight = player.minutes >= 600 ? 0.65 : 0.40;
    const histWeight = 1.0 - liveWeight;

    const baseExpectedPoints = (liveForm * liveWeight) + (histP90 * histWeight);

    // 4. Fixture Difficulty Modifier (3.0 is neutral; 1.0 is easiest +25%, 5.0 is hardest -25%):
    const fdrMultiplier = 1.0 + (3.0 - nextFdr.adjustedFdr) * 0.12;

    // 5. Chance of playing penalty:
    let playingMultiplier = 1.0;
    if (player.status === 'i' || player.status === 's') {
      playingMultiplier = 0.0;
    } else if (player.chance_of_playing_next_round !== null) {
      playingMultiplier = player.chance_of_playing_next_round / 100;
    }

    const finalXp = baseExpectedPoints * fdrMultiplier * playingMultiplier;
    return parseFloat(Math.max(0.0, finalXp).toFixed(2));
  }

  private getFallbackBootstrap(): FplBootstrapData {
    const teams = [
      { id: 1, code: 3, name: 'Arsenal', short_name: 'ARS', strength: 5, strength_overall_home: 1340, strength_overall_away: 1310, strength_attack_home: 1330, strength_attack_away: 1280, strength_defence_home: 1340, strength_defence_away: 1310 },
      { id: 2, code: 7, name: 'Aston Villa', short_name: 'AVL', strength: 4, strength_overall_home: 1200, strength_overall_away: 1150, strength_attack_home: 1240, strength_attack_away: 1180, strength_defence_home: 1200, strength_defence_away: 1150 },
      { id: 3, code: 91, name: 'Bournemouth', short_name: 'BOU', strength: 3, strength_overall_home: 1100, strength_overall_away: 1080, strength_attack_home: 1120, strength_attack_away: 1090, strength_defence_home: 1100, strength_defence_away: 1080 },
      { id: 4, code: 94, name: 'Brentford', short_name: 'BRE', strength: 3, strength_overall_home: 1110, strength_overall_away: 1080, strength_attack_home: 1160, strength_attack_away: 1110, strength_defence_home: 1110, strength_defence_away: 1080 },
      { id: 5, code: 36, name: 'Brighton', short_name: 'BHA', strength: 3, strength_overall_home: 1140, strength_overall_away: 1100, strength_attack_home: 1180, strength_attack_away: 1140, strength_defence_home: 1140, strength_defence_away: 1100 },
      { id: 6, code: 8, name: 'Chelsea', short_name: 'CHE', strength: 4, strength_overall_home: 1190, strength_overall_away: 1160, strength_attack_home: 1270, strength_attack_away: 1220, strength_defence_home: 1190, strength_defence_away: 1160 },
      { id: 7, code: 31, name: 'Crystal Palace', short_name: 'CRY', strength: 3, strength_overall_home: 1150, strength_overall_away: 1100, strength_attack_home: 1130, strength_attack_away: 1090, strength_defence_home: 1150, strength_defence_away: 1100 },
      { id: 8, code: 11, name: 'Everton', short_name: 'EVE', strength: 3, strength_overall_home: 1170, strength_overall_away: 1110, strength_attack_home: 1100, strength_attack_away: 1060, strength_defence_home: 1170, strength_defence_away: 1110 },
      { id: 9, code: 54, name: 'Fulham', short_name: 'FUL', strength: 3, strength_overall_home: 1140, strength_overall_away: 1110, strength_attack_home: 1150, strength_attack_away: 1090, strength_defence_home: 1140, strength_defence_away: 1110 },
      { id: 10, code: 40, name: 'Ipswich', short_name: 'IPS', strength: 2, strength_overall_home: 1040, strength_overall_away: 1030, strength_attack_home: 1050, strength_attack_away: 1020, strength_defence_home: 1040, strength_defence_away: 1030 },
      { id: 11, code: 13, name: 'Leicester', short_name: 'LEI', strength: 2, strength_overall_home: 1070, strength_overall_away: 1050, strength_attack_home: 1090, strength_attack_away: 1060, strength_defence_home: 1070, strength_defence_away: 1050 },
      { id: 12, code: 14, name: 'Liverpool', short_name: 'LIV', strength: 5, strength_overall_home: 1320, strength_overall_away: 1280, strength_attack_home: 1350, strength_attack_away: 1300, strength_defence_home: 1320, strength_defence_away: 1280 },
      { id: 13, code: 43, name: 'Man City', short_name: 'MCI', strength: 5, strength_overall_home: 1350, strength_overall_away: 1310, strength_attack_home: 1370, strength_attack_away: 1330, strength_defence_home: 1350, strength_defence_away: 1310 },
      { id: 14, code: 1, name: 'Man Utd', short_name: 'MUN', strength: 4, strength_overall_home: 1180, strength_overall_away: 1130, strength_attack_home: 1220, strength_attack_away: 1170, strength_defence_home: 1180, strength_defence_away: 1130 },
      { id: 15, code: 4, name: 'Newcastle', short_name: 'NEW', strength: 4, strength_overall_home: 1220, strength_overall_away: 1150, strength_attack_home: 1280, strength_attack_away: 1190, strength_defence_home: 1220, strength_defence_away: 1150 },
      { id: 16, code: 17, name: "Nott'm Forest", short_name: 'NFO', strength: 3, strength_overall_home: 1160, strength_overall_away: 1120, strength_attack_home: 1130, strength_attack_away: 1080, strength_defence_home: 1160, strength_defence_away: 1120 },
      { id: 17, code: 20, name: 'Southampton', short_name: 'SOU', strength: 2, strength_overall_home: 1050, strength_overall_away: 1020, strength_attack_home: 1060, strength_attack_away: 1030, strength_defence_home: 1050, strength_defence_away: 1020 },
      { id: 18, code: 6, name: 'Spurs', short_name: 'TOT', strength: 4, strength_overall_home: 1170, strength_overall_away: 1140, strength_attack_home: 1280, strength_attack_away: 1220, strength_defence_home: 1170, strength_defence_away: 1140 },
      { id: 19, code: 21, name: 'West Ham', short_name: 'WHU', strength: 3, strength_overall_home: 1130, strength_overall_away: 1090, strength_attack_home: 1170, strength_attack_away: 1120, strength_defence_home: 1130, strength_defence_away: 1090 },
      { id: 20, code: 39, name: 'Wolves', short_name: 'WOL', strength: 3, strength_overall_home: 1120, strength_overall_away: 1080, strength_attack_home: 1140, strength_attack_away: 1090, strength_defence_home: 1120, strength_defence_away: 1080 },
    ];

    const elements: FplPlayer[] = [
      { id: 351, code: 223094, web_name: 'Haaland', first_name: 'Erling', second_name: 'Haaland', team: 13, element_type: 4, now_cost: 154, selected_by_percent: '71.2', form: '8.4', points_per_game: '8.5', total_points: 85, ep_next: '8.5', ep_this: '8.5', minutes: 890, goals_scored: 11, assists: 2, clean_sheets: 3, goals_conceded: 9, yellow_cards: 1, red_cards: 0, saves: 0, bonus: 14, bps: 310, influence: '450.2', creativity: '120.4', threat: '680.1', ict_index: '125.1', expected_goals: '9.82', expected_assists: '1.45', expected_goal_involvements: '11.27', expected_goals_conceded: '8.4', status: 'a', news: '', chance_of_playing_next_round: 100 },
      { id: 328, code: 118748, web_name: 'Salah', first_name: 'Mohamed', second_name: 'Salah', team: 12, element_type: 3, now_cost: 127, selected_by_percent: '43.8', form: '8.1', points_per_game: '8.2', total_points: 82, ep_next: '8.2', ep_this: '8.2', minutes: 885, goals_scored: 7, assists: 6, clean_sheets: 5, goals_conceded: 5, yellow_cards: 0, red_cards: 0, saves: 0, bonus: 12, bps: 295, influence: '412.5', creativity: '345.8', threat: '510.2', ict_index: '126.8', expected_goals: '6.45', expected_assists: '4.82', expected_goal_involvements: '11.27', expected_goals_conceded: '5.2', status: 'a', news: '', chance_of_playing_next_round: 100 },
      { id: 18, code: 438098, web_name: 'Saka', first_name: 'Bukayo', second_name: 'Saka', team: 1, element_type: 3, now_cost: 101, selected_by_percent: '34.5', form: '7.2', points_per_game: '7.4', total_points: 74, ep_next: '7.4', ep_this: '7.4', minutes: 810, goals_scored: 4, assists: 7, clean_sheets: 4, goals_conceded: 8, yellow_cards: 1, red_cards: 0, saves: 0, bonus: 9, bps: 260, influence: '375.4', creativity: '390.1', threat: '340.2', ict_index: '110.5', expected_goals: '3.85', expected_assists: '5.12', expected_goal_involvements: '8.97', expected_goals_conceded: '7.8', status: 'a', news: '', chance_of_playing_next_round: 100 },
      { id: 182, code: 497645, web_name: 'Palmer', first_name: 'Cole', second_name: 'Palmer', team: 6, element_type: 3, now_cost: 110, selected_by_percent: '54.2', form: '8.3', points_per_game: '8.1', total_points: 81, ep_next: '8.1', ep_this: '8.1', minutes: 870, goals_scored: 7, assists: 5, clean_sheets: 3, goals_conceded: 11, yellow_cards: 2, red_cards: 0, saves: 0, bonus: 13, bps: 288, influence: '420.1', creativity: '380.5', threat: '490.2', ict_index: '129.1', expected_goals: '5.62', expected_assists: '4.15', expected_goal_involvements: '9.77', expected_goals_conceded: '10.5', status: 'a', news: '', chance_of_playing_next_round: 100 },
      { id: 45, code: 178301, web_name: 'Watkins', first_name: 'Ollie', second_name: 'Watkins', team: 2, element_type: 4, now_cost: 91, selected_by_percent: '29.1', form: '6.4', points_per_game: '6.2', total_points: 62, ep_next: '6.2', ep_this: '6.2', minutes: 820, goals_scored: 5, assists: 3, clean_sheets: 2, goals_conceded: 11, yellow_cards: 1, red_cards: 0, saves: 0, bonus: 8, bps: 210, influence: '290.4', creativity: '160.2', threat: '380.1', ict_index: '83.0', expected_goals: '5.10', expected_assists: '2.40', expected_goal_involvements: '7.50', expected_goals_conceded: '10.2', status: 'a', news: '', chance_of_playing_next_round: 100 },
      { id: 412, code: 467169, web_name: 'Isak', first_name: 'Alexander', second_name: 'Isak', team: 15, element_type: 4, now_cost: 84, selected_by_percent: '19.8', form: '5.8', points_per_game: '5.9', total_points: 47, ep_next: '5.9', ep_this: '5.9', minutes: 640, goals_scored: 4, assists: 1, clean_sheets: 2, goals_conceded: 8, yellow_cards: 0, red_cards: 0, saves: 0, bonus: 6, bps: 175, influence: '230.1', creativity: '95.4', threat: '310.5', ict_index: '63.6', expected_goals: '4.20', expected_assists: '0.85', expected_goal_involvements: '5.05', expected_goals_conceded: '7.5', status: 'a', news: '', chance_of_playing_next_round: 100 },
      { id: 98, code: 444145, web_name: 'Mbeumo', first_name: 'Bryan', second_name: 'Mbeumo', team: 4, element_type: 3, now_cost: 77, selected_by_percent: '36.2', form: '7.4', points_per_game: '7.1', total_points: 71, ep_next: '7.1', ep_this: '7.1', minutes: 875, goals_scored: 8, assists: 1, clean_sheets: 1, goals_conceded: 18, yellow_cards: 1, red_cards: 0, saves: 0, bonus: 11, bps: 245, influence: '380.2', creativity: '190.4', threat: '420.5', ict_index: '99.1', expected_goals: '4.95', expected_assists: '2.10', expected_goal_involvements: '7.05', expected_goals_conceded: '16.5', status: 'a', news: '', chance_of_playing_next_round: 100 },
      { id: 325, code: 169187, web_name: 'Alexander-Arnold', first_name: 'Trent', second_name: 'Alexander-Arnold', team: 12, element_type: 2, now_cost: 71, selected_by_percent: '31.4', form: '5.8', points_per_game: '5.7', total_points: 57, ep_next: '5.7', ep_this: '5.7', minutes: 850, goals_scored: 0, assists: 3, clean_sheets: 5, goals_conceded: 5, yellow_cards: 2, red_cards: 0, saves: 0, bonus: 7, bps: 240, influence: '260.4', creativity: '380.1', threat: '140.2', ict_index: '78.0', expected_goals: '0.95', expected_assists: '3.80', expected_goal_involvements: '4.75', expected_goals_conceded: '5.1', status: 'a', news: '', chance_of_playing_next_round: 100 },
      { id: 11, code: 226597, web_name: 'Gabriel', first_name: 'Gabriel', second_name: 'dos Santos Magalhães', team: 1, element_type: 2, now_cost: 62, selected_by_percent: '27.8', form: '5.5', points_per_game: '5.4', total_points: 54, ep_next: '5.4', ep_this: '5.4', minutes: 880, goals_scored: 2, assists: 0, clean_sheets: 4, goals_conceded: 8, yellow_cards: 2, red_cards: 0, saves: 0, bonus: 6, bps: 215, influence: '235.1', creativity: '45.2', threat: '195.4', ict_index: '47.5', expected_goals: '1.45', expected_assists: '0.20', expected_goal_involvements: '1.65', expected_goals_conceded: '7.8', status: 'a', news: '', chance_of_playing_next_round: 100 },
      { id: 9, code: 204676, web_name: 'Raya', first_name: 'David', second_name: 'Raya Martin', team: 1, element_type: 1, now_cost: 56, selected_by_percent: '33.1', form: '5.2', points_per_game: '5.1', total_points: 51, ep_next: '5.1', ep_this: '5.1', minutes: 900, goals_scored: 0, assists: 0, clean_sheets: 4, goals_conceded: 8, yellow_cards: 1, red_cards: 0, saves: 36, bonus: 5, bps: 210, influence: '280.4', creativity: '0.0', threat: '0.0', ict_index: '28.0', expected_goals: '0.0', expected_assists: '0.0', expected_goal_involvements: '0.0', expected_goals_conceded: '8.4', status: 'a', news: '', chance_of_playing_next_round: 100 },
      { id: 432, code: 60706, web_name: 'Wood', first_name: 'Chris', second_name: 'Wood', team: 16, element_type: 4, now_cost: 64, selected_by_percent: '21.5', form: '6.5', points_per_game: '6.4', total_points: 64, ep_next: '6.4', ep_this: '6.4', minutes: 790, goals_scored: 7, assists: 0, clean_sheets: 3, goals_conceded: 7, yellow_cards: 1, red_cards: 0, saves: 0, bonus: 10, bps: 220, influence: '295.4', creativity: '85.2', threat: '340.5', ict_index: '72.1', expected_goals: '4.85', expected_assists: '0.45', expected_goal_involvements: '5.30', expected_goals_conceded: '7.2', status: 'a', news: '', chance_of_playing_next_round: 100 },
      { id: 75, code: 512217, web_name: 'Semenyo', first_name: 'Antoine', second_name: 'Semenyo', team: 3, element_type: 3, now_cost: 56, selected_by_percent: '14.2', form: '5.6', points_per_game: '5.4', total_points: 54, ep_next: '5.4', ep_this: '5.4', minutes: 820, goals_scored: 4, assists: 1, clean_sheets: 2, goals_conceded: 12, yellow_cards: 3, red_cards: 0, saves: 0, bonus: 4, bps: 165, influence: '240.2', creativity: '175.4', threat: '380.2', ict_index: '79.5', expected_goals: '3.90', expected_assists: '1.45', expected_goal_involvements: '5.35', expected_goals_conceded: '11.8', status: 'a', news: '', chance_of_playing_next_round: 100 },
      { id: 52, code: 463748, web_name: 'Rogers', first_name: 'Morgan', second_name: 'Rogers', team: 2, element_type: 3, now_cost: 54, selected_by_percent: '22.4', form: '5.3', points_per_game: '5.2', total_points: 52, ep_next: '5.2', ep_this: '5.2', minutes: 835, goals_scored: 2, assists: 3, clean_sheets: 2, goals_conceded: 11, yellow_cards: 2, red_cards: 0, saves: 0, bonus: 4, bps: 170, influence: '210.5', creativity: '240.8', threat: '255.4', ict_index: '70.6', expected_goals: '2.45', expected_assists: '2.80', expected_goal_involvements: '5.25', expected_goals_conceded: '10.5', status: 'a', news: '', chance_of_playing_next_round: 100 },
      { id: 355, code: 209244, web_name: 'Foden', first_name: 'Phil', second_name: 'Foden', team: 13, element_type: 3, now_cost: 92, selected_by_percent: '8.4', form: '5.1', points_per_game: '4.8', total_points: 34, ep_next: '5.1', ep_this: '5.1', minutes: 420, goals_scored: 1, assists: 2, clean_sheets: 2, goals_conceded: 4, yellow_cards: 0, red_cards: 0, saves: 0, bonus: 3, bps: 110, influence: '145.2', creativity: '160.5', threat: '180.4', ict_index: '48.5', expected_goals: '1.85', expected_assists: '1.90', expected_goal_involvements: '3.75', expected_goals_conceded: '4.1', status: 'a', news: '', chance_of_playing_next_round: 100 },
      { id: 215, code: 111457, web_name: 'Pickford', first_name: 'Jordan', second_name: 'Pickford', team: 8, element_type: 1, now_cost: 49, selected_by_percent: '16.5', form: '4.8', points_per_game: '4.6', total_points: 46, ep_next: '4.6', ep_this: '4.6', minutes: 900, goals_scored: 0, assists: 0, clean_sheets: 3, goals_conceded: 15, yellow_cards: 1, red_cards: 0, saves: 39, bonus: 6, bps: 195, influence: '265.4', creativity: '0.0', threat: '0.0', ict_index: '26.5', expected_goals: '0.0', expected_assists: '0.0', expected_goal_involvements: '0.0', expected_goals_conceded: '16.2', status: 'a', news: '', chance_of_playing_next_round: 100 },
    ];

    const events = [
      { id: 9, name: 'Gameweek 9', deadline_time: '2026-10-25T10:00:00Z', is_current: false, is_next: false, is_previous: true, finished: true },
      { id: 10, name: 'Gameweek 10', deadline_time: '2026-11-01T11:00:00Z', is_current: true, is_next: false, is_previous: false, finished: false },
      { id: 11, name: 'Gameweek 11', deadline_time: '2026-11-08T11:00:00Z', is_current: false, is_next: true, is_previous: false, finished: false },
    ];

    codeBridge.registerTeams(teams);
    codeBridge.registerClassicPlayers(elements, teams);

    return { elements, teams, events };
  }

  private getFallbackFixtures(): FplFixture[] {
    return [
      { id: 91, event: 10, team_h: 13, team_a: 3, team_h_difficulty: 2, team_a_difficulty: 5, kickoff_time: '2026-11-01T15:00:00Z', finished: false, team_h_score: null, team_a_score: null }, // MCI vs BOU
      { id: 92, event: 10, team_h: 12, team_a: 5, team_h_difficulty: 3, team_a_difficulty: 4, kickoff_time: '2026-11-01T15:00:00Z', finished: false, team_h_score: null, team_a_score: null }, // LIV vs BHA
      { id: 93, event: 10, team_h: 15, team_a: 1, team_h_difficulty: 3, team_a_difficulty: 4, kickoff_time: '2026-11-01T12:30:00Z', finished: false, team_h_score: null, team_a_score: null }, // NEW vs ARS
      { id: 94, event: 10, team_h: 14, team_a: 6, team_h_difficulty: 3, team_a_difficulty: 3, kickoff_time: '2026-11-01T16:30:00Z', finished: false, team_h_score: null, team_a_score: null }, // MUN vs CHE
      { id: 95, event: 10, team_h: 18, team_a: 2, team_h_difficulty: 3, team_a_difficulty: 3, kickoff_time: '2026-11-02T14:00:00Z', finished: false, team_h_score: null, team_a_score: null }, // TOT vs AVL
      { id: 96, event: 10, team_h: 16, team_a: 19, team_h_difficulty: 2, team_a_difficulty: 3, kickoff_time: '2026-11-02T15:00:00Z', finished: false, team_h_score: null, team_a_score: null }, // NFO vs WHU
      { id: 97, event: 10, team_h: 20, team_a: 8, team_h_difficulty: 3, team_a_difficulty: 2, kickoff_time: '2026-11-02T15:00:00Z', finished: false, team_h_score: null, team_a_score: null }, // SOU vs EVE
      { id: 98, event: 10, team_h: 10, team_a: 11, team_h_difficulty: 2, team_a_difficulty: 3, kickoff_time: '2026-11-02T15:00:00Z', finished: false, team_h_score: null, team_a_score: null }, // IPS vs LEI
      { id: 99, event: 10, team_h: 20, team_a: 4, team_h_difficulty: 3, team_a_difficulty: 2, kickoff_time: '2026-11-02T15:00:00Z', finished: false, team_h_score: null, team_a_score: null }, // WOL vs CRY
      { id: 100, event: 10, team_h: 9, team_a: 4, team_h_difficulty: 3, team_a_difficulty: 3, kickoff_time: '2026-11-03T20:00:00Z', finished: false, team_h_score: null, team_a_score: null }, // FUL vs BRE
    ];
  }
}

export const fplService = FplDataService.getInstance();
