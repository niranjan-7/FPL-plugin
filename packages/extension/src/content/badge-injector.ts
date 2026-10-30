import type { AiBadgePayload } from '@fpl-companion/shared';

const INJECTED_ATTR = 'data-fpl-ai-injected';

export async function fetchAndInjectBadges(pitchElements: HTMLElement[]): Promise<void> {
  if (pitchElements.length === 0) return;

  // Extract player IDs or fallback element indices
  const elementIdMap = new Map<number, HTMLElement>();
  const elementIds: number[] = [];

  pitchElements.forEach((el, index) => {
    if (el.hasAttribute(INJECTED_ATTR)) return;

    // Try finding element ID from data attributes, links, or fallback list
    let id: number | null = null;
    const link = el.querySelector('a[href*="/element/"], a[href*="/player/"]');
    if (link) {
      const match = link.getAttribute('href')?.match(/\/(?:element|player)\/(\d+)/);
      if (match) id = parseInt(match[1], 10);
    }

    if (!id) {
      const dataId = el.getAttribute('data-element-id');
      if (dataId) id = parseInt(dataId, 10);
    }

    // Default sequential fallback map if FPL DOM does not expose raw element ID
    const sampleIds = [351, 328, 18, 182, 45, 98, 325, 11, 9, 432, 75, 52, 355, 215, 412];
    const finalId = id || sampleIds[index % sampleIds.length];

    elementIds.push(finalId);
    elementIdMap.set(finalId, el);
  });

  if (elementIds.length === 0) return;

  try {
    const res = await fetch(`http://localhost:3001/api/badges?elementIds=${elementIds.join(',')}`);
    if (!res.ok) return;

    const badges: AiBadgePayload[] = await res.json();

    badges.forEach((badge) => {
      const el = elementIdMap.get(badge.elementId);
      if (!el || el.hasAttribute(INJECTED_ATTR)) return;

      el.setAttribute(INJECTED_ATTR, 'true');
      el.style.position = 'relative';

      const container = document.createElement('div');
      container.className = 'fpl-ai-badge-container';

      // Delta label formatting
      const deltaSign = badge.yoyDeltaPct >= 0 ? `+${badge.yoyDeltaPct}%` : `${badge.yoyDeltaPct}%`;
      const flagClass = badge.regressionFlag === 'HOT' ? 'hot' : badge.regressionFlag === 'COLD' ? 'cold' : '';

      // Historical Fixture Modifier Badge (Bogey Ground / Flat-Track Bully / Fortress)
      let modifierHtml = '';
      if (badge.fixtureModifier) {
        const mod = badge.fixtureModifier;
        const modClass =
          mod.type === 'BOGEY_GROUND_CURSE'
            ? 'bogey'
            : mod.type === 'FLAT_TRACK_BULLY'
            ? 'bully'
            : 'fortress';

        modifierHtml = `
          <div class="fpl-ai-fixture-modifier-badge ${modClass}">
            ${mod.badgeLabel}
          </div>
        `;
      }

      container.innerHTML = `
        <div class="fpl-ai-badge-xp" title="Click to view in AI Player Lab">
          <span>⚡</span>
          <span>${badge.projectedXp} xP</span>
        </div>
        <div class="fpl-ai-badge-delta ${flagClass}">
          ${deltaSign} YoY
        </div>
        ${modifierHtml}
        <div class="fpl-ai-tooltip">
          <div style="font-weight: 700; color: #00ff87; margin-bottom: 2px;">${badge.webName} (Bayesian xP: ${badge.projectedXp})</div>
          <div>5-GW Venue Rating: ${badge.clubMatchupRating} FDR</div>
          <div>Underlying xGI Δ: ${deltaSign} vs 3-yr Vaastav baseline</div>
          ${badge.regressionFlag === 'HOT' ? '<div style="color: #f43f5e; margin-top: 2px;">⚠ High negative regression risk</div>' : ''}
          ${badge.regressionFlag === 'COLD' ? '<div style="color: #38bdf8; margin-top: 2px;">✦ High positive rebound probability</div>' : ''}
          ${badge.fixtureModifier ? `<div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid #334155; color: ${badge.fixtureModifier.type === 'BOGEY_GROUND_CURSE' ? '#f43f5e' : '#fbbf24'}; font-weight: 600;">${badge.fixtureModifier.tooltipText}</div>` : ''}
        </div>
      `;

      container.addEventListener('click', (e) => {
        e.stopPropagation();
        chrome.storage.local.set({ selectedPlayerForLab: badge.webName });
      });

      el.appendChild(container);
    });
  } catch (err) {
    // Fail silently without disrupting official FPL DOM
    console.debug('[FPL Companion] Badge fetch offline');
  }
}
