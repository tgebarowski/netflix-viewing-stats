// Dependency-free SVG chart primitives.

import { el, svgEl, tipHide, tipShow, tipify } from '../core/dom.js';
import { MONTHS, MONTHS_L, clamp, color, dayKey, daysBetween, fmtDate, nfmt, pct, sum } from '../core/format.js';

/**
 * Wrap a width-aware builder so it redraws when its container resizes.
 * Deliberately avoids requestAnimationFrame for the first paint: browsers pause
 * rAF in hidden tabs, which would leave every chart blank until the tab is
 * focused. A macrotask still runs, so the initial draw always happens.
 */
export function responsive(build) {
  const box = el('div');
  let last = 0;
  const draw = () => {
    const w = Math.floor(box.clientWidth);
    if (!w || Math.abs(w - last) < 4) return;
    last = w;
    box.replaceChildren(build(w));
  };
  new ResizeObserver(draw).observe(box);
  setTimeout(draw, 0);          // after the node has been inserted and laid out
  box._redraw = () => { last = 0; draw(); };
  REDRAWABLE.add(box);
  return box;
}
export const REDRAWABLE = new Set();
const redrawAll = () => { for (const b of REDRAWABLE) if (b.isConnected) b._redraw(); else REDRAWABLE.delete(b); };
document.addEventListener('visibilitychange', () => { if (!document.hidden) redrawAll(); });

let resizeTimer = 0;
addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(redrawAll, 180); });

export { redrawAll };

