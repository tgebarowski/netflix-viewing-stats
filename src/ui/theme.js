// Light/dark theme switching.

import { $ } from '../core/dom.js';
import { LS } from '../core/storage.js';
import { redrawAll } from './charts.js';

export function setTheme(t) {
  document.documentElement.dataset.theme = t;
  LS.set('theme', t);
  redrawAll();
}
$('#btnTheme').addEventListener('click', () =>
  setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
