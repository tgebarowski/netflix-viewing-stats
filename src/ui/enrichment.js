// Enrichment panel: progress, logging and run control.

import { $, el } from '../core/dom.js';
import { dur, n1, nfmt } from '../core/format.js';
import { ENRICH, lookupTargets } from '../data/metadata.js';
import { S } from '../data/state.js';
import { closePanels, openPanel } from './panels.js';
import { rebuild } from './render.js';

$('#btnEnrich').addEventListener('click', () => {
  const pending = lookupTargets(false).length;
  $('#enrichIntro').replaceChildren(S.tmdbKey
    ? el('p', { class: 'help', style: { margin: '0 0 12px' } },
        `${nfmt(pending)} titles still need metadata. TMDB will be queried first, with TVMaze as a fallback for series. Results are cached, so this is a one-time cost.`)
    : el('div', { class: 'warn' },
        el('b', {}, 'No TMDB key set. '),
        'Only series can be resolved, through TVMaze — films will have no genre, language, country or runtime. ',
        el('a', { href: '#', onclick: e => { e.preventDefault(); closePanels(); openPanel('#panelSettings'); } }, 'Add a key'),
        ' for full coverage.'));
  $('#progLog').textContent = '';
  $('#progBar').style.width = '0%';
  $('#progText').textContent = pending ? `${nfmt(pending)} titles queued` : 'Nothing pending — tick “re-fetch cached” to run anyway.';
  openPanel('#panelEnrich');
});

$('#btnStop').addEventListener('click', () => { ENRICH.sig.stopped = true; $('#btnStop').disabled = true; });

$('#btnRun').addEventListener('click', async () => {
  if (ENRICH.running) return;
  const run = $('#btnRun'), stop = $('#btnStop'), bar = $('#progBar'), txt = $('#progText'), log = $('#progLog');
  run.disabled = true; stop.disabled = false;
  run.innerHTML = '<span class="spin">◐</span> Working';
  const t0 = Date.now();
  let lines = 0;
  const res = await runEnrichment({
    refetch: $('#chkRefetch').checked,
    onProgress: (done, total) => {
      bar.style.width = (done / Math.max(1, total) * 100) + '%';
      const rate = done / Math.max(0.001, (Date.now() - t0) / 1000);
      txt.textContent = `${done} of ${total} · ${n1(rate)}/s · about ${dur((total - done) / Math.max(rate, .01) / 60)} left`;
    },
    onLog: line => {
      if (++lines > 400) return;
      log.textContent += line + '\n';
      log.scrollTop = log.scrollHeight;
    },
  });
  run.disabled = false; stop.disabled = true; run.textContent = 'Start';
  bar.style.width = '100%';
  if (res.fatal) {
    txt.textContent = 'Stopped.';
    $('#enrichIntro').replaceChildren(el('div', { class: 'warn' }, res.fatal));
  } else {
    txt.textContent = `Done — ${nfmt(res.ok)} resolved, ${nfmt(res.miss)} without a match${res.stopped ? ' (stopped early)' : ''}.`;
  }
  rebuild();
});
