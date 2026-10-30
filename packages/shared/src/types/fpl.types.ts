export type PositionType = 'GK' | 'DEF' | 'MID' | 'FWD';

export interface FplPlayer {
  id: number;
  code: number;
  web_name: string;
  first_name: string;
  second_name: string;
  team: number;
  element_type: number; // 1 = GK, 2 = DEF, 3 = MID, 4 = FWD
  now_cost: number; // e.g. 100 = £10.0m
  selected_by_percent: string;
  form: string;
  points_per_game: string;
  total_points: number;
  ep_next: string | null;
  ep_this: string | null;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  bonus: number;
  bps: number;
  influence: string;
  creativity: string;
  threat: string;
  ict_index: string;
  expected_goals: string;
  expected_assists: string;
  expected_goal_involvements: string;
  expected_goals_conceded: string;
  status: 'a' | 'd' | 'i' | 's' | 'u'; // available, doubtful, injured, suspended, unavailable
  news: string;
  chance_of_playing_next_round: number | null;
  cost_change_event?: number;
  cost_change_start?: number;
  transfers_in_event?: number;
  transfers_out_event?: number;
}

export interface FplTeam {
  id: number;
  code: number;
  name: string;
  short_name: string;
  strength: number;
  strength_overall_home: number;
  strength_overall_away: number;
  strength_attack_home: number;
  strength_attack_away: number;
  strength_defence_home: number;
  strength_defence_away: number;
}

export interface FplEvent {
  id: number;
  name: string;
  deadline_time: string;
  is_current: boolean;
  is_next: boolean;
  is_previous: boolean;
  finished: boolean;
  chip_plays?: { chip_name: string; num_played: number }[];
}

export interface FplFixture {
  id: number;
  event: number | null;
  team_h: number;
  team_a: number;
  team_h_difficulty: number;
  team_a_difficulty: number;
  kickoff_time: string;
  finished: boolean;
  team_h_score: number | null;
  team_a_score: number | null;
}

export interface FplBootstrapData {
  elements: FplPlayer[];
  teams: FplTeam[];
  events: FplEvent[];
}

export interface FplPick {
  element: number;
  position: number; // 1-15 on squad (1-11 starting, 12-15 bench)
  multiplier: number; // 2 for captain, 3 for triple captain, 1 for normal, 0 for benched
  is_captain: boolean;
  is_vice_captain: boolean;
}

export interface FplEntryPicksResponse {
  active_chip: string | null;
  entry_history: {
    event: number;
    points: number;
    total_points: number;
    rank: number;
    bank: number;
    value: number;
    event_transfers: number;
    event_transfers_cost: number;
    points_on_bench: number;
  };
  picks: FplPick[];
}

export interface FplDraftElementStatus {
  element: number;
  owner: number | null; // entry id or null if free agent
  status: 'a' | 'u';
}

export interface FplDraftLeagueDetails {
  league: {
    id: number;
    name: string;
    scoring: 'c' | 'h'; // classic or head-to-head
  };
  league_entries: {
    id: number;
    entry_id: number;
    entry_name: string;
    player_first_name: string;
    player_last_name: string;
    short_name: string;
  }[];
  standings: {
    league_entry: number;
    rank: number;
    total: number;
  }[];
  element_status: FplDraftElementStatus[];
}

export interface FplDraftTransaction {
  id: number;
  event: number;
  element_in: number;
  element_out: number;
  entry: number;
  kind: 'w' | 'f'; // waiver or free agent
  result: 'a' | 'di' | 'do'; // accepted, denied
}
