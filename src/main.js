// Entry point. Wires the UI modules together and restores the history that was
// loaded on the last visit, if there is one.

import { fromKey } from './core/format.js';
import { LS } from './core/storage.js';
import { applyOverrides, classify } from './data/classify.js';
import { S, recalcFallbacks } from './data/state.js';
import { setTheme } from './ui/theme.js';
import { bootApp } from './ui/loader.js';

// Imported for their side effects: each one wires up a part of the chrome.
import './ui/panels.js';
import './ui/render.js';
import './ui/filters.js';
import './ui/enrichment.js';
import './ui/settings.js';

setTheme(LS.get('theme', 'dark'));

const saved = LS.get('rows', null);
if (saved && saved.length) {
  const rows = saved
    .map(([title, key]) => ({ title, date: fromKey(key), dayKey: key }))
    .filter(r => !isNaN(r.date))
    .sort((a, b) => a.date - b.date);
  S.rows = classify(rows);
  applyOverrides(S.rows, S.overrides);
  recalcFallbacks();
  bootApp();
}
