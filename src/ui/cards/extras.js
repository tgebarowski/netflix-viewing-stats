// Extras tab: superlatives and odds and ends.

import { el } from '../../core/dom.js';
import { DOW, DOW_L, MONTHS_L, by, color, dur, fmtDate, fmtDateShort, fromKey, sum, uniq } from '../../core/format.js';
import { bingeSessions, byDay, byDow, byMonthOfYear, byYear, byYearMonth, fmtM, measureLabel, rewatches, rowValue, tallyMap, weekKey } from '../../data/stats.js';
import { card } from './registry.js';
import { legend, stackedArea } from '../charts.js';

card({ id: 'superlatives', tab: 'extras', w: 12, title: 'Superlatives', build: c => {
  const dayM = byDay(c.rows), monthM = byYearMonth(c.rows);
  const weekM = tallyMap(c.rows, r => weekKey(r.date));
  const topDay = [...dayM.entries()].sort((a, b) => b[1] - a[1])[0];
  const topWeek = [...weekM.entries()].sort((a, b) => b[1] - a[1])[0];
  const topMonth = [...monthM.entries()].sort((a, b) => b[1] - a[1])[0];
  const topYear = [...byYear(c.rows).entries()].sort((a, b) => b[1] - a[1])[0];
  const dowM = byDow(c.rows), moyM = byMonthOfYear(c.rows);
  const topDow = [...dowM.entries()].sort((a, b) => b[1] - a[1])[0];
  const topMoy = [...moyM.entries()].sort((a, b) => b[1] - a[1])[0];
  const ser = [...c.series].sort(by(x => x.value))[0];
  const binge = bingeSessions(c.rows).sort(by(x => x.eps))[0];
  const items = [
    topDay && ['Biggest day', fmtDate(fromKey(topDay[0])), `${fmtM(topDay[1])} ${measureLabel()} · ${DOW_L[fromKey(topDay[0]).getDay()]}`],
    topWeek && ['Biggest week', `week of ${fmtDate(fromKey(topWeek[0]))}`, `${fmtM(topWeek[1])} ${measureLabel()}`],
    topMonth && ['Biggest month', `${MONTHS_L[+topMonth[0].split('-')[1] - 1]} ${topMonth[0].split('-')[0]}`, `${fmtM(topMonth[1])} ${measureLabel()}`],
    topYear && ['Biggest year', String(topYear[0]), `${fmtM(topYear[1])} ${measureLabel()}`],
    topDow && ['Favourite weekday', DOW_L[topDow[0]], `${fmtM(topDow[1])} ${measureLabel()}`],
    topMoy && ['Favourite month', MONTHS_L[topMoy[0]], `${fmtM(topMoy[1])} ${measureLabel()}`],
    ser && ['Most-watched series', ser.name, `${ser.eps} episodes · ${dur(ser.minutes)}`],
    binge && ['Longest single binge', binge.name, `${binge.eps} episodes over ${binge.days} day${binge.days > 1 ? 's' : ''}`],
  ].filter(Boolean);
  return el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: '14px' } },
    items.map(([l, v, s]) => el('div', {},
      el('div', { class: 'l', style: { fontSize: '11px', color: 'var(--fg3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' } }, l),
      el('div', { class: 'mid', style: { marginTop: '4px' } }, v),
      el('div', { class: 'dim', style: { fontSize: '12px' } }, s))));
}});

card({ id: 'rewatch', tab: 'extras', w: 6, title: 'Watched more than once', build: c => {
  const rw = rewatches(c.rows);
  if (!rw.length) return el('div', { class: 'empty', text: 'Nothing in this filter was watched twice.' });
  return el('div', {},
    el('div', { class: 'card-sub' }, `${rw.length} titles seen on more than one day`),
    el('div', { class: 'tw' }, el('table', { class: 't' },
      el('tbody', {}, rw.slice(0, 20).map(x => el('tr', {},
        el('td', { class: 'name' }, el('div', { class: 'trunc', text: x.title })),
        el('td', { class: 'n dim', style: { whiteSpace: 'nowrap' } }, x.dates.map(fmtDateShort).join(' · ')),
        el('td', { class: 'n' }, `${x.n}×`)))))));
}});

card({ id: 'firstOfYear', tab: 'extras', w: 6, title: 'What you opened each year with', build: c => {
  const years = uniq(c.rows.map(r => r.date.getFullYear())).sort((a, b) => b - a);
  return el('div', { class: 'tw' }, el('table', { class: 't' }, el('tbody', {}, years.map(y => {
    const rs = c.rows.filter(r => r.date.getFullYear() === y).sort((a, b) => a.date - b.date);
    return el('tr', {},
      el('td', { class: 'dim', style: { width: '1%', whiteSpace: 'nowrap' } }, String(y)),
      el('td', { class: 'name' }, el('div', { class: 'trunc', text: rs[0].show })),
      el('td', { class: 'n dim', style: { whiteSpace: 'nowrap' } }, fmtDateShort(rs[0].date)));
  }))));
}});

card({ id: 'weekdayByYear', tab: 'extras', w: 12, title: 'Weekday habit, year by year', build: c => {
  const years = uniq(c.rows.map(r => r.date.getFullYear())).sort();
  const series = DOW.map((d, i) => ({
    name: DOW_L[i],
    values: years.map(y => sum(c.rows.filter(r => r.date.getFullYear() === y && r.date.getDay() === i).map(rowValue))),
  }));
  return el('div', {}, stackedArea(years.map(String), series, { height: 200 }), legend(series.map(s => ({ label: s.name }))));
}});
