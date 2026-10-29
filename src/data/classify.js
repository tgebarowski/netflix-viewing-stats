// Turning Netflix title strings into shows, seasons and episodes.

/**
 * Netflix encodes structure in the title string as colon-separated segments.
 * A segment that looks like a season/part marker means everything before it
 * is the show name. Prefix-anchored, matching how Netflix formats these.
 */
export const SEASON_MARKER = /^(seasons?\s+\d+|seasons?\s+[ivxl]+\b|limited series|limited event series|part\s+\d+|part\s+[ivxl]+\b|book\s+\d+|volume\s+\d+|vol\.?\s*\d+|chapter\s+\d+|episode\s+\d+|final season|series\s+\d+|the series|miniseries|collection)\b/i;

/** Pull a numeric season out of a marker label where one exists. */
export function seasonNum(label) {
  if (!label) return null;
  const m = label.match(/(?:season|book|volume|vol\.?|part|series)\s*(\d+)/i);
  if (m) return +m[1];
  const r = label.match(/(?:season|part)\s+([ivxl]+)\b/i);
  if (r) {
    const R = { i: 1, v: 5, x: 10, l: 50 }; let n = 0, p = 0;
    for (const ch of r[1].toLowerCase().split('').reverse()) {
      const v = R[ch]; n += v < p ? -v : v; p = Math.max(p, v);
    }
    return n;
  }
  if (/limited|miniseries/i.test(label)) return 1;
  return null;
}

/** Normalised key used for metadata lookup + caching. */
export const normKey = s => s.toLowerCase()
  .replace(/[’'`]/g, '').replace(/&/g, 'and')
  .replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Two-pass classifier.
 *  Pass 1 — season markers  →  "Show: Season 2: Episode"        (majority)
 *  Pass 2 — repeated prefix →  "Show: Episode"   (older export format)
 *  Rest   — treated as a film, subject to later TMDB verification.
 */
export function classify(rows) {
  const segsOf = t => t.split(':').map(s => s.trim()).filter(Boolean);

  // Pass 1
  const leftover = [];
  for (const r of rows) {
    const p = segsOf(r.title);
    let idx = -1;
    for (let i = 1; i < p.length; i++) if (SEASON_MARKER.test(p[i])) { idx = i; break; }
    if (idx > 0) {
      r.kind = 'episode';
      r.show = p.slice(0, idx).join(': ');
      r.seasonLabel = p[idx];
      r.season = seasonNum(p[idx]);
      r.episode = p.slice(idx + 1).join(': ') || p[idx];
      r.tier = 1;
    } else { leftover.push(r); }
  }

  // Pass 2 — a leading segment shared by several rows is a show, not a film subtitle
  const prefCount = new Map();
  for (const r of leftover) {
    const p = segsOf(r.title);
    if (p.length < 2) continue;
    prefCount.set(p[0], (prefCount.get(p[0]) || 0) + 1);
  }
  for (const r of leftover) {
    const p = segsOf(r.title);
    if (p.length >= 2 && prefCount.get(p[0]) > 1) {
      r.kind = 'episode'; r.show = p[0]; r.seasonLabel = null; r.season = null;
      r.episode = p.slice(1).join(': '); r.tier = 2;
    } else {
      r.kind = 'movie'; r.show = r.title; r.seasonLabel = null; r.season = null;
      r.episode = null; r.tier = 3;
    }
  }

  for (const r of rows) r.key = normKey(r.show);
  return rows;
}

/**
 * Apply user/TMDB reclassification of a title between film and series.
 * The lookup key deliberately stays as classify() assigned it: metadata was
 * fetched under that key, and re-keying here would orphan it.
 */
export function applyOverrides(rows, ov) {
  for (const r of rows) {
    const o = ov[r.key];
    if (!o || !o.kind || o.kind === r.kind) continue;
    if (o.kind === 'movie') { r.kind = 'movie'; r.show = r.title; r.episode = null; r.season = null; r.seasonLabel = null; }
    else r.kind = 'episode';
    r.overridden = true;
  }
  return rows;
}
