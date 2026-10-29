// Aggregations over the filtered viewing history.

import { by, dayKey, daysBetween, fromKey, hours, n1, nfmt, sum } from '../core/format.js';
import { S, audienceOf, coverage, metaOf, runtimeOf } from './state.js';

export const isHours = () => S.filters.basis === 'hours';
/** Value one viewing event contributes under the current measure. */
export const rowValue = r => isHours() ? runtimeOf(r).min / 60 : 1;
export const measure = rows => sum(rows.map(rowValue));
export const fmtM = v => isHours() ? n1(v) + 'h' : nfmt(v);
export const measureLabel = () => isHours() ? 'hours' : 'titles';

/** Total minutes for a row set, regardless of measure. */
export const minutesOf = rows => sum(rows.map(r => runtimeOf(r).min));

/** All rows passing the current filter set. */
export function view() {
  const f = S.filters;
  return S.rows.filter(r => {
    if (f.type !== 'all' && r.kind !== f.type) return false;
    if (f.aud !== 'all' && audienceOf(r) !== f.aud) return false;
    if (f.years && !f.years.has(r.date.getFullYear())) return false;
    const m = metaOf(r);
    if (f.genre && !(m && (m.genres || []).includes(f.genre))) return false;
    if (f.lang && !(m && m.lang === f.lang)) return false;
    if (f.country && !(m && (m.countries || []).includes(f.country))) return false;
    return true;
  });
}

export const groupBy = (rows, fn) => {
  const m = new Map();
  for (const r of rows) { const k = fn(r); if (k == null) continue; (m.get(k) || m.set(k, []).get(k)).push(r); }
  return m;
};

// --- series / film aggregates

/** One entry per distinct series, with everything the tables need. */
export function seriesAgg(rows) {
  const out = new Map();
  for (const r of rows) {
    if (r.kind !== 'episode') continue;
    let e = out.get(r.key);
    if (!e) out.set(r.key, e = {
      key: r.key, name: r.show, rows: [], eps: 0, minutes: 0,
      first: r.date, last: r.date, seasons: new Set(), episodes: new Set(),
    });
    e.rows.push(r); e.eps++; e.minutes += runtimeOf(r).min;
    if (r.date < e.first) e.first = r.date;
    if (r.date > e.last) e.last = r.date;
    if (r.season != null) e.seasons.add(r.season);
    if (r.episode) e.episodes.add(r.episode);
  }
  for (const e of out.values()) {
    const m = S.meta[e.key];
    e.meta = m && m.src !== 'miss' ? m : null;
    e.span = daysBetween(e.first, e.last) + 1;
    e.activeDays = new Set(e.rows.map(r => r.dayKey)).size;
    e.total = e.meta && e.meta.episodes ? e.meta.episodes : null;
    e.completion = e.total ? Math.min(1, e.episodes.size / e.total) : null;
    e.perDay = e.eps / Math.max(1, e.activeDays);
    e.value = isHours() ? e.minutes / 60 : e.eps;
  }
  return [...out.values()];
}

export function filmAgg(rows) {
  const out = new Map();
  for (const r of rows) {
    if (r.kind !== 'movie') continue;
    let e = out.get(r.key);
    if (!e) out.set(r.key, e = { key: r.key, name: r.show, rows: [], n: 0, minutes: 0, first: r.date, last: r.date });
    e.rows.push(r); e.n++; e.minutes += runtimeOf(r).min;
    if (r.date < e.first) e.first = r.date;
    if (r.date > e.last) e.last = r.date;
  }
  for (const e of out.values()) {
    const m = S.meta[e.key];
    e.meta = m && m.src !== 'miss' ? m : null;
    e.value = isHours() ? e.minutes / 60 : e.n;
  }
  return [...out.values()];
}

// --- time series

export const tallyMap = (rows, keyFn) => {
  const m = new Map();
  for (const r of rows) { const k = keyFn(r); if (k == null) continue; m.set(k, (m.get(k) || 0) + rowValue(r)); }
  return m;
};

export const byYear = rows => tallyMap(rows, r => r.date.getFullYear());
export const byYearMonth = rows => tallyMap(rows, r => `${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, '0')}`);
export const byMonthOfYear = rows => tallyMap(rows, r => r.date.getMonth());
export const byDow = rows => tallyMap(rows, r => r.date.getDay());
export const byDay = rows => tallyMap(rows, r => r.dayKey);

/** ISO-ish week key, Monday start. */
export function weekKey(d) {
  const t = new Date(d); t.setDate(t.getDate() - ((d.getDay() + 6) % 7));
  return dayKey(t);
}

// --- streaks, gaps, sessions

