// Header status, brand summary and active filter chips.

import { $, el } from '../core/dom.js';
import { fmtDateShort, nfmt } from '../core/format.js';
import { requestRefresh } from '../core/signal.js';
import { lookupTargets } from '../data/metadata.js';
import { countryName } from '../data/reference.js';
import { S } from '../data/state.js';

export function updateBrand() {
  const r = S.rows;
  $('#brandSub').textContent =
    `${nfmt(r.length)} events · ${fmtDateShort(r[0].date)} → ${fmtDateShort(r[r.length - 1].date)}`;
}

export function renderChips() {
  const f = S.filters;
  const items = [
    f.genre && ['genre', f.genre],
    f.lang && ['lang', f.lang],
    f.country && ['country', countryName(f.country)],
  ].filter(Boolean);
  $('#activeChips').replaceChildren(...items.map(([k, label]) => el('span', { class: 'chip' },
    label, el('button', { text: '✕', onclick: () => { S.filters[k] = null; requestRefresh(); } }))));
}

export function updateMetaStatus() {
  const all = lookupTargets(true);
  const pending = lookupTargets(false).length;
  // "Resolved" means a real match, not merely "we stopped asking".
  const resolved = all.filter(t => S.meta[t.key] && S.meta[t.key].src !== 'miss').length;
  const box = $('#metaStatus');
  const cls = resolved === all.length ? 'g' : resolved === 0 ? 'r' : 'y';
  box.replaceChildren(el('span', { class: 'dot ' + cls }),
    el('span', { text: `${nfmt(resolved)}/${nfmt(all.length)} titles resolved` }));
  $('#btnEnrich').textContent = pending ? `Enrich ${nfmt(pending)} titles` : 'Metadata';
}
