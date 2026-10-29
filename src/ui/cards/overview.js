// Overview tab.

import { $, el } from '../../core/dom.js';
import { by, color, dur, fmtDate, fmtDateShort, fromKey, n1, nfmt, pct, sum } from '../../core/format.js';
import { audienceOf } from '../../data/state.js';
import { byYear, equivalents, fmtM, measure, measureLabel } from '../../data/stats.js';
import { card } from './registry.js';
import { barRows, columns, donut, legend } from '../charts.js';
import { bigStat, kpi, statList } from '../components.js';
import { showTitlePanel } from '../panels.js';

card({ id: 'kpis', tab: 'overview', w: 12, bare: true, title: 'Headline numbers', build: c => {
  const o = c.ov;
  return el('div', { class: 'kpis' },
    kpi(nfmt(o.rows), 'Viewing events', `${nfmt(o.eps)} episodes · ${nfmt(o.films)} films`),
    kpi(dur(o.minutes), 'Estimated time', `${n1(o.hours)} hours · ${Math.round(o.cov.pctReal * 100)}% measured`),
    kpi(nfmt(o.series), 'Series', `${nfmt(o.filmTitles)} distinct films`),
    kpi(nfmt(o.st.activeDays || 0), 'Days with viewing', o.span ? `${pct(o.st.activeDays, o.span)} of the ${nfmt(o.span)} days covered` : ''),
    kpi(nfmt(o.st.longest), 'Longest streak', o.st.longestStart ? `${fmtDateShort(fromKey(o.st.longestStart))} → ${fmtDateShort(fromKey(o.st.longestEnd))}` : ''),
    kpi(n1(o.perActiveDay), 'Per active day', `${dur(o.minPerActiveDay)} on days you watched`));
}});

card({ id: 'equiv', tab: 'overview', w: 4, title: 'That time, in other units', build: c => {
  const o = c.ov;
  return el('div', {},
    bigStat(dur(o.minutes), `across ${nfmt(o.rows)} viewing events`),
    el('div', { style: { marginTop: '14px' } },
      statList(equivalents(o.minutes).map(([v, l]) => [l, v]))),
    el('p', { class: 'help', style: { marginTop: '10px' } }, 'Estimated from runtimes, not measured by Netflix.'));
}});

card({ id: 'split', tab: 'overview', w: 4, title: 'Series vs films', build: c => {
  const eps = c.rows.filter(r => r.kind === 'episode'), films = c.rows.filter(r => r.kind === 'movie');
  const items = [
    { label: 'Series episodes', value: measure(eps), color: 'var(--c1)' },
    { label: 'Films', value: measure(films), color: 'var(--c4)' },
  ];
  const tot = sum(items.map(i => i.value));
  return el('div', {},
    donut(items, { fmt: fmtM, center: pct(items[0].value, tot), centerSub: 'series' }),
    legend(items, { values: true, fmt: fmtM }));
}});

card({ id: 'audsplit', tab: 'overview', w: 4, title: 'Who was watching', build: c => {
  const k = c.rows.filter(r => audienceOf(r) === 'kids'), a = c.rows.filter(r => audienceOf(r) !== 'kids');
  const items = [{ label: 'Grown-up', value: measure(a), color: 'var(--c5)' }, { label: 'Kids & family', value: measure(k), color: 'var(--c2)' }];
  return el('div', {},
    donut(items, { fmt: fmtM, center: pct(items[1].value, sum(items.map(i => i.value))), centerSub: 'kids' }),
    legend(items, { values: true, fmt: fmtM }),
    el('p', { class: 'help', style: { marginTop: '8px' } },
      'Inferred from age ratings, genres and episode length. Correct individual titles on the Data tab.'));
}});

card({ id: 'topShows', tab: 'overview', w: 6, title: 'Most-watched series', build: c => {
  const list = c.series.sort(by(x => x.value)).slice(0, 12);
  return barRows(list.map(s => ({
    label: s.name, value: s.value, rank: true,
    tip: `<b>${s.name}</b>${s.eps} episodes · ${dur(s.minutes)}<br>${fmtDateShort(s.first)} → ${fmtDateShort(s.last)}`,
    click: () => showTitlePanel(s.name, s.rows),
  })), { fmt: fmtM, rank: true });
}});

card({ id: 'topFilms', tab: 'overview', w: 6, title: 'Films, most recent first', build: c => {
  const list = c.films.sort(by(x => x.last)).slice(0, 12);
  return barRows(list.map(f => ({
    label: f.name, value: f.value,
    tip: `<b>${f.name}</b>${f.meta ? `${f.meta.year || ''} · ${dur(f.meta.runtime)}<br>${(f.meta.genres || []).join(', ')}` : 'no metadata yet'}<br>Watched ${fmtDate(f.last)}`,
    click: () => showTitlePanel(f.name, f.rows),
  })), { fmt: fmtM, rank: true, emptyText: 'No films in the current filter' });
}});

card({ id: 'yearBars', tab: 'overview', w: 8, title: 'Every year', build: c => {
  const m = byYear(c.rows), years = [...m.keys()].sort();
  return columns(years.map(y => ({
    label: y, value: m.get(y),
    tip: `<b>${y}</b>${fmtM(m.get(y))} ${measureLabel()}`,
  })), { fmt: fmtM, height: 180, fade: true });
}});

card({ id: 'firsts', tab: 'overview', w: 4, title: 'Bookends', build: c => {
  const sorted = [...c.rows].sort((a, b) => a.date - b.date);
  const f = sorted[0], l = sorted[sorted.length - 1];
  if (!f) return el('div', { class: 'empty', text: 'No data' });
  return statList([
    ['First ever', `<span class="hl">${f.show}</span>`, fmtDate(f.date)],
    ['Most recent', `<span class="hl">${l.show}</span>`, fmtDate(l.date)],
    ['History spans', `${n1(c.ov.span / 365.25)} years`, `${nfmt(c.ov.span)} days`],
    ['Current streak', `${c.ov.st.current} ${c.ov.st.current === 1 ? 'day' : 'days'}`, `last watched ${fmtDate(l.date)}`],
  ]);
}});
