/**
 * Official Fantasy Premier League (FPL) Rules Engine & Game Logic Constants
 * Directly parsed and compliant with the official Premier League rulebook
 * (https://fantasy.premierleague.com/en/help/rules)
 */

export interface FplScoringRule {
  action: string;
  points: number | string;
  notes?: string;
}

export interface FplBpsRule {
  action: string;
  bps: number;
}

export const FPL_OFFICIAL_RULES = {
  // 1. Squad Requirements
  squad: {
    totalPlayers: 15,
    goalkeepers: 2,
    defenders: 5,
    midfielders: 5,
    forwards: 3,
    initialBudget: 100.0, // £100m
    maxPlayersPerClub: 3,
  },

  // 2. Starting 11 & Formation Constraints
  formation: {
    totalStarters: 11,
    goalkeepers: 1, // Exactly 1 goalkeeper must start at all times
    minDefenders: 3,
    maxDefenders: 5,
    minMidfielders: 2,
    maxMidfielders: 5,
    minForwards: 1,
    maxForwards: 3,
    // All 8 legal outfield formations in official FPL
    legalFormations: [
      { name: '3-5-2', def: 3, mid: 5, fwd: 2 },
      { name: '3-4-3', def: 3, mid: 4, fwd: 3 },
      { name: '4-4-2', def: 4, mid: 4, fwd: 2 },
      { name: '4-3-3', def: 4, mid: 3, fwd: 3 },
      { name: '4-5-1', def: 4, mid: 5, fwd: 1 },
      { name: '5-3-2', def: 5, mid: 3, fwd: 2 },
      { name: '5-4-1', def: 5, mid: 4, fwd: 1 },
      { name: '5-2-3', def: 5, mid: 2, fwd: 3 },
    ] as const,
  },

  // 3. Bench & Substitution Hierarchy
  bench: {
    totalSubstitutes: 4,
    slot12Role: 'REPLACEMENT_GOALKEEPER', // Only replaces Starting GK if starter plays 0 mins
    slots13To15Role: 'OUTFIELD_SUBSTITUTES', // Ordered 1 to 3 by manager priority
    substitutionRules:
      'If your Goalkeeper does not play, replacement Goalkeeper subs in. If outfield starters play 0 minutes, highest priority outfield sub who played comes on without breaking minimum formation constraints (min 3 DEF, min 1 FWD).',
  },

  // 4. Captaincy Rules
  captaincy: {
    rule: 'Nominate a captain and vice-captain from your Starting 11 only. Captain points are doubled (tripled if Triple Captain active). If captain plays 0 mins, vice-captain points double. If neither plays, no doubling occurs.',
  },

  // 5. Transfers & Rollover
  transfers: {
    freeTransfersPerGw: 1,
    maxBankedFreeTransfers: 5, // Rollover allows storing up to 5 FTs, kept through Wildcard/Free Hit
    pointCostPerExtraTransfer: 4, // -4 pts per hit
    maxTransfersPerGwOutsideChips: 20,
    sellingPriceRule:
      'If player price rises above purchase price, manager keeps 50% of the increase rounded down to the nearest £0.1m.',
  },

  // 6. Chips (2 sets per season split at GW19 deadline)
  chips: {
    benchBoost: {
      name: 'Bench Boost',
      description: 'The points scored by all 4 bench players are added to your gameweek total.',
      quantityPerSeason: 2,
      splitDeadline: 'GW19',
    },
    tripleCaptain: {
      name: 'Triple Captain',
      description: 'Your captain points are tripled instead of doubled.',
      quantityPerSeason: 2,
      splitDeadline: 'GW19',
    },
    freeHit: {
      name: 'Free Hit',
      description: 'Make unlimited free transfers for 1 GW. Squad reverts to prior state at next deadline.',
      quantityPerSeason: 2,
      splitDeadline: 'GW19',
    },
    wildcard: {
      name: 'Wildcard',
      description: 'Make unlimited permanent transfers at no cost.',
      quantityPerSeason: 2,
      splitDeadline: 'GW19',
    },
    maxChipsPerGameweek: 1,
  },

  // 7. Official Points Scoring Table
  scoring: [
    { action: 'Playing up to 60 minutes', points: 1 },
    { action: 'Playing 60 minutes or more (excluding stoppage time)', points: 2 },
    { action: 'Goal scored by Goalkeeper', points: 10 },
    { action: 'Goal scored by Defender', points: 6 },
    { action: 'Goal scored by Midfielder', points: 5 },
    { action: 'Goal scored by Forward', points: 4 },
    { action: 'Goal assist', points: 3 },
    { action: 'Clean sheet by Goalkeeper or Defender (min 60 mins played)', points: 4 },
    { action: 'Clean sheet by Midfielder (min 60 mins played)', points: 1 },
    { action: 'Every 3 shot saves by a Goalkeeper', points: 1 },
    { action: 'Defenders: 10+ clearances, blocks, interceptions (CBI) & tackles', points: 2, notes: 'Non-stacking' },
    { action: 'Midfielders/Forwards: 12+ clearances, blocks, interceptions, tackles & recoveries', points: 2, notes: 'Non-stacking' },
    { action: 'Penalty save', points: 5 },
    { action: 'Penalty miss', points: -2 },
    { action: 'Bonus points for best players in match (BPS ranking)', points: '1 to 3' },
    { action: 'Every 2 goals conceded by Goalkeeper or Defender', points: -1 },
    { action: 'Yellow card', points: -1 },
    { action: 'Red card', points: -3 },
    { action: 'Own goal', points: -2 },
  ] as FplScoringRule[],

  // 8. Official Bonus Points System (BPS) Table
  bpsTable: [
    { action: 'Playing 1 to 60 minutes', bps: 3 },
    { action: 'Playing over 60 minutes', bps: 6 },
    { action: 'Goal scored direct from penalty', bps: 12 },
    { action: 'Goalkeeper / Defender scoring non-penalty goal', bps: 12 },
    { action: 'Midfielder scoring non-penalty goal', bps: 18 },
    { action: 'Forward scoring non-penalty goal', bps: 24 },
    { action: 'Assists', bps: 9 },
    { action: 'Goalkeepers & defenders clean sheet', bps: 12 },
    { action: 'Making a save', bps: 2 },
    { action: 'Making a save inside the box', bps: 1 },
    { action: 'Making a save from big chance', bps: 1 },
    { action: 'Saving a penalty', bps: 7 },
    { action: 'For every 3 CBI (clearances, blocks, interceptions)', bps: 1 },
    { action: 'For every 3 recoveries', bps: 1 },
    { action: 'Creating a chance', bps: 1 },
    { action: 'Creating a big chance', bps: 3 },
    { action: 'Successful open play cross', bps: 1 },
    { action: 'Successful tackle', bps: 2 },
    { action: 'Successful dribble', bps: 1 },
    { action: 'Scoring the match-winning goal', bps: 3 },
    { action: 'Goalline clearance', bps: 9 },
    { action: 'Foul won', bps: 1 },
    { action: 'Shot on target', bps: 2 },
    { action: '70% to 79% pass completion (min 30 attempts)', bps: 2 },
    { action: '80% to 89% pass completion (min 30 attempts)', bps: 4 },
    { action: '90%+ pass completion (min 30 attempts)', bps: 6 },
    { action: 'GK/DEF conceding a goal', bps: -4 },
    { action: 'Conceding a penalty', bps: -3 },
    { action: 'Missing a penalty', bps: -6 },
    { action: 'Yellow card', bps: -3 },
    { action: 'Red card', bps: -9 },
    { action: 'Own goal', bps: -6 },
    { action: 'Missing a big chance', bps: -3 },
    { action: 'Error leading to a goal', bps: -3 },
    { action: 'Error leading to attempt', bps: -1 },
    { action: 'Conceding a foul', bps: -1 },
    { action: 'Caught offside', bps: -1 },
    { action: 'Shot off target', bps: -1 },
  ] as FplBpsRule[],
};

