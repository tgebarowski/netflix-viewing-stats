// Time tab: trends, seasonality, streaks and calendars.

import { $, el } from '../../core/dom.js';
import { DOW, DOW_L, MONTHS, MONTHS_L, by, color, daysBetween, dur, fmtDate, fmtDateShort, fromKey, n1, nfmt, pct, sum, uniq } from '../../core/format.js';
import { byDay, byDow, byMonthOfYear, byYearMonth, fmtM, measure, measureLabel, minutesOf, seriesAgg } from '../../data/stats.js';
import { card } from './registry.js';
import { barRows, calendarYear, columns, donut, legend, lineChart, matrixHeat } from '../charts.js';
import { statList } from '../components.js';
import { showTitlePanel } from '../panels.js';

card({ id: 'monthly', tab: 'time', w: 12, title: 'Month by month, all the way through', build: c => {
  const m = byYearMonth(c.rows);
  if (!m.size) return el('div', { class: 'empty', text: 'No data' });
  const keys = [...m.keys()].sort();
  const [y0, m0] = keys[0].split('-').map(Number);
  const [y1, m1] = keys[keys.length - 1].split('-').map(Number);
  const pts = [], labels = [];
  let i = 0;
  for (let y = y0; y <= y1; y++) for (let mo = 1; mo <= 12; mo++) {
    if (y === y0 && mo < m0) continue;
    if (y === y1 && mo > m1) break;
    const k = `${y}-${String(mo).padStart(2, '0')}`;
    pts.push({ x: i, y: m.get(k) || 0, label: `${MONTHS_L[mo - 1]} ${y}` });
    if (mo === 1) labels.push([i, String(y)]);
    i++;
  }
  return lineChart(pts, { fmt: fmtM, height: 190, xLabels: labels });
}});

card({ id: 'matrix', tab: 'time', w: 8, title: 'Year × month intensity', build: c => {
  const m = byYearMonth(c.rows);
  const years = uniq(c.rows.map(r => r.date.getFullYear())).sort();
  return matrixHeat(years, (y, mo) => m.get(`${y}-${String(mo + 1).padStart(2, '0')}`) || 0, { fmt: fmtM });
}});

card({ id: 'seasonality', tab: 'time', w: 4, title: 'Most-watched months', note: 'all years combined', build: c => {
  const m = byMonthOfYear(c.rows);
  const vals = MONTHS.map((_, i) => m.get(i) || 0);
  const top = vals.indexOf(Math.max(...vals));
  return el('div', {},
    columns(MONTHS.map((mn, i) => ({
      label: mn[0], value: vals[i], dim: i !== top,
      tip: `<b>${MONTHS_L[i]}</b>${fmtM(vals[i])} ${measureLabel()} across all years`,
    })), { fmt: fmtM, height: 130 }),
    el('div', { class: 'dim', style: { marginTop: '10px', fontSize: '12.5px' }, html:
      `Your peak month is <span class="hl">${MONTHS_L[top]}</span> — ${fmtM(vals[top])} ${measureLabel()}, ${n1(vals[top] / (sum(vals) / 12))}× an average month.` }));
}});

card({ id: 'dow', tab: 'time', w: 4, title: 'The day you watch most', build: c => {
  const m = byDow(c.rows);
  const vals = DOW.map((_, i) => m.get(i) || 0);
  const top = vals.indexOf(Math.max(...vals));
  return el('div', {},
    columns(DOW.map((d, i) => ({
      label: d, value: vals[i], dim: i !== top,
      tip: `<b>${DOW_L[i]}</b>${fmtM(vals[i])} ${measureLabel()}`,
    })), { fmt: fmtM, height: 130 }),
    el('div', { class: 'dim', style: { marginTop: '10px', fontSize: '12.5px' }, html:
      `<span class="hl">${DOW_L[top]}</span> leads with ${fmtM(vals[top])} — ${n1((vals[top] / (sum(vals) / 7) - 1) * 100)}% above an average day.` }));
}});

card({ id: 'weekend', tab: 'time', w: 4, title: 'Weekday vs weekend', build: c => {
  const we = c.rows.filter(r => [0, 6].includes(r.date.getDay()));
  const wd = c.rows.filter(r => ![0, 6].includes(r.date.getDay()));
  const items = [{ label: 'Weekdays', value: measure(wd), color: 'var(--c4)' }, { label: 'Weekend', value: measure(we), color: 'var(--c2)' }];
  const perWd = measure(wd) / 5, perWe = measure(we) / 2;
  return el('div', {},
    donut(items, { fmt: fmtM, center: pct(items[1].value, sum(items.map(i => i.value))), centerSub: 'weekend' }),
    legend(items, { values: true, fmt: fmtM }),
    el('div', { class: 'dim', style: { marginTop: '10px', fontSize: '12.5px' }, html:
      perWe > perWd
        ? `Per calendar day you watch <span class="hl">${n1(perWe / perWd)}×</span> more at weekends.`
        : `You actually watch <span class="hl">${n1(perWd / perWe)}×</span> more per weekday than per weekend day.` }));
}});

card({ id: 'streaks', tab: 'time', w: 4, title: 'Streaks and silences', build: c => {
  const st = c.ov.st;
  if (!st.activeDays) return el('div', { class: 'empty', text: 'No data' });
  return statList([
    ['Longest streak', `${st.longest} days`, `${fmtDateShort(fromKey(st.longestStart))} → ${fmtDateShort(fromKey(st.longestEnd))}`],
    ['Current streak', `${st.current} days`, `up to ${fmtDateShort(fromKey(st.last))}`],
    ['Longest silence', `${nfmt(st.gap)} days`, st.gapStart ? `${fmtDateShort(fromKey(st.gapStart))} → ${fmtDateShort(fromKey(st.gapEnd))}` : ''],
    ['Days with viewing', `${nfmt(st.activeDays)}`, `${pct(st.activeDays, c.ov.span)} of the period`],
  ]);
}});

