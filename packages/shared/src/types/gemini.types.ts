export interface TransferRecommendation {
  playerOut: {
    id: number;
    code: number;
    name: string;
    cost: number;
    reason: string;
  };
  playerIn: {
    id: number;
    code: number;
    name: string;
    cost: number;
    projectedXpDelta: number;
    reason: string;
  };
  netCost: number;
}

export interface CaptainRecommendation {
  captain: {
    name: string;
    code: number;
    projectedXp: number;
    fixture: string;
    historicalReturnRate: string;
    rationale: string;
  };
  viceCaptain: {
    name: string;
    code: number;
    projectedXp: number;
    fixture: string;
    rationale: string;
  };
}

export interface SquadAuditCard {
  type: 'SQUAD_AUDIT';
  managerId: number;
  gameweek: number;
  freeTransfers?: number;
  squadScore: number; // 0-100
  formation?: string; // e.g. '3-5-2'
  optimalStartingXI: string[];
  benchOrder: string[];
  transfers: TransferRecommendation[];
  captaincy: CaptainRecommendation;
  chipStrategy: {
    recommendedChip: 'NONE' | 'WILDCARD' | 'FREE_HIT' | 'BENCH_BOOST' | 'TRIPLE_CAPTAIN';
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    strategicReasoning: string;
  };
  executiveSummary: string;
}

export type WaiverPriorityTier =
  | 'TIER_1_MUST_ADD'
  | 'TIER_2_STRONG_STARTER'
  | 'TIER_3_STREAMER'
  | 'SLEEPER';

export interface WaiverRecommendationItem {
  rank: number;
  playerIn: {
    id: number;
    code: number;
    name: string;
    team: string;
    position: 'GK' | 'DEF' | 'MID' | 'FWD';
    projected5GwXp: number;
    xGiPer90: number;
    avgFdrNext5: number;
    fixtureSwing: string;
    priorityTier: WaiverPriorityTier;
  };
  dropCandidate: {
    name: string;
    team?: string;
    position?: string;
    projected5GwXp?: number;
    reason: string;
    crisisType?: 'INJURY' | 'FIXTURE_CLIFF' | 'LOST_MINUTES' | 'POOR_FORM';
  };
  netXpGain: number;
  bayesianVerdict: string;
}

export interface RivalWaiverThreat {
  rivalRank: number; // e.g. 1, 2, 3
  rivalName: string; // e.g. "Rival #1 (Bottom Table)"
  vulnerablePositions: string[]; // e.g. ["DEF", "GK"]
  crisisSummary: string; // e.g. "Injured LB & CB, 0 healthy bench DEF"
  likelyTargetPosition: 'GK' | 'DEF' | 'MID' | 'FWD';
  snipingThreatProbability: number; // e.g. 90
  predictedTargetName?: string; // e.g. "Konsa"
}

export interface SnipingAdvice {
  userWaiverPriority: number; // e.g. 4
  slippingTarget: {
    name: string;
    team: string;
    position: 'GK' | 'DEF' | 'MID' | 'FWD';
    snipingThreatPct: number; // e.g. 15
    recommendation: string; // e.g. "Put #1 on queue: Rivals #1-#3 are desperate for DEF, so Forward Y will slide to you at #4!"
  };
  contestedTarget: {
    name: string;
    team: string;
    position: 'GK' | 'DEF' | 'MID' | 'FWD';
    snipingThreatPct: number; // e.g. 90
    contestedByRival: string; // e.g. "Rival #1 will likely claim Defender X first. Queue as backup only."
  };
}

export interface TwoWeekPuntDefender {
  name: string;
  team: string;
  opponent: string;
  isHome: boolean;
  upcomingFixture: string; // e.g. "SOU (H)"
  cleanSheetOddsPct: number; // e.g. 54
  opponentAwayGoalAvg: number; // e.g. 0.58
  projectedXp: number; // e.g. 6.4
  rationale: string; // e.g. "One-Night Stand stream: Facing league's worst away attack (SOU 0.58 g/m). Stream for clean sheet, then drop."
}

export interface DraftStartingPlayer {
  id: number;
  name: string;
  team: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  fixture: string;
  isHome: boolean;
  projectedXp: number;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
}

export interface DraftStarting11 {
  formation: string; // e.g. "3-4-3" or "3-5-2"
  totalProjectedXp: number;
  starters: DraftStartingPlayer[]; // exactly 11 players
  bench: Array<DraftStartingPlayer & { benchOrder: number; benchLabel: string }>; // 4 players (Sub GK, Bench 1, 2, 3)
  captain: { name: string; projectedXp: number; rationale: string };
  viceCaptain: { name: string; projectedXp: number };
}