/** Heat ramp: 0 → surface, 1 → accent. */
export function ramp(t) {
  const dark = document.documentElement.dataset.theme === 'dark';
  const a = dark ? [30, 30, 36] : [232, 232, 238], b = [229, 9, 20];
  if (!(t > 0)) return `rgb(${a.join(',')})`;
  const e = Math.pow(Math.min(t, 1), 0.6);
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * e)).join(',')})`;
}

// --- horizontal bar list (HTML, not SVG)
/** items: [{label, value, sub, icon, click}] */
export function barRows(items, opts = {}) {
  const fmt = opts.fmt || nfmt;
  const max = opts.max || Math.max(1, ...items.map(i => i.value));
  const wrap = el('div', { class: 'rows' });
  if (!items.length) return el('div', { class: 'empty', text: opts.emptyText || 'No data' });
  items.forEach((it, i) => {
    const row = el('div', { class: 'row' + (it.click ? ' click' : '') });
    if (it.click) row.addEventListener('click', it.click);
    row.append(
      el('div', { class: 'rl' },
        opts.rank ? el('span', { class: 'rank', text: i + 1 }) : null,
        it.icon ? el('span', { class: 'flag', text: it.icon }) : null,
        el('span', { class: 'trunc', style: { minWidth: 0 }, text: it.label })),
      el('div', { class: 'rv', text: fmt(it.value) + (it.sub ? '  ' : '') },
        it.sub ? el('span', { class: 'dim', text: it.sub }) : null),
      el('div', { class: 'rbar' },
        el('i', { style: { width: Math.max(1.5, it.value / max * 100) + '%', background: opts.color ? opts.color(i, it) : 'var(--accent)' } })));
    if (it.tip) tipify(row, () => it.tip);
    wrap.append(row);
  });
  return wrap;
}

// --- vertical columns
/** items: [{label, value, tip, dim}] */
export function columns(items, opts = {}) {
  const H = opts.height || 150, fmt = opts.fmt || nfmt;
  return responsive(W => {
    const padB = 20, padT = 16, h = H - padB - padT;
    const max = Math.max(1, ...items.map(i => i.value));
    const n = items.length, gap = n > 30 ? 1 : n > 14 ? 2 : 4;
    const bw = Math.max(1, (W - (n - 1) * gap) / n);
    const g = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H });
    // baseline + mid gridline
    g.append(svgEl('line', { x1: 0, x2: W, y1: padT + h, y2: padT + h, stroke: 'var(--grid)' }));
    g.append(svgEl('line', { x1: 0, x2: W, y1: padT + h / 2, y2: padT + h / 2, stroke: 'var(--grid)', 'stroke-dasharray': '2 3' }));
    items.forEach((it, i) => {
      const bh = Math.max(it.value > 0 ? 2 : 0, it.value / max * h);
      const x = i * (bw + gap);
      const rect = svgEl('rect', {
        x, y: padT + h - bh, width: bw, height: bh, rx: Math.min(3, bw / 2.5),
        fill: it.dim ? 'var(--bg4)' : (opts.color ? opts.color(i, it) : 'var(--accent)'),
        opacity: opts.fade ? (0.45 + 0.55 * (it.value / max)) : 1,
      });
      tipify(rect, () => it.tip || `<b>${it.label}</b>${fmt(it.value)}`);
      g.append(rect);
      const showLabel = opts.everyLabel ? (i % opts.everyLabel === 0) : (n <= 16 || i % Math.ceil(n / 12) === 0);
      if (showLabel && it.label != null)
        g.append(svgEl('text', { x: x + bw / 2, y: H - 6, 'text-anchor': 'middle', class: 'sx' }, it.label));
    });
    if (opts.showMax !== false)
      g.append(svgEl('text', { x: 0, y: 11, class: 'sx' }, fmt(max) + (opts.unit ? ' ' + opts.unit : '')));
    return g;
  });
}

// --- line / area over time
/** pts: [{x:number, y:number, label}] — x already numeric & sorted. */
export function lineChart(pts, opts = {}) {
  const H = opts.height || 150, fmt = opts.fmt || nfmt;
  return responsive(W => {
    const padT = 14, padB = 20, h = H - padT - padB;
    const xs = pts.map(p => p.x), max = Math.max(1, ...pts.map(p => p.y));
    const x0 = Math.min(...xs), x1 = Math.max(...xs) || 1;
    const X = v => (x1 === x0 ? W / 2 : (v - x0) / (x1 - x0) * W);
    const Y = v => padT + h - v / max * h;
    const g = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H });
    g.append(svgEl('line', { x1: 0, x2: W, y1: padT + h, y2: padT + h, stroke: 'var(--grid)' }));
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join('');
    const area = `${d}L${X(x1).toFixed(1)},${padT + h}L${X(x0).toFixed(1)},${padT + h}Z`;
    const id = 'grad' + Math.random().toString(36).slice(2, 8);
    g.append(svgEl('defs', {}, svgEl('linearGradient', { id, x1: 0, y1: 0, x2: 0, y2: 1 },
      svgEl('stop', { offset: 0, 'stop-color': 'var(--accent)', 'stop-opacity': .3 }),
      svgEl('stop', { offset: 1, 'stop-color': 'var(--accent)', 'stop-opacity': 0 }))));
    g.append(svgEl('path', { d: area, fill: `url(#${id})` }));
    g.append(svgEl('path', { d, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 1.8, 'stroke-linejoin': 'round' }));
    g.append(svgEl('text', { x: 0, y: 10, class: 'sx' }, fmt(max)));
    // hover band
    const hit = svgEl('rect', { x: 0, y: 0, width: W, height: H, fill: 'transparent' });
    const dot = svgEl('circle', { r: 3.5, fill: 'var(--accent)', stroke: 'var(--bg2)', 'stroke-width': 2, opacity: 0 });
    hit.addEventListener('mousemove', e => {
      const bb = g.getBoundingClientRect();
      const px = (e.clientX - bb.left) / bb.width * W;
      let best = pts[0], bd = 1e9;
      for (const p of pts) { const dd = Math.abs(X(p.x) - px); if (dd < bd) { bd = dd; best = p; } }
      dot.setAttribute('cx', X(best.x)); dot.setAttribute('cy', Y(best.y)); dot.setAttribute('opacity', 1);
      tipShow(e, `<b>${best.label}</b>${fmt(best.y)}`);
    });
    hit.addEventListener('mouseleave', () => { dot.setAttribute('opacity', 0); tipHide(); });
    g.append(hit, dot);
    if (opts.xLabels) for (const [v, t] of opts.xLabels)
      g.append(svgEl('text', { x: clamp(X(v), 12, W - 12), y: H - 5, 'text-anchor': 'middle', class: 'sx' }, t));
    return g;
  });
}

