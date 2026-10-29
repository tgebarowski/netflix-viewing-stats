// Tab bar, year chips, measure toggles and card visibility.

import { $, el } from '../core/dom.js';
import { uniq } from '../core/format.js';
import { LS } from '../core/storage.js';
import { S } from '../data/state.js';
import { CARDS, TABS } from './cards/index.js';
import { openPanel } from './panels.js';
import { render } from './render.js';

export function renderTabs() {
  $('#tabs').replaceChildren(...TABS.map(([id, label]) => el('button', {
    class: 'tab' + (S.tab === id ? ' on' : ''), text: label,
    onclick: () => { S.tab = id; LS.set('tab', id); renderTabs(); render(); scrollTo({ top: 0, behavior: 'smooth' }); },
  })));
}

export function renderYearChips() {
  const years = uniq(S.rows.map(r => r.date.getFullYear())).sort();
  const all = !S.filters.years;
  const box = $('#yearChips');
  box.replaceChildren(
    el('button', { class: 'yr' + (all ? ' on' : ''), text: 'All', onclick: () => { S.filters.years = null; renderYearChips(); render(); } }),
    ...years.map(y => el('button', {
      class: 'yr' + (!all && S.filters.years.has(y) ? ' on' : ''), text: String(y),
      onclick: e => {
        if (e.shiftKey || all) S.filters.years = new Set([y]);
        else {
          const s = new Set(S.filters.years);
          s.has(y) ? s.delete(y) : s.add(y);
          S.filters.years = s.size ? s : null;
        }
        renderYearChips(); render();
      },
    })));
}

export function seg(sel, key) {
  const box = $(sel);
  box.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    box.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    S.filters[key] = b.dataset.v;
    render();
  });
}
seg('#segBasis', 'basis'); seg('#segType', 'type'); seg('#segAud', 'aud');

// --- card visibility
export function renderCardToggles() {
  const box = $('#cardToggles');
  box.replaceChildren();
  for (const [tabId, tabLabel] of TABS) {
    const defs = CARDS.filter(d => d.tab === tabId);
    if (!defs.length) continue;
    box.append(el('h4', { text: tabLabel }), el('div', { class: 'toggles' }, defs.map(d =>
      el('label', { class: 'tg' },
        el('input', {
          type: 'checkbox', checked: S.cards[d.id] !== false,
          onchange: e => { S.cards[d.id] = e.target.checked; LS.set('cards', S.cards); render(); },
        }),
        el('span', { text: d.title })))));
  }
}
$('#btnCards').addEventListener('click', () => { renderCardToggles(); openPanel('#panelCards'); });
$('#btnAllOn').addEventListener('click', () => { for (const d of CARDS) S.cards[d.id] = true; LS.set('cards', S.cards); renderCardToggles(); render(); });
$('#btnAllOff').addEventListener('click', () => { for (const d of CARDS) S.cards[d.id] = false; LS.set('cards', S.cards); renderCardToggles(); render(); });