export interface WaiverCard {
  type: 'WAIVER_AUDIT';
  draftLeagueId: number;
  gameweek: number;
  waiverDeadline: string;
  positionFilter?: string;
  userWaiverPriority?: number;
  recommendations: WaiverRecommendationItem[];
  dropCandidatesSummary: Array<{
    name: string;
    team: string;
    position: string;
    reason: string;
    urgency: 'HIGH' | 'MEDIUM';
  }>;
  sleeperPick: {
    name: string;
    team: string;
    position: string;
    xGiPer90: number;
    avgFdrNext5?: number;
    rationale: string;
  };
  transactionOrder: Array<{
    priority: number;
    addPlayer: string;
    dropPlayer: string;
    tacticalNote: string;
  }>;
  rivalThreats?: RivalWaiverThreat[];
  snipingAdvice?: SnipingAdvice;
  twoWeekPuntStreamers?: TwoWeekPuntDefender[];
  suggestedStarting11?: DraftStarting11;
  executiveSummary: string;
}

export interface PlayerComparisonCard {
  type: 'PLAYER_COMPARISON';
  players: {
    name: string;
    team: string;
    position: string;
    currentCost: number;
    live26FormXgi: number;
    historicalPer90Xgi: number;
    upcoming5GwFdrAvg: number;
    regressionStatus: string;
    verdict: string;
  }[];
  winner: string;
  headToHeadConclusion: string;
}

export interface MatchupEvaluationCard {
  type: 'MATCHUP_EVALUATION';
  matchup: string;
  venue: string;
  hasH2hData?: boolean;
  h2hMeetingsCount?: number;
  predictedOutcome: string;
  expectedGoalsTotal: number;
  cleanSheetProbability: {
    homeTeam: number;
    awayTeam: number;
  };
  historicalH2HSummary: string;
  fplAssetRecommendations: {
    mustStart: string[];
    differentials: string[];
    cautionFlags: string[];
  };
  tacticalSummary: string;
}

export interface WildcardSquadPlayer {
  id: number;
  code: number;
  name: string;
  team: string;
  cost: number;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  xpNext5: number;
  fixtureSummary: string;
  role: 'STARTER' | 'BENCH';
}

export interface WildcardStrategyCard {
  type: 'WILDCARD_STRATEGY';
  managerId: number;
  verdict: 'ACTIVATE_WILDCARD_NOW' | 'HOLD_WILDCARD';
  confidence: number;
  reasoning: string;
  teamCrisisSummary: {
    injuredOrDoubtful: string[];
    toughFixtureCliff: string[];
    pointHitsSaved: number;
    projected5GwGain: number;
  };
  optimalSquad: {
    totalCost: number;
    bankRemaining: number;
    gks: WildcardSquadPlayer[];
    defs: WildcardSquadPlayer[];
    mids: WildcardSquadPlayer[];
    fwds: WildcardSquadPlayer[];
  };
  keyFixtureSwings: string[];
  transferDelta?: {
    totalTransfersNeeded: number;
    retainedPlayers: Array<{ name: string; team: string; cost: number }>;
    directSwaps: Array<{
      outPlayer: { name: string; team: string; cost: number };
      inPlayer: { name: string; team: string; cost: number };
      financialDelta: number;
      rationale?: string;
    }>;
    budgetUtilizationPercent: number;
  };
}

export type FplChipName = 'wildcard' | 'freehit' | '3xc' | 'bboost';

export interface UserChipStatus {
  name: FplChipName;
  label: string;
  status: 'AVAILABLE' | 'PLAYED';
  playedGameweek?: number | null;
}

export interface ChipStrategyPlan {
  chip: FplChipName;
  label: string;
  targetWindow: string;
  status: 'AVAILABLE' | 'PLAYED';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  expectedGainXp: number;
  tacticalRationale: string;
  howToExecute: string[];
  primeTargets: string[];
}

export interface ChipRoadmapCard {
  type: 'CHIP_ROADMAP';
  managerId: number;
  currentGameweek: number;
  chipsStatus: UserChipStatus[];
  seasonRoadmap: ChipStrategyPlan[];
  immediateAction: string;
  set1Chips?: UserChipStatus[];
  set2Chips?: UserChipStatus[];
  set1DeadlineNotice?: string;
}

export interface CreatorTakeaway {
  creator: string;
  videoTitleOrTopic: string;
  url: string;
  keyVerdict: string;
  topPick: string;
}

export interface ExpertIntelCard {
  type: 'EXPERT_INTEL';
  gameweek: number;
  lastUpdated: string;
  consensusBuys: Array<{ player: string; mentions: number; reason: string; isOwned?: boolean }>;
  consensusSells: Array<{ player: string; mentions: number; reason: string; isOwned?: boolean }>;
  squadSellAlerts?: Array<{ player: string; mentions: number; reason: string }>;
  marketWatchSells?: Array<{ player: string; mentions: number; reason: string }>;
  captaincyConsensus: {
    favorite: string;
    differential: string;
    rationale: string;
  };
  chipConsensus: {
    wildcard: string;
    freeHit: string;
    tripleCaptain: string;
  };
  creatorBreakdowns: CreatorTakeaway[];
}

