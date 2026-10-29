// Series tab.

import { el } from '../../core/dom.js';
import { by, color, dur, fmtDate, fmtDateShort, n1, nfmt } from '../../core/format.js';
import { bingeSessions, fmtM } from '../../data/stats.js';
import { card } from './registry.js';
import { barRows, columns } from '../charts.js';
import { nameCell, sortTable, statList } from '../components.js';
import { showTitlePanel } from '../panels.js';

card({ id: 'seriesTable', tab: 'series', w: 12, title: 'Every series you have watched', build: c => {
  if (!c.series.length) return el('div', { class: 'empty', text: 'No series in the current filter' });
  return el('div', {},
    el('div', { class: 'card-sub' }, `${c.series.length} distinct series · click a column to sort`),
    sortTable([
      { h: 'Series', get: e => e.eps, cell: e => nameCell(e), cls: 'name' },
      { h: 'Eps', n: 1, get: e => e.eps },
      { h: 'Time', n: 1, get: e => e.minutes, cell: e => dur(e.minutes) },
      { h: 'Seasons', n: 1, get: e => e.seasons.size, cell: e => e.seasons.size || '—' },
      { h: 'Done', n: 1, get: e => e.completion, cell: e => e.completion == null ? '—' : Math.round(e.completion * 100) + '%' },
      { h: 'First', n: 1, get: e => e.first, cell: e => fmtDateShort(e.first) },
      { h: 'Last', n: 1, get: e => e.last, cell: e => fmtDateShort(e.last) },
      { h: 'Span', n: 1, get: e => e.span, cell: e => e.span > 1 ? `${nfmt(e.span)}d` : '1d' },
      { h: 'Eps/day', n: 1, get: e => e.perDay, cell: e => n1(e.perDay) },
    ], c.series, { limit: 400, tall: true }));
}});

card({ id: 'longest', tab: 'series', w: 6, title: 'The longest series', build: c => {
  if (!c.series.length) return el('div', { class: 'empty', text: 'No series' });
  const byEps = [...c.series].sort(by(x => x.eps))[0];
  const byTime = [...c.series].sort(by(x => x.minutes))[0];
  const byEpLen = [...c.series].filter(x => x.meta && x.meta.runtime).sort(by(x => x.meta.runtime))[0];
  const bySpan = [...c.series].sort(by(x => x.span))[0];
  return statList([
    ['Most episodes', `<span class="hl">${byEps.name}</span>`, `${byEps.eps} episodes · ${dur(byEps.minutes)}`],
    ['Most time', `<span class="hl">${byTime.name}</span>`, `${dur(byTime.minutes)} · ${byTime.eps} episodes`],
    byEpLen && ['Longest episodes', `<span class="hl">${byEpLen.name}</span>`, `${byEpLen.meta.runtime} min each`],
    ['Longest relationship', `<span class="hl">${bySpan.name}</span>`, `${nfmt(bySpan.span)} days from first to last episode`],
  ]);
}});

card({ id: 'binges', tab: 'series', w: 6, title: 'Hardest binges', note: 'one sitting = ≤2 day gaps', build: c => {
  const s = bingeSessions(c.rows).filter(x => x.eps >= 3).sort(by(x => x.value)).slice(0, 12);
  return barRows(s.map(b => ({
    label: b.name, value: b.value,
    sub: `${b.days}d`,
    tip: `<b>${b.name}</b>${b.eps} episodes in ${b.days} day${b.days > 1 ? 's' : ''} · ${dur(b.minutes)}<br>${fmtDateShort(b.start)} → ${fmtDateShort(b.end)}<br>${n1(b.rate)} episodes/day`,
    click: () => showTitlePanel(`${b.name} · ${fmtDateShort(b.start)}`, b.rows),
  })), { fmt: fmtM, rank: true, emptyText: 'No binge sessions of 3+ episodes' });
}});

card({ id: 'fastest', tab: 'series', w: 6, title: 'Fastest consumption', note: 'episodes per active day', build: c => {
  const list = c.series.filter(s => s.eps >= 5).sort(by(x => x.perDay)).slice(0, 12);
  return barRows(list.map(s => ({
    label: s.name, value: s.perDay,
    sub: `${s.eps} eps`,
    tip: `<b>${s.name}</b>${n1(s.perDay)} episodes on each of ${s.activeDays} viewing days<br>${s.eps} episodes total · ${dur(s.minutes)}`,
    click: () => showTitlePanel(s.name, s.rows),
  })), { fmt: n1, rank: true, emptyText: 'No series with 5+ episodes' });
}});

card({ id: 'completion', tab: 'series', w: 6, title: 'How much of each show you finished', build: c => {
  const list = c.series.filter(s => s.completion != null && s.eps >= 3).sort(by(x => x.completion));
  if (!list.length) return el('div', { class: 'empty', text: 'Needs metadata — run enrichment to compare against full episode counts.' });
  const done = list.filter(s => s.completion >= .9).length;
  return el('div', {},
    el('div', { class: 'card-sub' }, `${done} of ${list.length} shows finished (90%+ of episodes)`),
    barRows(list.slice(0, 14).map(s => ({
      label: s.name, value: s.completion * 100,
      sub: `${s.episodes.size}/${s.total}`,
      tip: `<b>${s.name}</b>${s.episodes.size} of ${s.total} episodes · ${Math.round(s.completion * 100)}%`,
      click: () => showTitlePanel(s.name, s.rows),
    })), { fmt: v => Math.round(v) + '%', max: 100 }));
}});

card({ id: 'abandoned', tab: 'series', w: 6, title: 'Started and left behind', build: c => {
  const list = c.series.filter(s => s.completion != null && s.completion < .35 && s.eps >= 2)
    .sort(by(x => -x.completion)).slice(0, 14);
  if (!list.length) return el('div', { class: 'empty', text: 'Needs metadata, or you finish everything you start.' });
  return el('div', {},
    el('div', { class: 'card-sub' }, 'Under 35% of the episodes watched'),
    barRows(list.map(s => ({
      label: s.name, value: s.completion * 100,
      sub: `${s.episodes.size}/${s.total}`,
      tip: `<b>${s.name}</b>Stopped after ${s.episodes.size} of ${s.total} episodes<br>Last watched ${fmtDate(s.last)}`,
      click: () => showTitlePanel(s.name, s.rows),
    })), { fmt: v => Math.round(v) + '%', max: 100, color: () => 'var(--c9)' }));
}});

card({ id: 'newShows', tab: 'series', w: 6, title: 'New series discovered each year', build: c => {
  const firstYear = new Map();
  for (const s of c.series) {
    const y = s.first.getFullYear();
    firstYear.set(y, (firstYear.get(y) || 0) + 1);
  }
  const years = [...firstYear.keys()].sort();
  return el('div', {},
    columns(years.map(y => ({ label: y, value: firstYear.get(y), tip: `<b>${y}</b>${firstYear.get(y)} series started` })), { height: 150 }),
    el('p', { class: 'help', style: { marginTop: '9px' } },
      'Counted by the first episode seen inside the current filter, so narrowing the years shifts these.'));
}});