// --- stacked area
/** xs: [labels], series: [{name, values:[...]}] */
export function stackedArea(xs, series, opts = {}) {
  const H = opts.height || 190;
  return responsive(W => {
    const padT = 10, padB = 20, h = H - padT - padB;
    const n = xs.length;
    const totals = xs.map((_, i) => sum(series.map(s => s.values[i] || 0)));
    const max = Math.max(1, ...totals);
    const X = i => n === 1 ? W / 2 : i / (n - 1) * W;
    const Y = v => padT + h - v / max * h;
    const g = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H });
    let base = xs.map(() => 0);
    series.forEach((s, si) => {
      const top = base.map((b, i) => b + (s.values[i] || 0));
      const d = top.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join('')
        + base.map((v, i) => `L${X(n - 1 - i).toFixed(1)},${Y(base[n - 1 - i]).toFixed(1)}`).join('') + 'Z';
      const p = svgEl('path', { d, fill: color(si), opacity: .85 });
      tipify(p, () => `<b>${s.name}</b>${nfmt(sum(s.values))} total`);
      g.append(p);
      base = top;
    });
    g.append(svgEl('line', { x1: 0, x2: W, y1: padT + h, y2: padT + h, stroke: 'var(--grid)' }));
    xs.forEach((x, i) => {
      if (n > 12 && i % Math.ceil(n / 10)) return;
      g.append(svgEl('text', { x: clamp(X(i), 10, W - 10), y: H - 5, 'text-anchor': 'middle', class: 'sx' }, x));
    });
    return g;
  });
}

// --- year × month matrix
export function matrixHeat(years, get, opts = {}) {
  const fmt = opts.fmt || nfmt;
  return responsive(W => {
    const labelW = 34, gap = 2, rowH = 19;
    const cw = (W - labelW - gap * 11) / 12;
    const H = years.length * (rowH + gap) + 18;
    const g = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H });
    let max = 0;
    for (const y of years) for (let m = 0; m < 12; m++) max = Math.max(max, get(y, m));
    MONTHS.forEach((mn, m) =>
      g.append(svgEl('text', { x: labelW + m * (cw + gap) + cw / 2, y: 9, 'text-anchor': 'middle', class: 'sx' }, mn[0])));
    years.forEach((y, r) => {
      const yy = 15 + r * (rowH + gap);
      g.append(svgEl('text', { x: 0, y: yy + rowH / 2 + 3.5, class: 'sx' }, y));
      for (let m = 0; m < 12; m++) {
        const v = get(y, m);
        const rect = svgEl('rect', {
          x: labelW + m * (cw + gap), y: yy, width: Math.max(1, cw), height: rowH, rx: 3,
          fill: ramp(max ? v / max : 0),
        });
        tipify(rect, () => `<b>${MONTHS_L[m]} ${y}</b>${fmt(v)}`);
        g.append(rect);
      }
    });
    return g;
  });
}

// --- GitHub-style calendar
export function calendarYear(year, get, opts = {}) {
  const fmt = opts.fmt || nfmt;
  return responsive(W => {
    const labelW = 22, gap = 2;
    const jan = new Date(year, 0, 1), dec = new Date(year, 11, 31);
    const startPad = jan.getDay();
    const weeks = Math.ceil((startPad + (daysBetween(jan, dec) + 1)) / 7);
    const cell = clamp((W - labelW - (weeks - 1) * gap) / weeks, 4, 16);
    const H = 7 * (cell + gap) + 16;
    const g = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H });
    let max = 0;
    for (let d = new Date(jan); d <= dec; d.setDate(d.getDate() + 1)) max = Math.max(max, get(dayKey(d)));
    const seen = new Set();
    for (let d = new Date(jan); d <= dec; d.setDate(d.getDate() + 1)) {
      const idx = startPad + daysBetween(jan, d);
      const wk = Math.floor(idx / 7), dw = idx % 7;
      const k = dayKey(d), v = get(k);
      const x = labelW + wk * (cell + gap), y = 12 + dw * (cell + gap);
      const rect = svgEl('rect', { x, y, width: cell, height: cell, rx: Math.min(2.5, cell / 3), fill: ramp(max ? v / max : 0) });
      const dd = new Date(d);
      tipify(rect, () => `<b>${fmtDate(dd)}</b>${v ? fmt(v) : 'nothing watched'}`);
      g.append(rect);
      if (d.getDate() <= 7 && !seen.has(d.getMonth())) {
        seen.add(d.getMonth());
        g.append(svgEl('text', { x, y: 7, class: 'sx' }, MONTHS[d.getMonth()]));
      }
    }
    ['M', 'W', 'F'].forEach((t, i) =>
      g.append(svgEl('text', { x: 0, y: 12 + (1 + i * 2) * (cell + gap) + cell * .78, class: 'sx' }, t)));
    return g;
  });
}