export interface PlayerCandidateWithXp {
  id: number;
  code: number;
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  xp: number;
  status: string; // 'a', 'd', 'i', 's'
  chanceOfPlaying: number | null;
  cost?: number;
  teamShort?: string;
}

export interface OptimalFplLineupResult<T extends PlayerCandidateWithXp = PlayerCandidateWithXp> {
  formation: string; // e.g. "3-5-2"
  startingGk: T;
  startingDefs: T[];
  startingMids: T[];
  startingFwds: T[];
  starters: T[]; // Exactly 11 players (1 GK, 10 outfielders)
  benchGk: T; // Slot 12: backup goalkeeper
  benchOutfield: T[]; // Slots 13, 14, 15: outfield substitutes ordered by priority
  benchOrder: T[]; // All 4 bench players in order: [benchGk, sub1, sub2, sub3]
  captain: T; // Selected exclusively from starters
  viceCaptain: T; // Selected exclusively from starters
  totalStartingXp: number;
  startingXINames: string[];
  benchOrderNames: string[];
}

/**
 * Calculates selling price according to official FPL rule:
 * If player's price rises after purchase, manager keeps 50% of the increase rounded down to £0.1m.
 */
export function calculateFplSellingPrice(purchasePrice: number, currentPrice: number): number {
  if (currentPrice <= purchasePrice) {
    return parseFloat(currentPrice.toFixed(1));
  }
  const profit = currentPrice - purchasePrice;
  const retainedProfit = Math.floor(profit / 2 * 10) / 10;
  return parseFloat((purchasePrice + retainedProfit).toFixed(1));
}

