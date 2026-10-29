// Films tab.

import { el } from '../../core/dom.js';
import { by, dur, fmtDateShort, median, n1, nfmt, sum, uniq } from '../../core/format.js';
import { releaseLag } from '../../data/stats.js';
import { card } from './registry.js';
import { barRows, histogram } from '../charts.js';
import { kpi, nameCell, needsMeta, sortTable } from '../components.js';

card({ id: 'filmKpis', tab: 'films', w: 12, bare: true, title: 'Film headlines', build: c => {
  const f = c.films, rows = c.rows.filter(r => r.kind === 'movie');
  const min = sum(f.map(x => x.minutes));
  const withRt = f.filter(x => x.meta && x.meta.runtime);
  const longest = [...withRt].sort(by(x => x.meta.runtime))[0];
  const shortest = [...withRt].sort(by(x => -x.meta.runtime))[0];
  const years = f.filter(x => x.meta && x.meta.year).map(x => x.meta.year);
  return el('div', { class: 'kpis' },
    kpi(nfmt(f.length), 'Films watched', `${nfmt(rows.length)} viewings`),
    kpi(dur(min), 'Estimated time', withRt.length ? `avg ${Math.round(median(withRt.map(x => x.meta.runtime)))} min` : 'no runtimes yet'),
    kpi(longest ? `${longest.meta.runtime}<em>min</em>` : '—', 'Longest film', longest ? longest.name : ''),
    kpi(shortest ? `${shortest.meta.runtime}<em>min</em>` : '—', 'Shortest film', shortest ? shortest.name : ''),
    kpi(years.length ? Math.min(...years) : '—', 'Oldest release', years.length ? (f.find(x => x.meta && x.meta.year === Math.min(...years)) || {}).name : ''),
    kpi(years.length ? nfmt(f.length / Math.max(1, uniq(rows.map(r => r.date.getFullYear())).length)) : '—', 'Films per year', 'within the filter'));
}});

card({ id: 'filmTable', tab: 'films', w: 12, title: 'Every film', build: c => {
  if (!c.films.length) return el('div', { class: 'empty', text: 'No films in the current filter' });
  return sortTable([
    { h: 'Film', get: f => f.last, cell: f => nameCell(f), cls: 'name' },
    { h: 'Watched', n: 1, get: f => f.last, cell: f => fmtDateShort(f.last) },
    { h: 'Runtime', n: 1, get: f => f.meta && f.meta.runtime, cell: f => f.meta && f.meta.runtime ? `${f.meta.runtime}m` : '—' },
    { h: 'Released', n: 1, get: f => f.meta && f.meta.year, cell: f => (f.meta && f.meta.year) || '—' },
    { h: 'Lang', n: 1, get: f => f.meta && f.meta.lang, cell: f => (f.meta && f.meta.lang) || '—' },
    { h: 'Score', n: 1, get: f => f.meta && f.meta.score, cell: f => f.meta && f.meta.score ? n1(f.meta.score) : '—' },
    { h: 'Times', n: 1, get: f => f.n },
  ], c.films, { limit: 600, tall: true });
}});

card({ id: 'releaseYears', tab: 'films', w: 6, title: 'When the films you watch were made', build: c => {
  const years = c.films.filter(f => f.meta && f.meta.year).map(f => f.meta.year);
  if (!years.length) return needsMeta(true);
  return el('div', {},
    histogram(years, { bins: Math.min(24, Math.max(6, new Set(years).size)), height: 150 }),
    el('div', { class: 'dim', style: { marginTop: '9px', fontSize: '12.5px' }, html:
      `Median release year <span class="hl">${Math.round(median(years))}</span> · oldest ${Math.min(...years)} · newest ${Math.max(...years)}` }));
}});

card({ id: 'runtimeHist', tab: 'films', w: 6, title: 'Film length distribution', build: c => {
  const rt = c.films.filter(f => f.meta && f.meta.runtime > 0).map(f => f.meta.runtime);
  if (!rt.length) return needsMeta(true);
  return el('div', {},
    histogram(rt, { bins: 16, height: 150, label: v => Math.round(v) + 'm' }),
    el('div', { class: 'dim', style: { marginTop: '9px', fontSize: '12.5px' }, html:
      `Median <span class="hl">${Math.round(median(rt))} min</span> · you have sat through ${rt.filter(x => x >= 150).length} films of 2½ hours or more.` }));
}});

card({ id: 'lag', tab: 'films', w: 6, title: 'New releases or back catalogue?', build: c => {
  const lags = releaseLag(c.rows.filter(r => r.kind === 'movie'));
  if (!lags.length) return needsMeta(true);
  const yrs = lags.map(l => l.days / 365.25);
  const buckets = [
    ['Within 3 months', lags.filter(l => l.days <= 92).length],
    ['3–12 months', lags.filter(l => l.days > 92 && l.days <= 365).length],
    ['1–3 years', lags.filter(l => l.days > 365 && l.days <= 1095).length],
    ['3–10 years', lags.filter(l => l.days > 1095 && l.days <= 3650).length],
    ['Over 10 years', lags.filter(l => l.days > 3650).length],
  ];
  return el('div', {},
    barRows(buckets.map(([label, value]) => ({ label, value })), { fmt: nfmt }),
    el('div', { class: 'dim', style: { marginTop: '11px', fontSize: '12.5px' }, html:
      `Typical gap between release and your viewing: <span class="hl">${n1(median(yrs))} years</span>.` }));
}});

card({ id: 'scores', tab: 'films', w: 6, title: 'How well rated is what you watch', build: c => {
  const all = [...c.series, ...c.films].filter(x => x.meta && x.meta.score > 0);
  if (!all.length) return needsMeta(true);
  const scores = all.map(x => x.meta.score);
  return el('div', {},
    histogram(scores, { bins: 14, min: 3, max: 10, height: 150, label: v => n1(v) }),
    el('div', { class: 'dim', style: { marginTop: '9px', fontSize: '12.5px' }, html:
      `Median score <span class="hl">${n1(median(scores))}</span> · best: ${[...all].sort(by(x => x.meta.score))[0].name} (${n1(Math.max(...scores))})` }));
}});
