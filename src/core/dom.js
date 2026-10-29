// Tiny DOM/SVG element builders and the shared hover tooltip.

import { clamp } from './format.js';

export const $ = s => document.querySelector(s);
export const $$ = s => [...document.querySelectorAll(s)];
export const el = (t, a = {}, ...kids) => {
  const n = document.createElement(t);
  for (const [k, v] of Object.entries(a)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
    else n.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) n.append(c.nodeType ? c : String(c));
  return n;
};
export const svgEl = (t, a = {}, ...kids) => {
  const n = document.createElementNS('http://www.w3.org/2000/svg', t);
  for (const [k, v] of Object.entries(a)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) n.append(c.nodeType ? c : String(c));
  return n;
};

/* Tooltip -------------------------------------------------------- */
export const TIP = $('#tip');
export function tipShow(e, html) {
  TIP.innerHTML = html; TIP.classList.add('on');
  const r = TIP.getBoundingClientRect();
  TIP.style.left = clamp(e.clientX + 14, 8, innerWidth - r.width - 8) + 'px';
  TIP.style.top = clamp(e.clientY + 14, 8, innerHeight - r.height - 8) + 'px';
}
export const tipHide = () => TIP.classList.remove('on');
/** Attach tooltip behaviour to any element. `fn` returns HTML or falsy. */
export function tipify(node, fn) {
  node.addEventListener('mousemove', e => { const h = fn(); h ? tipShow(e, h) : tipHide(); });
  node.addEventListener('mouseleave', tipHide);
  return node;
}
