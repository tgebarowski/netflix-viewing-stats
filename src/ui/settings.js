// Settings panel: API key, cache import/export and data reset.

import { $, el } from '../core/dom.js';
import { nfmt } from '../core/format.js';
import { LS } from '../core/storage.js';
import { S, saveMeta, saveOverrides } from '../data/state.js';
import { updateMetaStatus } from './chrome.js';
import { closePanels, openPanel } from './panels.js';
import { rebuild } from './render.js';

$('#btnSettings').addEventListener('click', () => {
  $('#tmdbKey').value = S.tmdbKey || '';
  const n = Object.keys(S.meta).length;
  const hit = Object.values(S.meta).filter(m => m.src !== 'miss').length;
  $('#cacheInfo').textContent = n
    ? `${nfmt(n)} titles cached — ${nfmt(hit)} resolved, ${nfmt(n - hit)} with no match. Roughly ${Math.round(JSON.stringify(S.meta).length / 1024)} KB.`
    : 'Nothing cached yet.';
  openPanel('#panelSettings');
});
$('#btnSaveKey').addEventListener('click', () => {
  S.tmdbKey = $('#tmdbKey').value.trim();
  LS.set('tmdbKey', S.tmdbKey);
  $('#btnSaveKey').textContent = 'Saved';
  setTimeout(() => ($('#btnSaveKey').textContent = 'Save'), 1400);
  updateMetaStatus();
});
$('#btnExport').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ meta: S.meta, overrides: S.overrides }, null, 1)], { type: 'application/json' });
  const a = el('a', { href: URL.createObjectURL(blob), download: 'netflix-metadata-cache.json' });
  document.body.append(a); a.click(); a.remove();
});
$('#btnImport').addEventListener('click', () => $('#importFile').click());
$('#importFile').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    Object.assign(S.meta, d.meta || d);
    if (d.overrides) Object.assign(S.overrides, d.overrides);
    saveMeta(); saveOverrides(); rebuild();
    $('#cacheInfo').textContent = `Imported — ${nfmt(Object.keys(S.meta).length)} titles now cached.`;
  } catch (err) { $('#cacheInfo').textContent = 'Could not read that file: ' + err.message; }
  e.target.value = '';
});
$('#btnClearCache').addEventListener('click', () => {
  S.meta = {}; LS.del('meta'); $('#cacheInfo').textContent = 'Cache cleared.'; rebuild();
});
$('#btnReload').addEventListener('click', () => { closePanels(); $('#file').click(); });
$('#btnClearAll').addEventListener('click', () => {
  ['rows', 'meta', 'overrides', 'cards', 'tab'].forEach(LS.del);
  location.reload();
});
