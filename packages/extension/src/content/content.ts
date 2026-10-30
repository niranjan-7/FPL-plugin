import type { PageContext, ScrapedSquadPlayer, ScrapedMarketTarget } from '@fpl-companion/shared';
import { fetchAndInjectBadges } from './badge-injector.js';
import './content.css';

console.log('[FPL Companion] Content script active on:', window.location.href);

function extractOnScreenPitchDetails(): { names: string[]; detailed: ScrapedSquadPlayer[] } {
  const names: string[] = [];
  const detailed: ScrapedSquadPlayer[] = [];
  // Match fixture patterns e.g. LIV (A), CRY (H), LEE (H), TOT (A), BHA (H)
  const FIXTURE_REGEX = /\b[A-Z]{2,4}\s*\([HA]\)/;

  // Exclude player list table/sidebar (the 563-player marketplace list on the transfers page)
  const isExcluded = (el: HTMLElement): boolean => {
    return !!el.closest('table, tbody, [class*="PlayerList"], [class*="TransferList"], [class*="Search"], [class*="Sidebar"], [class*="Table"]');
  };

  // Find all elements containing fixture badges (e.g. "LIV (A)", "CRY (H)")
  const allElements = Array.from(document.querySelectorAll<HTMLElement>('div, button, li, a'))
    .filter((el) => !isExcluded(el));

  // Find leaf/near-leaf elements that directly contain exactly 1 fixture badge
  const pitchUnits = allElements.filter((el) => {
    const text = el.innerText || '';
    if (!FIXTURE_REGEX.test(text)) return false;
    const count = (text.match(new RegExp(FIXTURE_REGEX.source, 'g')) || []).length;
    return count === 1;
  });

  pitchUnits.forEach((el) => {
    const text = el.innerText || '';
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // If the next line has the fixture badge like LIV (A), this line is the player name!
      if (i + 1 < lines.length && FIXTURE_REGEX.test(lines[i + 1])) {
        let name = line
          .replace(/^[×!ℹ⚠️\s]+/, '')
          .replace(/£\d+(\.\d+)?m?/g, '')
          .replace(/[!ℹ⚠️\s]+$/, '')
          .trim();

        if (name && name.length >= 2 && !names.includes(name) && names.length < 15) {
          names.push(name);

          // Extract live price e.g. £6.1m
          const priceMatch = text.match(/£(\d+(?:\.\d+)?)m?/i);
          const currentPrice = priceMatch ? parseFloat(priceMatch[1]) : undefined;

          // Extract fixture badge e.g. LIV (A)
          const fixtureMatch = text.match(FIXTURE_REGEX);
          const fixture = fixtureMatch ? fixtureMatch[0] : undefined;

          // Extract injury/doubt flag
          const hasFlag = /[!⚠️]/.test(text) || !!el.querySelector('[class*="flag"], [class*="status"], [class*="alert"], [class*="Injury"], [class*="Warning"], [title*="injury"], [title*="doubt"]');

          detailed.push({
            name,
            currentPrice,
            fixture,
            hasFlag,
          });
          break;
        }
      }
    }
  });

  return { names, detailed };
}

