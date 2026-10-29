// CSV ingestion, drag-and-drop and application boot.

import { $ } from '../core/dom.js';
import { dayKey } from '../core/format.js';
import { LS } from '../core/storage.js';
import { applyOverrides, classify } from '../data/classify.js';
import { detectDateOrder, parseCSV, parseDate } from '../data/csv.js';
import { lookupTargets } from '../data/metadata.js';
import { S, recalcFallbacks } from '../data/state.js';
import { TABS } from './cards/index.js';
import { renderTabs, renderYearChips } from './filters.js';
import { render } from './render.js';

export function ingest(text) {
  const table = parseCSV(text);
  if (!table.length) throw new Error('That file appears to be empty.');
  // locate the header row and the two columns we need
  let hi = table.findIndex(r => r.some(c => /^\s*title\s*$/i.test(c)) && r.some(c => /date/i.test(c)));
  if (hi < 0) hi = 0;
  const head = table[hi].map(c => c.trim().toLowerCase());
  let ti = head.findIndex(c => c === 'title'), di = head.findIndex(c => c.includes('date'));
  if (ti < 0 || di < 0) { ti = 0; di = 1; hi = -1; }
  const body = table.slice(hi + 1).filter(r => r[ti] && r[di]);
  if (!body.length) throw new Error('No rows with a title and a date were found. Is this the Netflix viewing-activity export?');

  S.order = detectDateOrder(body.map(r => r[di]));
  const rows = [];
  for (const r of body) {
    const d = parseDate(r[di], S.order);
    if (!d) continue;
    rows.push({ title: r[ti].trim(), date: d, dayKey: dayKey(d) });
  }
  if (!rows.length) throw new Error('None of the dates could be parsed.');
  rows.sort((a, b) => a.date - b.date);

  S.rows = classify(rows);
  applyOverrides(S.rows, S.overrides);
  recalcFallbacks();
  LS.set('rows', rows.map(r => [r.title, r.dayKey]));
  return rows.length;
}

export function bootApp() {
  $('#landing').hidden = true;
  $('#app').hidden = false;
  S.tab = LS.get('tab', 'overview');
  if (!TABS.some(t => t[0] === S.tab)) S.tab = 'overview';
  renderTabs(); renderYearChips(); render();
}

/** Parse, show the dashboard, and offer enrichment if anything is unresolved. */
function load(text, { enrich = true } = {}) {
  ingest(text);
  bootApp();
  if (enrich && lookupTargets(false).length) setTimeout(() => $('#btnEnrich').click(), 400);
}

async function handleFile(file) {
  try { load(await file.text()); }
  catch (err) { alert(err.message); }
}

$('#btnSample').addEventListener('click', async e => {
  e.preventDefault();
  try {
    // Resolved against this module, so it survives being served from a subpath.
    const url = new URL('../../sample/viewing-history-sample.csv', import.meta.url);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`sample data unavailable (${res.status})`);
    load(await res.text(), { enrich: false });
  } catch (err) {
    alert(`Could not load the sample: ${err.message}`);
  }
});

$('#file').addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = ''; });
$('#drop').addEventListener('click', () => $('#file').click());
['dragenter', 'dragover'].forEach(t => $('#drop').addEventListener(t, e => { e.preventDefault(); $('#drop').classList.add('over'); }));
['dragleave', 'drop'].forEach(t => $('#drop').addEventListener(t, e => { e.preventDefault(); $('#drop').classList.remove('over'); }));
$('#drop').addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) handleFile(f); });
addEventListener('dragover', e => e.preventDefault());
addEventListener('drop', e => e.preventDefault());
