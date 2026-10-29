// Modal panels and the per-title drill-down.

import { $, $$, el } from '../core/dom.js';
import { DOW, dur, fmtDateShort } from '../core/format.js';
import { runtimeOf } from '../data/state.js';
import { minutesOf } from '../data/stats.js';

export const openPanel = sel => $(sel).classList.add('on');
export const closePanels = () => $$('.panel').forEach(p => p.classList.remove('on'));
$$('.panel').forEach(p => {
  p.addEventListener('click', e => { if (e.target === p) closePanels(); });
  p.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closePanels));
});
addEventListener('keydown', e => { if (e.key === 'Escape') closePanels(); });

/** Drill-down list of individual viewing events. */
export function showTitlePanel(heading, rows) {
  $('#titlePanelH').textContent = heading;
  const sorted = [...rows].sort((a, b) => b.date - a.date);
  $('#titlePanelB').replaceChildren(
    el('div', { class: 'card-sub' },
      `${rows.length} viewing events · ${dur(minutesOf(rows))} estimated`),
    el('div', { class: 'tw', style: { maxHeight: '60vh', overflowY: 'auto' } },
      el('table', { class: 't' }, el('tbody', {}, sorted.map(r => el('tr', {},
        el('td', { class: 'dim', style: { width: '1%', whiteSpace: 'nowrap' } }, fmtDateShort(r.date)),
        el('td', { class: 'dim', style: { width: '1%' } }, DOW[r.date.getDay()]),
        el('td', { class: 'name' }, el('div', { class: 'trunc', text: r.episode || r.show })),
        el('td', { class: 'n dim', style: { whiteSpace: 'nowrap' } }, r.seasonLabel || (r.kind === 'movie' ? 'film' : '')),
        el('td', { class: 'n dim' }, `${Math.round(runtimeOf(r).min)}m${runtimeOf(r).est ? '*' : ''}`)))))),
    el('p', { class: 'help' }, '* estimated runtime'));
  openPanel('#panelTitle');
}