export type CaptaincyRiskProfile =
  | 'SAFE_TEMPLATE_SHIELD'
  | 'CALCULATED_DIFFERENTIAL'
  | 'HIGH_RISK_PUNT';

export interface CaptaincyCandidateEv {
  id: number;
  code: number;
  name: string;
  team: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  fixture: string;
  isHome: boolean;
  opponent: string;
  opponentDefensiveRating: {
    cleanSheetRate: number; // e.g. 0.18
    avgGoalsConceded: number; // e.g. 1.85
    stadium: string;
    venueVulnerability: 'HIGH' | 'MEDIUM' | 'LOW';
  };
  baseXp: number;
  effectiveOwnership: {
    top10k: number; // e.g. 165
    top100k: number; // e.g. 142
    overall: number; // e.g. 110
  };
  shieldScore: number; // 0-100 (Template Safety Index)
  swordScore: number; // 0-100 (Differential Leverage Index)
  dynamicEv: {
    protectRankEv: number;
    chaseRankEv: number;
    balancedEv: number;
  };
  riskProfile: CaptaincyRiskProfile;
  recommendationVerdict: string;
}

export interface CaptaincyEvMatrixCard {
  type: 'CAPTAINCY_EV_MATRIX';
  gameweek: number;
  managerId: number;
  topSafePick: {
    name: string;
    team: string;
    projectedXp: number;
    eoTop100k: number;
    rationale: string;
  };
  topDifferentialPick: {
    name: string;
    team: string;
    projectedXp: number;
    eoTop100k: number;
    leverageMultiplier: string;
    rationale: string;
  };
  candidates: CaptaincyCandidateEv[];
  bracketAnalysis: {
    rankTier: 'TOP_10K' | 'TOP_100K' | 'OVERALL';
    templateCaptain: string;
    templateRiskThreshold: string;
  };
  executiveVerdict: string;
}

export interface HorizonWeekAction {
  gameweek: number;
  availableFt: number; // 1 to 5
  actionType: 'ROLL' | 'EXECUTE_MINI_WILDCARD' | 'SINGLE_TRANSFER' | 'HOLD';
  actionSummary: string;
  ftAfterAction: number;
  hitCost: number; // 0
  projectedXp: number;
  notes: string;
}

export interface MiniWildcardSwapItem {
  outPlayer: {
    name: string;
    team: string;
    cost: number;
    position: 'GK' | 'DEF' | 'MID' | 'FWD';
    upcomingFdrAvg: number;
    reason: string;
  };
  inPlayer: {
    name: string;
    team: string;
    cost: number;
    position: 'GK' | 'DEF' | 'MID' | 'FWD';
    upcomingFdrAvg: number;
    projected5GwXp: number;
    reason: string;
  };
  costDelta: number; // in.cost - out.cost
  xpGain: number; // projected gain across upcoming GWs
}

export interface ClubFixtureSwingPivot {
  exitClub: {
    name: string;
    shortName: string;
    fdrNext3: number;
    brutalRunDescription: string;
  };
  entryClub: {
    name: string;
    shortName: string;
    fdrNext3: number;
    greenRunDescription: string;
  };
  swingRating: 'MASSIVE' | 'HIGH' | 'MODERATE';
}

export interface TransferHorizonCard {
  type: 'TRANSFER_HORIZON';
  gameweek: number;
  managerId: number;
  currentFreeTransfers: number; // 1 to 5
  targetUnlockGameweek: number; // e.g. 10 or 11
  transfersToBank: number;
  hitPointsSaved: number; // e.g. 8 or 12 pts
  totalProjectedXpGain: number;
  swingPivot: ClubFixtureSwingPivot;
  miniWildcardPackage: {
    title: string;
    requiredTransfers: number;
    totalCostDelta: number;
    bankRemaining: number;
    swaps: MiniWildcardSwapItem[];
  };
  horizonTimeline: HorizonWeekAction[];
  strategicVerdict: string;
}

export type HistoricalFixtureModifierType =
  | 'BOGEY_GROUND_CURSE'
  | 'FLAT_TRACK_BULLY'
  | 'GROUND_FORTRESS'
  | 'BALANCED_CONTEST';

