// Application state, runtime estimation and audience inference.

import { median } from '../core/format.js';
import { LS } from '../core/storage.js';

export const S = {
  rows: [],                 // every viewing event, classified
  meta: LS.get('meta', {}), // lookup key -> metadata record
  overrides: LS.get('overrides', {}),
  tmdbKey: LS.get('tmdbKey', ''),
  order: 'mdy',
  filters: { basis: 'count', type: 'all', aud: 'all', years: null, genre: null, lang: null, country: null },
  tab: 'overview',
  cards: LS.get('cards', {}),
  fallback: { episode: 35, movie: 105, byGenre: {} },
};

/** Metadata record for a row, or null. */
export const metaOf = r => S.meta[r.key] || null;

/** Genre list for a row (possibly empty). */
export const genresOf = r => { const m = metaOf(r); return m && m.genres ? m.genres : []; };

/**
 * Runtime in minutes for one viewing event, plus whether it was estimated.
 * Real runtimes come from TMDB/TVMaze. Missing ones fall back to the median of
 * resolved titles sharing a genre, then to the median for that kind — so a
 * missing preschool cartoon lands near 11 minutes, not a generic 45.
 */
export function runtimeOf(r) {
  const m = metaOf(r);
  if (m && m.runtime > 0) return { min: m.runtime, est: false };
  const g = m && m.genres && m.genres.length ? m.genres : null;
  if (g) {
    const vals = g.map(x => S.fallback.byGenre[r.kind + '|' + x]).filter(v => v > 0);
    if (vals.length) return { min: median(vals), est: true };
  }
  return { min: S.fallback[r.kind] || 40, est: true };
}

/** Recompute the self-calibrating runtime fallbacks from whatever is resolved. */
export function recalcFallbacks() {
  const buckets = {}, kinds = { episode: [], movie: [] };
  for (const r of S.rows) {
    const m = metaOf(r);
    if (!m || !(m.runtime > 0)) continue;
    kinds[r.kind]?.push(m.runtime);
    for (const g of (m.genres || [])) (buckets[r.kind + '|' + g] ||= []).push(m.runtime);
  }
  S.fallback.byGenre = {};
  for (const [k, v] of Object.entries(buckets)) if (v.length >= 3) S.fallback.byGenre[k] = median(v);
  if (kinds.episode.length) S.fallback.episode = median(kinds.episode);
  if (kinds.movie.length) S.fallback.movie = median(kinds.movie);
}

export const KID_GENRES = new Set(['Kids', 'Family', 'Children']);
export const KID_RATINGS = new Set(['TV-Y', 'TV-Y7', 'TV-Y7-FV', 'TV-G', 'G', 'PG', 'ALL', '0', '6', '7']);

/** 'kids' | 'adult' — resolved from override, then metadata, then runtime shape. */
export function audienceOf(r) {
  const o = S.overrides[r.key];
  if (o && o.aud) return o.aud;
  const m = metaOf(r);
  if (m) {
    const g = m.genres || [];
    if (g.some(x => KID_GENRES.has(x))) return 'kids';
    if (m.rating && KID_RATINGS.has(String(m.rating).toUpperCase())) {
      if (g.includes('Animation') || g.includes('Comedy') || !g.length) return 'kids';
    }
    if (g.includes('Animation') && m.runtime > 0 && m.runtime <= 15) return 'kids';
    if (m.adult === false && m.runtime > 0 && m.runtime <= 12 && r.kind === 'episode') return 'kids';
    return 'adult';
  }
  return 'adult';
}

/** Persist metadata, shrinking oldest-first if localStorage is full. */
export function saveMeta() {
  if (LS.set('meta', S.meta)) return;
  const entries = Object.entries(S.meta).sort((a, b) => (a[1].ts || 0) - (b[1].ts || 0));
  while (entries.length && !LS.set('meta', Object.fromEntries(entries))) entries.splice(0, 50);
  S.meta = Object.fromEntries(entries);
}
export const saveOverrides = () => LS.set('overrides', S.overrides);

/** How much of the history has real (non-estimated) runtime data. */
export function coverage(rows = S.rows) {
  let real = 0, withMeta = 0;
  for (const r of rows) {
    const m = metaOf(r);
    if (m && m.src !== 'miss') withMeta++;
    if (m && m.runtime > 0) real++;
  }
  return { real, withMeta, total: rows.length, pctReal: rows.length ? real / rows.length : 0 };
}
