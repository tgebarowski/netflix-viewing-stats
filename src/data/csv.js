// Netflix CSV export parsing: fields, header detection and locale-dependent dates.

/** RFC-4180-ish CSV parser: handles quoted fields, embedded commas, "" escapes. */
export function parseCSV(text) {
  const out = [];
  let row = [], field = '', q = false, i = 0;
  text = text.replace(/^﻿/, '');            // strip BOM
  while (i < text.length) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        q = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { q = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { row.push(field); out.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  if (field !== '' || row.length) { row.push(field); out.push(row); }
  return out.filter(r => r.some(c => c.trim() !== ''));
}

/**
 * Netflix writes dates as M/D/YY (US locale) or occasionally D/M/YYYY / YYYY-MM-DD
 * depending on account region. Detect by scanning: if any first component > 12 the
 * file must be D/M; otherwise assume M/D, which is what Netflix ships by default.
 */
export function detectDateOrder(raw) {
  let firstOver12 = false, secondOver12 = false;
  for (const s of raw) {
    const p = s.split(/[\/\-.]/).map(Number);
    if (p.length !== 3 || p.some(isNaN)) continue;
    if (p[0] > 12 && p[0] < 32) firstOver12 = true;
    if (p[1] > 12 && p[1] < 32) secondOver12 = true;
  }
  if (firstOver12 && !secondOver12) return 'dmy';
  return 'mdy';
}

export function parseDate(s, order) {
  s = s.trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (!m) return null;
  let a = +m[1], b = +m[2], y = +m[3];
  if (y < 100) y += y > 70 ? 1900 : 2000;
  const [mo, d] = order === 'dmy' ? [b, a] : [a, b];
  const dt = new Date(y, mo - 1, d);
  return isNaN(dt) ? null : dt;
}
