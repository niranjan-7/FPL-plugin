export type AppMode = 'classic' | 'draft';

export interface ScrapedSquadPlayer {
  name: string;
  currentPrice?: number;
  fixture?: string;
  hasFlag?: boolean;
}

export interface ScrapedMarketTarget {
  name: string;
  team?: string;
  position?: string;
  currentPrice?: number;
  totalPoints?: number;
  hasFlag?: boolean;
}

export interface PageContext {
  mode: AppMode | 'unknown';
  url: string;
  managerId: number | null;
  draftLeagueId?: number | null;
  activeGameweek: number | null;
  bankBalance?: number;
  squadValue?: number;
  totalBudget?: number;
  freeTransfers?: number;
  onScreenPicks?: number[]; // player element IDs currently on user's pitch/transfers screen
  onScreenPlayerNames?: string[]; // player web names directly scraped from on-screen pitch
  squadPlayersDetailed?: ScrapedSquadPlayer[]; // rich on-screen pitch squad with live DOM price & flags
  targetPlayersDetailed?: ScrapedMarketTarget[]; // rich marketplace/sidebar player targets
  chipsStatus?: Record<string, 'AVAILABLE' | 'PLAYED'>; // chips detected on screen (Wildcard, Free Hit, etc.)
}

export interface FixtureModifierBadge {
  type: 'BOGEY_GROUND_CURSE' | 'FLAT_TRACK_BULLY' | 'GROUND_FORTRESS' | 'BALANCED';
  badgeLabel: string; // e.g. "👻 Bogey Ground" or "🔨 Flat-Track" or "🏰 Fortress"
  adjustedFdr: number;
  officialFdr: number;
  tooltipText: string;
}

export interface AiBadgePayload {
  elementId: number;
  playerCode: number;
  webName: string;
  projectedXp: number;
  yoyDeltaPct: number; // e.g. +14 for +14% vs Vaastav historical baseline
  clubMatchupRating: number; // 1-5 weighted rating
  regressionFlag?: 'HOT' | 'COLD' | 'STABLE';
  fixtureModifier?: FixtureModifierBadge;
}

export interface ExtensionMessage<T = unknown> {
  action:
    | 'PAGE_STATE_UPDATED'
    | 'GET_PAGE_STATE'
    | 'INJECT_AI_BADGES'
    | 'REQUEST_PLAYER_CARD'
    | 'OPEN_SIDE_PANEL'
    | 'PING_BACKEND';
  payload?: T;
}

export interface ExtensionStorageData {
  appMode: AppMode;
  pageContext: PageContext;
  backendUrl: string;
  lastSync: number;
}
