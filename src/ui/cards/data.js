// Data tab: coverage, manual overrides and documented limitations.

import { el } from '../../core/dom.js';
import { by, nfmt, pct } from '../../core/format.js';
import { requestRebuild } from '../../core/signal.js';
import { S, audienceOf, coverage, saveOverrides } from '../../data/state.js';
import { card } from './registry.js';
import { statList } from '../components.js';

card({ id: 'quality', tab: 'data', w: 6, title: 'Data quality', build: c => {
  const cov = coverage(c.rows);
  const t1 = c.rows.filter(r => r.tier === 1).length, t2 = c.rows.filter(r => r.tier === 2).length, t3 = c.rows.filter(r => r.tier === 3).length;
  return el('div', {},
    statList([
      ['Viewing events', nfmt(cov.total)],
      ['With metadata', `${nfmt(cov.withMeta)}`, pct(cov.withMeta, cov.total) + ' of events'],
      ['With a real runtime', `${nfmt(cov.real)}`, pct(cov.real, cov.total) + ' — the rest are estimated'],
      ['Parsed by season marker', nfmt(t1), 'e.g. “Show: Season 2: Episode”'],
      ['Parsed by repeated prefix', nfmt(t2), 'older “Show: Episode” format'],
      ['Treated as a film', nfmt(t3), 'single titles, verified against TMDB'],
    ]),
    el('p', { class: 'help', style: { marginTop: '12px' } },
      'Estimated runtimes use the median of resolved titles sharing a genre, falling back to the median for series or films overall.'));
}});

card({ id: 'unresolved', tab: 'data', w: 6, title: 'Titles without metadata', build: c => {
  const m = new Map();
  for (const r of c.rows) {
    const meta = S.meta[r.key];
    if (meta && meta.src !== 'miss') continue;
    const e = m.get(r.key) || { key: r.key, name: r.show, kind: r.kind, n: 0 };
    e.n++; m.set(r.key, e);
  }
  const list = [...m.values()].sort(by(x => x.n));
  if (!list.length) return el('div', { class: 'empty', text: 'Everything in this filter has metadata.' });
  return el('div', {},
    el('div', { class: 'card-sub' }, `${list.length} titles TMDB/TVMaze could not match — they still count, using estimated runtimes.`),
    el('div', { class: 'tw', style: { maxHeight: '340px', overflowY: 'auto' } }, el('table', { class: 't' },
      el('tbody', {}, list.slice(0, 120).map(x => el('tr', {},
        el('td', { class: 'name' }, el('div', { class: 'trunc', text: x.name })),
        el('td', { class: 'n dim' }, `${x.n}×`),
        el('td', { class: 'n' }, el('button', {
          class: 'btn ghost', style: { fontSize: '11px', padding: '2px 8px' },
          text: x.kind === 'movie' ? 'is a series' : 'is a film',
          onclick: () => {
            S.overrides[x.key] = Object.assign({}, S.overrides[x.key], { kind: x.kind === 'movie' ? 'episode' : 'movie' });
            saveOverrides(); requestRebuild();
          },
        }))))))));
}});

card({ id: 'reclassify', tab: 'data', w: 6, title: 'Audience overrides', build: c => {
  const list = [...c.series, ...c.films].sort(by(x => x.value)).slice(0, 60);
  return el('div', {},
    el('div', { class: 'card-sub' }, 'Move a title between the kids and grown-up buckets. Saved in this browser.'),
    el('div', { class: 'tw', style: { maxHeight: '360px', overflowY: 'auto' } }, el('table', { class: 't' },
      el('tbody', {}, list.map(x => {
        const cur = audienceOf({ key: x.key, kind: x.rows[0].kind });
        return el('tr', {},
          el('td', { class: 'name' }, el('div', { class: 'trunc', text: x.name })),
          el('td', { class: 'n' }, el('span', { class: 'pill', text: cur === 'kids' ? 'Kids' : 'Grown-up' })),
          el('td', { class: 'n' }, el('button', {
            class: 'btn ghost', style: { fontSize: '11px', padding: '2px 8px' }, text: 'flip',
            onclick: () => {
              S.overrides[x.key] = Object.assign({}, S.overrides[x.key], { aud: cur === 'kids' ? 'adult' : 'kids' });
              saveOverrides(); requestRebuild();
            },
          })));
      })))));
}});

card({ id: 'limits', tab: 'data', w: 6, title: 'What this cannot know', build: () => el('div', { class: 'help', style: { fontSize: '13px' } },
  el('p', {}, el('b', {}, 'No timestamps. '), 'Netflix exports a date, not a time. Hour-of-day and late-night statistics are impossible from this file — “most watched day” means day of the week and calendar date.'),
  el('p', {}, el('b', {}, 'No durations. '), 'Every hours figure multiplies episodes watched by a runtime looked up from TMDB or TVMaze. Where a title never matched, the runtime is a genre-median estimate. The badge on each card shows how much was measured.'),
  el('p', {}, el('b', {}, 'Partial views. '), 'Netflix records a row once you have watched enough of something, and does not log abandoned starts, so totals skew slightly low.'),
  el('p', {}, el('b', {}, 'One profile, several people. '), 'The export does not say who was watching. The kids/grown-up split is inferred from ratings and genres and can be corrected by hand.'),
  el('p', {}, el('b', {}, 'Series structure is inferred. '), 'Season and episode names are parsed out of the title string, which Netflix has formatted two different ways over the years.'))});
