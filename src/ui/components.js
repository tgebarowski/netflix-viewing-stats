// Reusable card building blocks: stat lists, sortable tables, badges.

import { el } from '../core/dom.js';
import { flag, nfmt } from '../core/format.js';
import { requestRefresh } from '../core/signal.js';
import { S, coverage } from '../data/state.js';
import { openPanel } from './panels.js';
import { render } from './render.js';

export const kpi = (v, l, d) => el('div', { class: 'kpi' },
  el('div', { class: 'v', html: v }), el('div', { class: 'l', text: l }),
  d ? el('div', { class: 'd', html: d }) : null);

/** Two-column label/value list. */
export const statList = pairs => el('table', { class: 't' }, el('tbody', {},
  pairs.filter(Boolean).map(([k, v, sub]) => el('tr', {},
    el('td', { class: 'dim', style: { whiteSpace: 'nowrap' } }, k),
    el('td', { class: 'n', style: { fontWeight: 600 } },
      el('div', { html: v }), sub ? el('div', { class: 'dim', style: { fontWeight: 400, fontSize: '11.5px' }, html: sub }) : null)))));

export const bigStat = (v, sub) => el('div', {},
  el('div', { class: 'big', html: v }), sub ? el('div', { class: 'dim', style: { marginTop: '4px' }, html: sub }) : null);

/** Sortable table. cols: [{h, n?, get, cell?, w?}]. `tall` caps height and scrolls. */
export function sortTable(cols, rows, opts = {}) {
  const state = { i: opts.sort != null ? opts.sort : 0, dir: 1 };   // 1 = descending
  const wrap = el('div', { class: 'tw' + (opts.tall ? ' tall' : '') });
  const render = () => {
    const c = cols[state.i];
    const sorted = [...rows].sort((a, b) => {
      const x = c.get(a), y = c.get(b);
      if (x == null) return 1; if (y == null) return -1;
      return x < y ? state.dir : x > y ? -state.dir : 0;
    }).slice(0, opts.limit || 500);
    wrap.replaceChildren(el('table', { class: 't' },
      el('thead', {}, el('tr', {}, cols.map((col, i) => el('th', {
        class: (col.n ? 'n ' : '') + 'sortable',
        onclick: () => { if (state.i === i) state.dir *= -1; else { state.i = i; state.dir = -1; } render(); },
      }, col.h, state.i === i ? el('span', { class: 'ar', text: state.dir === 1 ? ' ▼' : ' ▲' }) : null)))),
      el('tbody', {}, sorted.map((r, i) => el('tr', {},
        cols.map(col => el('td', { class: (col.n ? 'n ' : '') + (col.cls || '') },
          col.cell ? col.cell(r, i) : String(col.get(r) ?? '—'))))))));
  };
  render();
  return wrap;
}

/** Poster + name cell used across series/film tables. */
export const nameCell = e => el('div', { style: { display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 } },
  e.meta && e.meta.poster ? el('img', { class: 'poster', src: e.meta.poster, loading: 'lazy', alt: '' }) : null,
  el('div', { style: { minWidth: 0 } },
    el('div', { class: 'trunc', style: { fontWeight: 550 }, text: e.name }),
    el('div', { class: 'dim trunc', style: { fontSize: '11.5px' } },
      [e.meta && e.meta.year, e.meta && (e.meta.genres || []).slice(0, 2).join(', '),
       e.meta && e.meta.countries && e.meta.countries[0] ? flag(e.meta.countries[0]) : null]
        .filter(Boolean).join(' · '))));

/** Clicking a genre/language/country label filters the whole dashboard. */
export const setFilter = (k, v) => { S.filters[k] = S.filters[k] === v ? null : v; requestRefresh(); };

/** Confidence badge describing how much of a figure is estimated. */
export function confBadge(rows) {
  const c = coverage(rows);
  const p = Math.round(c.pctReal * 100);
  const cls = p >= 85 ? 'good' : p >= 40 ? '' : 'est';
  return el('span', {
    class: 'conf ' + cls, text: p + '% measured',
    title: `${nfmt(c.real)} of ${nfmt(c.total)} viewing events have a real runtime from TMDB/TVMaze. The rest use genre-median estimates.`,
  });
}

/**
 * Placeholder for a card with nothing to show. `tmdbOnly` marks fields TVMaze
 * cannot supply, so the message points at the key rather than at enrichment.
 */
export function needsMeta(tmdbOnly) {
  const ran = Object.keys(S.meta).length > 0;
  if (!ran) return el('div', { class: 'empty' },
    'No metadata yet. ',
    el('a', { href: '#', onclick: e => { e.preventDefault(); openPanel('#panelEnrich'); } }, 'Run enrichment'),
    ' to unlock this.');
  if (tmdbOnly && !S.tmdbKey) return el('div', { class: 'empty' },
    'TVMaze does not supply this. ',
    el('a', { href: '#', onclick: e => { e.preventDefault(); openPanel('#panelSettings'); } }, 'Add a TMDB key'),
    ' and re-run enrichment.');
  return el('div', { class: 'empty', text: 'Nothing to show for the current filter.' });
}
