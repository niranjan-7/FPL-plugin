export interface VaastavPlayerOverview {
  season: string; // e.g. '2025-26', '2024-25', '2023-24'
  code: number; // Permanent Premier League code
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  team: string;
  total_points: number;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  expected_goals: number;
  expected_assists: number;
  expected_goal_involvements: number;
  bonus: number;
  bps: number;
  value: number;
}

export interface VaastavPlayerPer90 {
  xG90: number;
  xA90: number;
  xGI90: number;
  points90: number;
  bonus90: number;
  minutesShare: number; // minutes / (38 * 90)
  finishingDelta: number; // goals_scored - expected_goals
  conversionRate: number; // goals / (goals + assists + shots proxy)
}

export interface VaastavHistoricalMatch {
  season: string;
  gameweek: number;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
}

export interface VaastavClubH2H {
  teamA: string;
  teamB: string;
  meetings: number;
  winsA: number;
  winsB: number;
  draws: number;
  goalsA: number;
  goalsB: number;
  cleanSheetsA: number;
  cleanSheetsB: number;
  avgTotalGoals: number;
  lastMeetingScore?: string;
  venueBias: {
    homeAdvantagePct: number; // historic win bump for home club
  };
}

export interface VaastavVenueProfile {
  teamCode: number;
  stadiumName: string;
  matchesPlayed: number;
  winRate: number;
  drawRate: number;
  lossRate: number;
  cleanSheetRate: number;
  avgGoalsScored: number;
  avgGoalsConceded: number;
}

export interface RegressionAnalysis {
  playerCode: number;
  webName: string;
  liveGoals: number;
  liveXG: number;
  historicalXG90: number;
  liveXG90: number;
  finishingEfficiency: number; // (actual / xG) vs career average
  regressionStatus: 'UNSUSTAINABLE_HOT_STREAK' | 'SUSTAINED_ELITE_FINISHING' | 'FAIR_VALUE' | 'UNLUCKY_DUE_POSITIVE_REBOUND';
  confidenceNote: string;
}