card({ id: 'bigDays', tab: 'time', w: 4, title: 'Biggest single days', build: c => {
  const m = byDay(c.rows);
  const top = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  return barRows(top.map(([k, v]) => {
    const d = fromKey(k), rs = c.rows.filter(r => r.dayKey === k);
    const shows = uniq(rs.map(r => r.show));
    return {
      label: `${fmtDate(d)}`, value: v, sub: DOW[d.getDay()],
      tip: `<b>${fmtDate(d)} · ${DOW_L[d.getDay()]}</b>${rs.length} events · ${dur(minutesOf(rs))}<br>${shows.slice(0, 4).join(', ')}${shows.length > 4 ? ` +${shows.length - 4} more` : ''}`,
      click: () => showTitlePanel(fmtDate(d), rs),
    };
  }), { fmt: fmtM, rank: true });
}});

card({ id: 'bigMonths', tab: 'time', w: 4, title: 'Biggest months', build: c => {
  const m = byYearMonth(c.rows);
  const top = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  return barRows(top.map(([k, v]) => {
    const [y, mo] = k.split('-').map(Number);
    const rs = c.rows.filter(r => r.date.getFullYear() === y && r.date.getMonth() === mo - 1);
    return {
      label: `${MONTHS_L[mo - 1]} ${y}`, value: v,
      tip: `<b>${MONTHS_L[mo - 1]} ${y}</b>${rs.length} events · ${dur(minutesOf(rs))}<br>Top: ${(seriesAgg(rs).sort(by(x => x.eps))[0] || {}).name || '—'}`,
      click: () => showTitlePanel(`${MONTHS_L[mo - 1]} ${y}`, rs),
    };
  }), { fmt: fmtM, rank: true });
}});

card({ id: 'rolling', tab: 'time', w: 12, title: 'Rolling 30-day intensity', build: c => {
  if (!c.rows.length) return el('div', { class: 'empty', text: 'No data' });
  const m = byDay(c.rows);
  const st = c.ov.st;
  const start = fromKey(st.first), end = fromKey(st.last);
  const n = daysBetween(start, end) + 1;
  const daily = new Array(n).fill(0);
  for (const [k, v] of m) { const i = daysBetween(start, fromKey(k)); if (i >= 0 && i < n) daily[i] += v; }
  const W = 30, pts = []; let acc = 0;
  const labels = [];
  for (let i = 0; i < n; i++) {
    acc += daily[i]; if (i >= W) acc -= daily[i - W];
    if (i % Math.max(1, Math.floor(n / 900)) === 0) {
      const d = new Date(start); d.setDate(d.getDate() + i);
      pts.push({ x: i, y: acc, label: `30 days to ${fmtDate(d)}` });
      if (d.getMonth() === 0 && d.getDate() <= 3) labels.push([i, String(d.getFullYear())]);
    }
  }
  return lineChart(pts, { fmt: fmtM, height: 170, xLabels: labels });
}});

card({ id: 'calendars', tab: 'time', w: 12, title: 'Every day, year by year', build: c => {
  const years = uniq(c.rows.map(r => r.date.getFullYear())).sort((a, b) => b - a);
  const m = byDay(c.rows);
  return el('div', {}, years.map(y => el('div', { style: { marginBottom: '18px' } },
    el('div', { style: { fontSize: '12px', fontWeight: 650, marginBottom: '5px' } }, String(y),
      el('span', { class: 'dim', style: { fontWeight: 400, marginLeft: '8px' } },
        `${fmtM(sum([...m].filter(([k]) => k.startsWith(y + '-')).map(([, v]) => v)))} ${measureLabel()}`)),
    calendarYear(y, k => m.get(k) || 0, { fmt: v => `${fmtM(v)} ${measureLabel()}` }))));
}});

card({ id: 'yearCards', tab: 'time', w: 12, title: 'Year in review', build: c => {
  const years = uniq(c.rows.map(r => r.date.getFullYear())).sort((a, b) => b - a);
  const wrap = el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: '12px' } });
  for (const y of years) {
    const rs = c.rows.filter(r => r.date.getFullYear() === y);
    const ser = seriesAgg(rs).sort(by(x => x.eps));
    const days = new Set(rs.map(r => r.dayKey)).size;
    const first = [...rs].sort((a, b) => a.date - b.date)[0];
    wrap.append(el('div', { style: { background: 'var(--bg3)', borderRadius: 'var(--r)', padding: '13px 15px' } },
      el('div', { style: { display: 'flex', alignItems: 'baseline', gap: '8px' } },
        el('div', { class: 'mid' }, String(y)),
        el('div', { class: 'dim', style: { fontSize: '12px', marginLeft: 'auto' } }, `${days} active days`)),
      el('div', { style: { fontSize: '13px', marginTop: '7px' } },
        el('div', {}, el('span', { class: 'hl' }, nfmt(rs.length)), el('span', { class: 'dim' }, ' events · '),
          el('span', { class: 'hl' }, dur(minutesOf(rs)))),
        el('div', { class: 'dim', style: { marginTop: '5px' } }, 'Top series'),
        el('div', { class: 'trunc' }, ser[0] ? `${ser[0].name} (${ser[0].eps} eps)` : '—'),
        el('div', { class: 'dim', style: { marginTop: '5px' } }, 'Opened the year with'),
        el('div', { class: 'trunc' }, first ? first.show : '—'))));
  }
  return wrap;
}});
