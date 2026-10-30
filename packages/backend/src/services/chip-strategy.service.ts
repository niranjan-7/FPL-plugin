import type {
  ChipRoadmapCard,
  UserChipStatus,
  ChipStrategyPlan,
  FplChipName,
} from '@fpl-companion/shared';
import { fplService } from './fpl-live.service.js';
import { config } from '../config.js';

export class ChipStrategyService {
  private static instance: ChipStrategyService;

  public static getInstance(): ChipStrategyService {
    if (!ChipStrategyService.instance) {
      ChipStrategyService.instance = new ChipStrategyService();
    }
    return ChipStrategyService.instance;
  }

  public async generateChipRoadmap(
    managerId: number,
    onScreenChips?: Record<string, 'AVAILABLE' | 'PLAYED'>,
    playerNames?: string[]
  ): Promise<ChipRoadmapCard> {
    const currentGw = await fplService.getCurrentGameweek();

    // 1. Resolve chip status: prefer live on-screen DOM detection.
    // NEVER query external history for fallback/demo ID 481920!
    const chipsStatusMap: Record<FplChipName, { status: 'AVAILABLE' | 'PLAYED'; playedGw?: number }> = {
      wildcard: { status: 'AVAILABLE' },
      freehit: { status: 'AVAILABLE' },
      '3xc': { status: 'AVAILABLE' },
      bboost: { status: 'AVAILABLE' },
    };

    // If on-screen chips were detected by extension content script
    if (onScreenChips && Object.keys(onScreenChips).length > 0) {
      if (onScreenChips.wildcard) chipsStatusMap.wildcard = { status: onScreenChips.wildcard };
      if (onScreenChips.freehit) chipsStatusMap.freehit = { status: onScreenChips.freehit };
      if (onScreenChips['3xc']) chipsStatusMap['3xc'] = { status: onScreenChips['3xc'] };
      if (onScreenChips.bboost) chipsStatusMap.bboost = { status: onScreenChips.bboost };
    } else if (managerId && managerId !== 481920 && managerId > 0) {
      // Query entry history ONLY if it is a verified custom manager ID (not 481920)
      try {
        const res = await fetch(`${config.fplBaseUrl}/entry/${managerId}/history/`, {
          headers: { 'User-Agent': 'Mozilla/5.0 FPL-AI-Companion/1.0' },
        });
        if (res.ok) {
          const data: any = await res.json();
          if (Array.isArray(data.chips)) {
            for (const c of data.chips) {
              const chipName = c.name as FplChipName;
              if (chipsStatusMap[chipName]) {
                chipsStatusMap[chipName] = { status: 'PLAYED', playedGw: c.event };
              }
            }
          }
        }
      } catch (err) {
        console.debug('[ChipStrategyService] History fetch offline; defaulting to available');
      }
    }

    const set1Chips: UserChipStatus[] = [
      {
        name: 'wildcard',
        label: 'Wildcard (Set 1)',
        status: chipsStatusMap.wildcard.status,
        playedGameweek: chipsStatusMap.wildcard.playedGw,
      },
      {
        name: 'freehit',
        label: 'Free Hit (Set 1)',
        status: chipsStatusMap.freehit.status,
        playedGameweek: chipsStatusMap.freehit.playedGw,
      },
      {
        name: '3xc',
        label: 'Triple Captain (Set 1)',
        status: chipsStatusMap['3xc'].status,
        playedGameweek: chipsStatusMap['3xc'].playedGw,
      },
      {
        name: 'bboost',
        label: 'Bench Boost (Set 1)',
        status: chipsStatusMap.bboost.status,
        playedGameweek: chipsStatusMap.bboost.playedGw,
      },
    ];

    const set2Chips: UserChipStatus[] = [
      {
        name: 'wildcard',
        label: 'Wildcard (Set 2)',
        status: 'AVAILABLE',
      },
      {
        name: 'freehit',
        label: 'Free Hit (Set 2)',
        status: 'AVAILABLE',
      },
      {
        name: '3xc',
        label: 'Triple Captain (Set 2)',
        status: 'AVAILABLE',
      },
      {
        name: 'bboost',
        label: 'Bench Boost (Set 2)',
        status: 'AVAILABLE',
      },
    ];

    const chipsStatus = set1Chips;

    // 2. Build Gameweek-by-Gameweek Strategy Roadmap
    const seasonRoadmap: ChipStrategyPlan[] = [];

    // --- WILDCARD 1 ---
    if (chipsStatusMap.wildcard.status === 'AVAILABLE') {
      seasonRoadmap.push({
        chip: 'wildcard',
        label: 'Wildcard (1st Half)',
        targetWindow: 'Gameweek 12 (Target Window: GW10 - GW12)',
        status: 'AVAILABLE',
        priority: 'CRITICAL',
        expectedGainXp: 26.5,
        tacticalRationale:
          'Major fixture swing window. Arsenal and Man City enter sustained favorable schedules, while Chelsea and Villa face tough fixture cliffs. Note: 1st Wildcard EXPIRES at Gameweek 19 (Dec 30 deadline)—you must play it before then or lose it.',
        howToExecute: [
          'Bank 1-2 free transfers in GW10-11 to keep flexibility.',
          'Activate on the Monday of GW12 international break to catch positive price rises across 14 days.',
          'Lock in 3 Arsenal assets (Gabriel, Raya, Saka) and Haaland for their prime winter fixture run.',
        ],
        primeTargets: ['Haaland (MCI)', 'Gabriel (ARS)', 'Palmer (CHE)', 'Raya (ARS)', 'Tavernier (BOU)'],
      });
    } else {
      seasonRoadmap.push({
        chip: 'wildcard',
        label: 'Wildcard (1st Half)',
        targetWindow: `Played in GW${chipsStatusMap.wildcard.playedGw || 2}`,
        status: 'PLAYED',
        priority: 'MEDIUM',
        expectedGainXp: 0,
        tacticalRationale: `Already activated in GW${chipsStatusMap.wildcard.playedGw || 2}. Your 2nd Wildcard unlocks automatically in Gameweek 20 after the winter transfer window.`,
        howToExecute: [
          'Manage squad using free transfers and occasional -4 hits until Gameweek 20.',
          'Reserve Wildcard 2 specifically to set up your Bench Boost in Double Gameweek 34/37.',
        ],
        primeTargets: [],
      });
    }

    // --- TRIPLE CAPTAIN ---
    if (chipsStatusMap['3xc'].status === 'AVAILABLE') {
      seasonRoadmap.push({
        chip: '3xc',
        label: 'Triple Captain',
        targetWindow: 'Double Gameweek 25 or 34 (Confirmed Premier League DGW)',
        status: 'AVAILABLE',
        priority: 'HIGH',
        expectedGainXp: 31.0,
        tacticalRationale:
          'Triple Captain scores 3x points across BOTH matches in a Double Gameweek (180 projected minutes). Historic return rate for premium talismans in DGWs averages 18-24 base points, generating 54-72 total points from your captain slot.',
        howToExecute: [
          'Do NOT play on a single gameweek fixture unless Haaland has Southampton/Ipswich at home with zero rotation risk.',
          'Wait for official Premier League fixture rescheduling announcement in January (following Carabao Cup & FA Cup ties).',
          'Verify penalty duties and injury clearance before deadline.',
        ],
        primeTargets: ['Haaland (MCI in DGW)', 'Palmer (CHE in DGW)', 'Saka (ARS in DGW)', 'Isak (LIV in DGW)'],
      });
    } else {
      seasonRoadmap.push({
        chip: '3xc',
        label: 'Triple Captain',
        targetWindow: `Played in GW${chipsStatusMap['3xc'].playedGw || 3}`,
        status: 'PLAYED',
        priority: 'MEDIUM',
        expectedGainXp: 0,
        tacticalRationale: `Triple Captain already deployed in GW${chipsStatusMap['3xc'].playedGw || 3}. Focus turns to maximizing Double Gameweeks with Bench Boost and Free Hit.`,
        howToExecute: ['Rely on standard 2x captaincy optimization using Bayesian xP fixture models.'],
        primeTargets: [],
      });
    }

    // --- FREE HIT ---
    if (chipsStatusMap.freehit.status === 'AVAILABLE') {
      seasonRoadmap.push({
        chip: 'freehit',
        label: 'Free Hit',
        targetWindow: 'Blank Gameweek 29 (FA Cup Quarterfinals Weekend)',
        status: 'AVAILABLE',
        priority: 'HIGH',
        expectedGainXp: 34.5,
        tacticalRationale:
          'FA Cup Quarterfinals cause 5 to 7 Premier League matches to be postponed. Most rival managers will only have 4-6 active players. Playing Free Hit lets you field a full 11 with top assets for one week, before your regular squad automatically returns in GW30 with zero hits taken.',
        howToExecute: [
          'Do NOT waste regular free transfers in GW26-28 trying to buy players who have fixtures in BGW29.',
          'Keep your core long-term squad untouched.',
          'Activate Free Hit on the Saturday morning of BGW29 and target the top 11 active players playing that weekend.',
        ],
        primeTargets: ['Active Talismans playing in BGW29', 'Target penalty takers and clean sheet favorites for that weekend'],
      });
    } else {
      seasonRoadmap.push({
        chip: 'freehit',
        label: 'Free Hit',
        targetWindow: `Played in GW${chipsStatusMap.freehit.playedGw || 4}`,
        status: 'PLAYED',
        priority: 'MEDIUM',
        expectedGainXp: 0,
        tacticalRationale: `Free Hit already played in GW${chipsStatusMap.freehit.playedGw || 4}. You must plan ahead for Blank Gameweek 29 by slowly rolling transfers 2-3 weeks in advance.`,
        howToExecute: [
          'Start saving 2 free transfers in GW27-28.',
          'Aim to field 9-10 active players in BGW29 without taking more than a -4 hit.',
        ],
        primeTargets: [],
      });
    }

    // --- BENCH BOOST ---
    if (chipsStatusMap.bboost.status === 'AVAILABLE') {
      seasonRoadmap.push({
        chip: 'bboost',
        label: 'Bench Boost',
        targetWindow: 'Double Gameweek 34 or 37 (Mega Double Gameweek)',
        status: 'AVAILABLE',
        priority: 'CRITICAL',
        expectedGainXp: 38.0,
        tacticalRationale:
          'Bench Boost counts points from all 4 bench players. When played during a massive Double Gameweek, all 15 squad members play twice—giving you up to 30 player-fixtures in a single gameweek!',
        howToExecute: [
          'THE GOLDEN COMBO: Play your 2nd Wildcard in the gameweek directly BEFORE (e.g. WC in GW33).',
          'Use that Wildcard to purchase 15 guaranteed Double Gameweek starters (two playing £4.5m GKs, nailed budget defenders).',
          'Activate Bench Boost the very next week (GW34) to harvest maximum points from all 15 players.',
        ],
        primeTargets: ['Two starting £4.5m GKs with DGW', 'Nailed £4.0-£4.5m DEFs with double fixtures', 'Mid-priced talisman starters'],
      });
    } else {
      seasonRoadmap.push({
        chip: 'bboost',
        label: 'Bench Boost',
        targetWindow: `Played in GW${chipsStatusMap.bboost.playedGw || 8}`,
        status: 'PLAYED',
        priority: 'MEDIUM',
        expectedGainXp: 0,
        tacticalRationale: `Bench Boost already deployed in GW${chipsStatusMap.bboost.playedGw || 8}. You no longer need to spend budget on expensive bench players—maximize your Starting XI.`,
        howToExecute: [
          'Downgrade bench players to absolute minimum price (£4.0m DEF, £4.5m MID) to funnel maximum funds into premium starters.',
        ],
        primeTargets: [],
      });
    }

    const availableCount = set1Chips.filter((c) => c.status === 'AVAILABLE').length;
    const immediateAction =
      currentGw <= 19
        ? `You have ${availableCount} Set 1 chips available (Wildcard, Free Hit, Triple Captain, Bench Boost). ⚠️ CRITICAL RULE: All Set 1 chips EXPIRE at Gameweek 19 (Dec 30 deadline) and do NOT carry over to January! Recommended: Target Set 1 Wildcard in GW10–12 to navigate fixture swings, and Set 1 Triple Captain on an elite home fixture before Christmas.`
        : `You are in Set 2 (GW20–38). Fresh chip set unlocked! Your primary target is the spring Double Gameweek season (GW25, GW34, GW37) with Triple Captain and Bench Boost, plus Free Hit in BGW29.`;

    const set1DeadlineNotice =
      currentGw <= 19
        ? `⚠️ Hard Deadline: Set 1 chips expire at Gameweek 19 deadline (${19 - currentGw} Gameweeks remaining). Any unplayed Set 1 chip is permanently forfeited and will NOT roll over into January!`
        : `Set 1 has concluded. Set 2 chips are active through Gameweek 38.`;

    return {
      type: 'CHIP_ROADMAP',
      managerId,
      currentGameweek: currentGw,
      chipsStatus,
      set1Chips,
      set2Chips,
      set1DeadlineNotice,
      seasonRoadmap,
      immediateAction,
    };
  }
}

export const chipStrategyService = ChipStrategyService.getInstance();
