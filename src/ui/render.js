// Builds the render context and paints the card grid.

import { $, el } from '../core/dom.js';
import { onRebuild, onRefresh } from '../core/signal.js';
import { applyOverrides } from '../data/classify.js';
import { S, recalcFallbacks } from '../data/state.js';
import { filmAgg, isHours, overview, seriesAgg, view } from '../data/stats.js';
import { CARDS } from './cards/index.js';
import { REDRAWABLE } from './charts.js';
import { renderChips, updateBrand, updateMetaStatus } from './chrome.js';
import { confBadge } from './components.js';

/** Cards whose numbers never depend on the hours/titles measure. */
export const NO_CONF = new Set(['firsts', 'streaks', 'rewatch', 'firstOfYear', 'decades', 'scores',
  'releaseYears', 'runtimeHist', 'lag', 'filmTable', 'completion', 'abandoned', 'fastest', 'newShows']);

export function render() {
  if (!S.rows.length) return;
  const rows = view();
  const ctx = { rows, ov: overview(rows), series: seriesAgg(rows), films: filmAgg(rows) };

  updateBrand();
  updateMetaStatus();
  renderChips();

  const grid = $('#grid');
  REDRAWABLE.clear();
  grid.replaceChildren();

  const list = CARDS.filter(d => d.tab === S.tab && S.cards[d.id] !== false);
  if (!list.length) {
    grid.append(el('div', { class: 'card w12' }, el('div', { class: 'empty', text: 'Every card on this tab is hidden. Use ▦ in the header to bring them back.' })));
    return;
  }
  for (const def of list) grid.append(renderCard(def, ctx));
}

export function renderCard(def, ctx) {
  let body;
  try { body = def.build(ctx); }
  catch (err) {
    console.error('card ' + def.id, err);
    body = el('div', { class: 'empty', text: 'Could not render this card: ' + err.message });
  }
  if (def.bare) {
    const w = el('div', { class: 'card w' + def.w, style: { padding: 0, background: 'none', border: 'none' } });
    w.append(body);
    return w;
  }
  return el('div', { class: 'card w' + def.w },
    el('div', { class: 'card-h' },
      el('h3', { text: def.title }),
      isHours() && def.tab !== 'data' && !NO_CONF.has(def.id) ? confBadge(ctx.rows) : null,
      def.note ? el('span', { class: 'note', text: def.note }) : null),
    body);
}

/** Recompute derived data (after overrides or new metadata), then render. */
export function rebuild() {
  applyOverrides(S.rows, S.overrides);
  recalcFallbacks();
  render();
}

onRefresh(render);
onRebuild(rebuild);