/**
 * Pure Mathematical Constraint Solver for Official FPL Lineups
 * Strictly enforces official FPL rules:
 * - Exactly 1 Goalkeeper starts. The second Goalkeeper is placed on the bench (Slot 12).
 * - Minimum 3 Defenders, Minimum 1 Forward, Minimum 2 Midfielders.
 * - Outfield starters maximize combined Bayesian projected xP across all 8 valid formations.
 * - Bench outfield players ordered by xP descending for automatic substitutions.
 * - Captain and Vice-Captain are selected strictly from the Starting 11.
 */
export function solveOptimalFplLineup<T extends PlayerCandidateWithXp>(
  squad15: T[]
): OptimalFplLineupResult<T> {
  const gks = squad15.filter((p) => p.position === 'GK');
  const defs = squad15.filter((p) => p.position === 'DEF');
  const mids = squad15.filter((p) => p.position === 'MID');
  const fwds = squad15.filter((p) => p.position === 'FWD');

  // Sort each position by projected xP descending
  gks.sort((a, b) => b.xp - a.xp);
  defs.sort((a, b) => b.xp - a.xp);
  mids.sort((a, b) => b.xp - a.xp);
  fwds.sort((a, b) => b.xp - a.xp);

  // 1. Goalkeeper Selection:
  // Exactly ONE starting GK (highest xP), second GK is strictly bench slot 12
  const startingGk = gks[0] || squad15[0];
  const benchGk = gks[1] || gks[0];

  // 2. Solve Optimal Formation across all 8 legal FPL formation structures
  let bestFormation = '3-5-2';
  let bestXp = -Infinity;
  let bestDefs: T[] = [];
  let bestMids: T[] = [];
  let bestFwds: T[] = [];

  for (const form of FPL_OFFICIAL_RULES.formation.legalFormations) {
    // Check if squad has enough players for this formation
    if (defs.length < form.def || mids.length < form.mid || fwds.length < form.fwd) {
      continue;
    }

    const selDefs = defs.slice(0, form.def);
    const selMids = mids.slice(0, form.mid);
    const selFwds = fwds.slice(0, form.fwd);

    const outfieldXp =
      selDefs.reduce((s, p) => s + p.xp, 0) +
      selMids.reduce((s, p) => s + p.xp, 0) +
      selFwds.reduce((s, p) => s + p.xp, 0);

    if (outfieldXp > bestXp) {
      bestXp = outfieldXp;
      bestFormation = form.name;
      bestDefs = selDefs;
      bestMids = selMids;
      bestFwds = selFwds;
    }
  }

  // Fallback if squad counts were irregular: default to 3-4-3 or 4-4-2
  if (bestDefs.length === 0) {
    bestDefs = defs.slice(0, Math.min(3, defs.length));
    bestMids = mids.slice(0, Math.min(4, mids.length));
    bestFwds = fwds.slice(0, Math.min(3, fwds.length));
    bestFormation = `${bestDefs.length}-${bestMids.length}-${bestFwds.length}`;
  }

  // 3. Assemble Starting XI (Exactly 11 players)
  const starters: T[] = [startingGk, ...bestDefs, ...bestMids, ...bestFwds];

  // 4. Determine Bench Order
  // Slot 12: Replacement Goalkeeper (benchGk)
  // Slots 13, 14, 15: Outfield substitutes ordered by projected xP descending
  const starterIds = new Set(starters.map((p) => p.id));
  const benchedOutfield = squad15.filter(
    (p) => p.position !== 'GK' && !starterIds.has(p.id)
  );
  benchedOutfield.sort((a, b) => b.xp - a.xp);

  const benchOrder: T[] = [benchGk, ...benchedOutfield];

  // 5. Captain and Vice-Captain Selection
  // Official rule: Must be nominated from the starting 11 players only
  const fitStarters = starters.filter(
    (p) => p.status === 'a' && (p.chanceOfPlaying === null || p.chanceOfPlaying >= 75) && p.xp > 0
  );
  const eligibleStarters = fitStarters.length >= 2 ? fitStarters : starters;
  const sortedEligible = [...eligibleStarters].sort((a, b) => b.xp - a.xp);

  const captain = sortedEligible[0] || starters[0];
  const viceCaptain = sortedEligible[1] || starters[1] || starters[0];

  const totalStartingXp = parseFloat((startingGk.xp + bestXp).toFixed(2));

  return {
    formation: bestFormation,
    startingGk,
    startingDefs: bestDefs,
    startingMids: bestMids,
    startingFwds: bestFwds,
    starters,
    benchGk,
    benchOutfield: benchedOutfield,
    benchOrder,
    captain,
    viceCaptain,
    totalStartingXp,
    startingXINames: starters.map((p) => p.name),
    benchOrderNames: benchOrder.map((p) => p.name),
  };
}
