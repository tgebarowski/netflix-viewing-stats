// Number, date and duration formatting plus small list helpers.

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const sum = a => a.reduce((x, y) => x + y, 0);
export const uniq = a => [...new Set(a)];
/** Comparator on a derived key. Descending by default — these are "top N" lists. */
export const by = (f, dir = 1) => (a, b) => (f(a) < f(b) ? dir : f(a) > f(b) ? -dir : 0);
export const median = a => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
export const nfmt = n => (n == null || !isFinite(n)) ? '—' : Math.round(n).toLocaleString('en-US');
export const n1 = n => (n == null || !isFinite(n)) ? '—' : (Math.round(n * 10) / 10).toLocaleString('en-US');
export const pct = (a, b) => !b ? '0%' : Math.round(a / b * 100) + '%';

/** Human duration from minutes: "3d 4h", "12h 30m", "45m" */
export function dur(min) {
  if (!min || !isFinite(min)) return '0m';
  const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = Math.round(min % 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
}
export const hours = min => min / 60;

export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const MONTHS_L = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
export const DOW_L = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
export const PALETTE = ['--c1','--c4','--c3','--c2','--c5','--c7','--c6','--c10','--c8','--c9'].map(v => `var(${v})`);
export const color = i => PALETTE[i % PALETTE.length];

export const dayKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const fromKey = k => { const [y,m,d] = k.split('-').map(Number); return new Date(y, m-1, d); };
export const fmtDate = d => `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
export const fmtDateShort = d => `${MONTHS[d.getMonth()]} ${d.getDate()} ’${String(d.getFullYear()).slice(2)}`;
export const daysBetween = (a, b) => Math.round((b - a) / 86400000);

/** ISO-3166 alpha-2 → flag emoji */
export const flag = cc => (cc && cc.length === 2)
  ? String.fromCodePoint(...[...cc.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65))
  : '🏳️';