export function streaks(dayKeys) {
  const days = [...new Set(dayKeys)].sort();
  if (!days.length) return { longest: 0, longestStart: null, longestEnd: null, current: 0, gap: 0, gapStart: null, gapEnd: null };
  let best = 1, bs = days[0], be = days[0], cur = 1, cs = days[0];
  let gap = 0, gs = null, ge = null;
  for (let i = 1; i < days.length; i++) {
    const d = daysBetween(fromKey(days[i - 1]), fromKey(days[i]));
    if (d === 1) { cur++; if (cur > best) { best = cur; bs = cs; be = days[i]; } }
    else { cur = 1; cs = days[i]; if (d - 1 > gap) { gap = d - 1; gs = days[i - 1]; ge = days[i]; } }
  }
  // trailing streak
  let tail = 1;
  for (let i = days.length - 1; i > 0; i--) {
    if (daysBetween(fromKey(days[i - 1]), fromKey(days[i])) === 1) tail++; else break;
  }
  return { longest: best, longestStart: bs, longestEnd: be, current: tail, gap, gapStart: gs, gapEnd: ge, activeDays: days.length, first: days[0], last: days[days.length - 1] };
}

/**
 * A binge session = consecutive-ish viewing of one series, allowing a
 * `tolerance`-day pause before it counts as a separate sitting.
 */
export function bingeSessions(rows, tolerance = 2) {
  const out = [];
  for (const [, rs] of groupBy(rows.filter(r => r.kind === 'episode'), r => r.key)) {
    const sorted = [...rs].sort((a, b) => a.date - b.date);
    let cur = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      if (daysBetween(sorted[i - 1].date, sorted[i].date) <= tolerance) cur.push(sorted[i]);
      else { out.push(cur); cur = [sorted[i]]; }
    }
    out.push(cur);
  }
  return out.map(rs => ({
    name: rs[0].show, key: rs[0].key, rows: rs, eps: rs.length,
    minutes: sum(rs.map(r => runtimeOf(r).min)),
    start: rs[0].date, end: rs[rs.length - 1].date,
    days: daysBetween(rs[0].date, rs[rs.length - 1].date) + 1,
  })).map(s => Object.assign(s, { rate: s.eps / s.days, value: isHours() ? s.minutes / 60 : s.eps }));
}

// --- attribute tallies

/**
 * Tally an array-valued metadata attribute (genres, countries).
 * A title with three genres contributes its full value to each — so these
 * totals exceed the number of titles by design.
 */
export function tallyAttr(rows, pick) {
  const m = new Map();
  let missing = 0;
  for (const r of rows) {
    const meta = metaOf(r);
    const vals = meta ? pick(meta) : null;
    const arr = Array.isArray(vals) ? vals : (vals ? [vals] : []);
    if (!arr.length) { missing += rowValue(r); continue; }
    for (const v of arr) m.set(v, (m.get(v) || 0) + rowValue(r));
  }
  return { map: m, missing, list: [...m.entries()].map(([label, value]) => ({ label, value })).sort(by(x => x.value)) };
}

// --- misc

/** Days between a film's release and when it was watched. */
export function releaseLag(rows) {
  const out = [];
  for (const r of rows) {
    const m = metaOf(r);
    if (!m || !m.releaseDate) continue;
    const rel = new Date(m.releaseDate);
    if (isNaN(rel)) continue;
    const d = daysBetween(rel, r.date);
    if (d >= -30 && d < 40000) out.push({ row: r, days: d, meta: m });
  }
  return out;
}

/** Titles seen on more than one date. */
export function rewatches(rows) {
  const m = new Map();
  for (const r of rows) (m.get(r.title) || m.set(r.title, []).get(r.title)).push(r);
  return [...m.entries()]
    .filter(([, rs]) => new Set(rs.map(r => r.dayKey)).size > 1)
    .map(([title, rs]) => ({ title, rows: rs, n: rs.length, dates: rs.map(r => r.date).sort((a, b) => a - b) }))
    .sort(by(x => x.n));
}

/** Relatable yardsticks for a total number of minutes. */
export function equivalents(min) {
  const h = min / 60;
  return [
    [n1(h / 24), 'full days, back to back'],
    [n1(h / 8), 'working days'],
    [n1(h / 1.8), 'feature films'],
    [n1(min / 3.5), 'pop songs'],
    [n1(h / 11.4), 'runs of the extended Lord of the Rings trilogy'],
  ];
}

/** The headline numbers, computed once per render. */
export function overview(rows) {
  const eps = rows.filter(r => r.kind === 'episode');
  const films = rows.filter(r => r.kind === 'movie');
  const min = minutesOf(rows);
  const st = streaks(rows.map(r => r.dayKey));
  const cov = coverage(rows);
  const span = st.first ? daysBetween(fromKey(st.first), fromKey(st.last)) + 1 : 0;
  return {
    rows: rows.length, eps: eps.length, films: films.length,
    series: new Set(eps.map(r => r.key)).size,
    filmTitles: new Set(films.map(r => r.key)).size,
    minutes: min, hours: min / 60, st, cov, span,
    perActiveDay: st.activeDays ? rows.length / st.activeDays : 0,
    minPerActiveDay: st.activeDays ? min / st.activeDays : 0,
  };
}