// --- donut
export function donut(items, opts = {}) {
  const fmt = opts.fmt || nfmt;
  const total = sum(items.map(i => i.value));
  const H = opts.height || 160;
  return responsive(W => {
    const R = Math.min(W, H) / 2 - 4, r = R * .62, cx = W / 2, cy = H / 2;
    const g = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H });
    if (!total) return g;
    let a = -Math.PI / 2;
    items.forEach((it, i) => {
      const frac = it.value / total, a2 = a + frac * Math.PI * 2;
      const big = frac > .5 ? 1 : 0;
      const P = (ang, rad) => `${(cx + Math.cos(ang) * rad).toFixed(2)},${(cy + Math.sin(ang) * rad).toFixed(2)}`;
      // A full ring needs two 180° arcs per circle — one arc cannot close a circle.
      const d = frac >= .9999
        ? `M${cx},${cy - R}A${R},${R} 0 1 1 ${cx},${cy + R}A${R},${R} 0 1 1 ${cx},${cy - R}Z`
        + `M${cx},${cy - r}A${r},${r} 0 1 1 ${cx},${cy + r}A${r},${r} 0 1 1 ${cx},${cy - r}Z`
        : `M${P(a, R)}A${R},${R} 0 ${big} 1 ${P(a2, R)}L${P(a2, r)}A${r},${r} 0 ${big} 0 ${P(a, r)}Z`;
      const p = svgEl('path', { d, fill: it.color || color(i), 'fill-rule': 'evenodd' });
      tipify(p, () => `<b>${it.label}</b>${fmt(it.value)} · ${pct(it.value, total)}`);
      g.append(p);
      a = a2;
    });
    if (opts.center) {
      g.append(svgEl('text', { x: cx, y: cy - 2, 'text-anchor': 'middle', style: 'fill:var(--fg);font-size:19px;font-weight:680' }, opts.center));
      if (opts.centerSub)
        g.append(svgEl('text', { x: cx, y: cy + 14, 'text-anchor': 'middle', class: 'sx' }, opts.centerSub));
    }
    return g;
  });
}

/** Colour-swatch legend for donuts / stacked areas. */
export function legend(items, opts = {}) {
  return el('div', { class: 'legend' }, items.map((it, i) =>
    el('span', {}, el('i', { style: { background: it.color || color(i) } }),
      it.label + (opts.values ? ` ${(opts.fmt || nfmt)(it.value)}` : ''))));
}

// --- histogram
export function histogram(values, opts = {}) {
  if (!values.length) return el('div', { class: 'empty', text: 'No data' });
  const lo = opts.min != null ? opts.min : Math.min(...values);
  const hi = opts.max != null ? opts.max : Math.max(...values);
  const nb = opts.bins || 20, w = (hi - lo) / nb || 1;
  const bins = Array.from({ length: nb }, () => 0);
  for (const v of values) bins[clamp(Math.floor((v - lo) / w), 0, nb - 1)]++;
  return columns(bins.map((c, i) => ({
    label: opts.label ? opts.label(lo + i * w) : Math.round(lo + i * w),
    value: c,
    tip: `<b>${opts.label ? opts.label(lo + i * w) : Math.round(lo + i * w)}–${opts.label ? opts.label(lo + (i + 1) * w) : Math.round(lo + (i + 1) * w)}</b>${c} titles`,
  })), { height: opts.height || 130, everyLabel: Math.ceil(nb / 6) });
}