function extractOnScreenMarketTargets(): ScrapedMarketTarget[] {
  const targets: ScrapedMarketTarget[] = [];
  const POSITIONS = ['GKP', 'GK', 'DEF', 'MID', 'FWD'];
  const TEAMS = [
    'Arsenal', 'Aston Villa', 'Bournemouth', 'Brentford', 'Brighton', 'Chelsea',
    'Crystal Palace', 'Everton', 'Fulham', 'Ipswich', 'Leicester', 'Liverpool',
    'Man City', 'Man Utd', 'Newcastle', "Nott'm Forest", 'Southampton', 'Spurs',
    'West Ham', 'Wolves', 'Hull City', 'Leeds'
  ];

  // Look for visible player rows in sidebar / marketplace table
  const playerRows = Array.from(document.querySelectorAll<HTMLElement>(
    'tr, [role="row"], div[class*="PlayerRow"], div[class*="ElementRow"], div[class*="Media__Body"], button[class*="ElementRow"]'
  ));

  for (const row of playerRows) {
    const text = row.innerText || '';
    if (!text.includes('£')) continue;

    const priceMatch = text.match(/£(\d+(?:\.\d+)?)m?/i);
    if (!priceMatch) continue;
    const price = parseFloat(priceMatch[1]);

    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    let name = '';
    let team = '';
    let position = '';
    let totalPoints: number | undefined;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const posFound = POSITIONS.find((p) => new RegExp(`\\b${p}\\b`, 'i').test(line));
      const teamFound = TEAMS.find((t) => new RegExp(`\\b${t}\\b`, 'i').test(line));

      if (posFound || teamFound) {
        position = posFound ? (posFound === 'GKP' ? 'GK' : posFound) : '';
        team = teamFound || '';
        if (i > 0) {
          const candidate = lines[i - 1].replace(/^[×!ℹ⚠️\s]+/, '').replace(/[!ℹ⚠️\s]+$/, '').trim();
          if (candidate.length >= 2 && !candidate.startsWith('£') && !/^\d+$/.test(candidate)) {
            name = candidate;
          }
        }
      }

      const tpMatch = line.match(/\bTP\s*:?\s*(\d+)\b/i) || (/^\d{1,3}$/.test(line) ? line.match(/^(\d{1,3})$/) : null);
      if (tpMatch && !totalPoints && parseInt(tpMatch[1], 10) !== Math.round(price * 10)) {
        totalPoints = parseInt(tpMatch[1], 10);
      }
    }

    if (!name) {
      for (const line of lines) {
        const clean = line.replace(/^[×!ℹ⚠️\s]+/, '').replace(/[!ℹ⚠️\s]+$/, '').trim();
        if (clean.length >= 2 && !clean.includes('£') && !TEAMS.includes(clean) && !POSITIONS.includes(clean) && !/^\d+$/.test(clean)) {
          name = clean;
          break;
        }
      }
    }

    if (name && name.length >= 2 && !targets.some((t) => t.name === name) && targets.length < 30) {
      const hasFlag = /[!⚠️]/.test(text) || !!row.querySelector('[class*="flag"], [class*="status"], [class*="alert"], [class*="Injury"], [class*="Warning"], [title*="injury"], [title*="doubt"]');
      targets.push({
        name,
        team: team || undefined,
        position: position || undefined,
        currentPrice: price,
        totalPoints,
        hasFlag,
      });
    }
  }

  return targets;
}

function detectOnScreenChips(): Record<string, 'AVAILABLE' | 'PLAYED'> {
  const chips: Record<string, 'AVAILABLE' | 'PLAYED'> = {};
  const text = document.body.innerText || '';

  if (/Wildcard\s*Play/i.test(text)) {
    chips.wildcard = 'AVAILABLE';
  } else if (/Wildcard\s*Played/i.test(text)) {
    chips.wildcard = 'PLAYED';
  }

  if (/Free\s*Hit\s*Play/i.test(text)) {
    chips.freehit = 'AVAILABLE';
  } else if (/Free\s*Hit\s*Played/i.test(text)) {
    chips.freehit = 'PLAYED';
  }

  if (/Triple\s*Captain\s*Play/i.test(text)) {
    chips['3xc'] = 'AVAILABLE';
  } else if (/Triple\s*Captain\s*Played/i.test(text)) {
    chips['3xc'] = 'PLAYED';
  }

  if (/Bench\s*Boost\s*Play/i.test(text)) {
    chips.bboost = 'AVAILABLE';
  } else if (/Bench\s*Boost\s*Played/i.test(text)) {
    chips.bboost = 'PLAYED';
  }

  return chips;
}