export interface BogeyFixtureItem {
  fixtureId: number;
  gameweek: number;
  homeTeam: string;
  awayTeam: string;
  homeShort: string;
  awayShort: string;
  stadiumName: string;
  officialFdrHome: number;
  officialFdrAway: number;
  adjustedFdrHome: number;
  adjustedFdrAway: number;
  modifierType: HistoricalFixtureModifierType;
  badgeLabel: string; // e.g. "👻 Bogey Ground" or "🔨 Flat-Track Bully" or "🏰 Fortress"
  curseSeverity?: 'SEVERE' | 'HIGH' | 'MODERATE';
  h2hSummary: {
    last5Meetings: string;
    cleanSheetRateAway: number;
    avgGoalsConcededAway: number;
    favoredTeamWinRate: number;
  };
  tacticalFplAdvice: string;
  affectedTopAssets: string[];
  injuredStars?: string[];
}

export interface BogeyMatrixCard {
  type: 'BOGEY_GROUND_MATRIX';
  gameweek: number;
  bogeyCount: number;
  flatTrackCount: number;
  fortressCount: number;
  fixtures: BogeyFixtureItem[];
  executiveSummary: string;
}

export interface GameweekHorizonStep {
  gameweek: number;
  deadlineTime: string;
  freeTransfersAvailable: number;
  actionType: 'ROLL_FT' | 'MAKE_TRANSFERS' | 'PLAY_CHIP';
  chipToPlay?: FplChipName;
  chipLabel?: string;
  transfersPlanned: Array<{
    outPlayer: string;
    inPlayer: string;
    rationale: string;
    priceRiskAlert?: string;
  }>;
  captainCandidate: string;
  viceCaptainCandidate: string;
  projectedPoints: number;
  runningTotalXp: number;
  fixtureTrajectorySummary: string;
}

export interface HorizonPlannerCard {
  type: 'HORIZON_PLAN';
  managerId: number;
  currentGameweek: number;
  horizonEndGameweek: number;
  totalProjectedHorizonXp: number;
  steps: GameweekHorizonStep[];
  recalibrationTriggers: string[];
  planStatus: 'OPTIMAL' | 'RECALIBRATED_RECENTLY' | 'NEEDS_REVIEW';
  lastAudited: string;
  planningMode: 'AGGRESSIVE_VALUE' | 'CONSERVATIVE_SAFETY';
}

export type PriceMovementStatus =
  | 'IMMINENT_RISE' // >= 90%
  | 'LIKELY_RISE' // 60% to 89%
  | 'STABLE' // -59% to 59%
  | 'LIKELY_DROP' // -60% to -89%
  | 'IMMINENT_DROP'; // <= -90%

export interface PlayerPriceChangeDetail {
  id: number;
  code: number;
  name: string;
  team: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  currentPrice: number; // e.g. 7.7 for £7.7m
  priceChangeEvent: number; // change this GW, e.g. -0.1 or +0.1
  priceChangeSeason: number; // change since start of season
  ownershipPercent: number; // selected_by_percent
  transfersInEvent: number;
  transfersOutEvent: number;
  netTransfersEvent: number;
  changeProbabilityPct: number; // e.g. +98 for 98% chance of rise tonight, -92 for 92% chance of drop
  status: PriceMovementStatus;
  urgencyText: string; // e.g. "Dropping tonight (-£0.1m) • Sell before 01:30 UK time"
  isOwned: boolean;
  budgetImpact: string; // e.g. "-£0.1m Team Value" or "+£0.1m Purchase Cost"
}

export interface PriceChangeRadarCard {
  type: 'PRICE_CHANGE_RADAR';
  managerId: number;
  currentGameweek: number;
  lastUpdated: string;
  nextPriceChangeTime: string; // e.g. "Tonight ~01:30 UK Time"
  squadAtRiskCount: number; // count of owned players with IMMINENT_DROP or LIKELY_DROP
  targetsRisingCount: number; // count of targets with IMMINENT_RISE or LIKELY_RISE
  overnightBudgetDelta: number; // net financial impact if transfers are delayed, e.g. -0.2
  squadPlayers: PlayerPriceChangeDetail[];
  targetedPlayers: PlayerPriceChangeDetail[];
  marketTopRisers: PlayerPriceChangeDetail[];
  marketTopFallers: PlayerPriceChangeDetail[];
  budgetPreservationAdvice: string[];
}

export type AnyStructuredCard =
  | SquadAuditCard
  | WaiverCard
  | PlayerComparisonCard
  | MatchupEvaluationCard
  | WildcardStrategyCard
  | ChipRoadmapCard
  | ExpertIntelCard
  | CaptaincyEvMatrixCard
  | TransferHorizonCard
  | BogeyMatrixCard
  | HorizonPlannerCard
  | PriceChangeRadarCard;

export interface ChatResponse {
  text: string;
  structuredCard?: AnyStructuredCard;
  toolsInvoked?: string[];
  isFallbackMock?: boolean;
}