function detectPageContext(): PageContext {
  const url = window.location.href;
  const mode = 'classic';

  let managerId: number | null = null;

  // Extract Classic manager ID from URL patterns e.g. /entry/481920/event/10
  const classicMatch = url.match(/\/entry\/(\d+)/);
  if (classicMatch) {
    managerId = parseInt(classicMatch[1], 10);
  } else {
    // Try discovering manager ID from navigation links (e.g. Points tab links to /entry/<id>/event/<gw>)
    const entryLinks = document.querySelectorAll<HTMLAnchorElement>('a[href*="/entry/"]');
    for (const link of Array.from(entryLinks)) {
      const href = link.getAttribute('href') || '';
      const m = href.match(/\/entry\/(\d+)/);
      if (m && m[1]) {
        managerId = parseInt(m[1], 10);
        break;
      }
    }
  }

  // Extract active gameweek from URL e.g. /event/9 or on-screen text "Gameweek 9"
  let activeGameweek = 9;
  const gwMatch = url.match(/\/event\/(\d+)/);
  if (gwMatch) {
    activeGameweek = parseInt(gwMatch[1], 10);
  } else {
    const textGwMatch = (document.body.innerText || '').match(/Gameweek\s*(\d+)/i);
    if (textGwMatch) {
      activeGameweek = parseInt(textGwMatch[1], 10);
    }
  }

  // Scrape live financial numbers and transfer count from DOM
  let bankBalance = 0.5;
  let squadVal = 100.0;
  let totalBudget = 100.5;
  let freeTransfers = 1;
  try {
    const textContent = document.body.innerText;
    const bankMatch = textContent.match(/In the bank\s*£?([\d.]+)m?/i) || textContent.match(/Budget\s*£?([\d.]+)m?/i);
    if (bankMatch) {
      bankBalance = parseFloat(bankMatch[1]);
    }
    const squadMatch = textContent.match(/Squad value\s*£?([\d.]+)m?/i);
    if (squadMatch) {
      squadVal = parseFloat(squadMatch[1]);
    }
    totalBudget = parseFloat((squadVal + bankBalance).toFixed(1));
    (window as any).__FPL_TOTAL_BUDGET__ = totalBudget;

    // 1. Precise DOM search for Free Transfers element
    const allTextNodes = document.querySelectorAll('div, span, p, h2, h3');
    let foundFt = false;
    for (const el of allTextNodes) {
      const text = el.textContent?.trim() || '';
      if (/^Free transfers?$/i.test(text) || /^Transfers?\s*left$/i.test(text)) {
        const parent = el.parentElement;
        if (parent) {
          const numMatch = parent.textContent?.match(/(\d+)/);
          if (numMatch) {
            freeTransfers = Math.min(5, Math.max(0, parseInt(numMatch[1], 10)));
            foundFt = true;
            break;
          }
        }
      }
    }

    // 2. Regex fallbacks across full text (handling number before or after "Free transfers")
    if (!foundFt) {
      const ftMatch =
        textContent.match(/(?:^|\n|\s)(\d+)\s*(?:\n|\s)*Free transfers?/i) ||
        textContent.match(/Free transfers?\s*(?:\n|\s)*:?\s*(\d+)/i) ||
        textContent.match(/(\d+)\s*transfers?\s*left/i);
      if (ftMatch) {
        const val = parseInt(ftMatch[1] || ftMatch[2], 10);
        if (!isNaN(val)) {
          freeTransfers = Math.min(5, Math.max(0, val));
        }
      }
    }
  } catch (err) {
    // ignore
  }

  const { names: onScreenPlayerNames, detailed: squadPlayersDetailed } = extractOnScreenPitchDetails();
  const targetPlayersDetailed = extractOnScreenMarketTargets();

  return {
    mode,
    url,
    managerId: managerId || 481920,
    activeGameweek,
    bankBalance,
    squadValue: squadVal,
    totalBudget,
    freeTransfers,
    onScreenPlayerNames,
    squadPlayersDetailed,
    targetPlayersDetailed,
    chipsStatus: detectOnScreenChips(),
  };
}

function syncStateWithBackground(): void {
  const context = detectPageContext();
  try {
    chrome.runtime.sendMessage({
      action: 'PAGE_STATE_UPDATED',
      payload: context,
    });
  } catch (err) {
    console.debug('[FPL Companion] Message send offline');
  }
}

// Find pitch and transfer elements to inject AI badges
function scanAndInjectPitchElements(): void {
  // Common FPL CSS class selectors for pitch players across responsive views
  const selectors = [
    '[data-testid="pitch-element"]',
    'div[class*="PitchElement-sc"]',
    'div[class*="PitchUnit"]',
    'div[class*="ElementPitch"]',
    'button[class*="PitchElement"]',
    'div[class*="PitchRow"] > div',
  ];

  const matched = document.querySelectorAll<HTMLElement>(selectors.join(', '));
  if (matched.length > 0) {
    fetchAndInjectBadges(Array.from(matched));
  }
}

// Debounce runner
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
function handleDomMutation(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    syncStateWithBackground();
    scanAndInjectPitchElements();
  }, 400);
}

// Initial scan
handleDomMutation();

// Observe SPA view changes & player roster updates
const observer = new MutationObserver(handleDomMutation);
observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// Listen for pushState/popstate navigation in SPA
window.addEventListener('popstate', handleDomMutation);

// Respond to on-demand state requests from SidePanel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GET_PAGE_STATE') {
    const context = detectPageContext();
    sendResponse(context);
    return true;
  }
});
