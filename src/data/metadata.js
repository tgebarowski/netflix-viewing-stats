// Metadata enrichment against TMDB (primary) and TVMaze (keyless fallback).

import { flag, sum, uniq } from '../core/format.js';
import { applyOverrides, normKey } from './classify.js';
import { langName } from './reference.js';
import { S, recalcFallbacks, saveMeta, saveOverrides } from './state.js';

export const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * fetch + JSON with retry/backoff. Returns null on 404 (a legitimate "no match").
 * Rate-limit waits do not consume a retry attempt, otherwise a burst of 429s
 * would burn through the budget without ever really trying.
 */
async function fetchJSON(url, sig) {
  let attempt = 0, throttled = 0;
  while (attempt < 4 && throttled < 8) {
    if (sig && sig.stopped) throw new Error('stopped');
    let res;
    try { res = await fetch(url); }
    catch (e) { attempt++; if (attempt >= 4) throw new Error('network'); await sleep(600 * attempt); continue; }
    if (res.status === 429) { throttled++; await sleep(((+res.headers.get('retry-after') || 1) + 0.4) * 1000); continue; }
    if (res.status === 401 || res.status === 403) throw new Error('bad-key');
    if (res.status === 404) return null;
    if (res.status >= 500) { attempt++; if (attempt >= 4) throw new Error('HTTP ' + res.status); await sleep(600 * attempt); continue; }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    try { return await res.json(); }
    catch { attempt++; if (attempt >= 4) throw new Error('bad response'); await sleep(400 * attempt); }
  }
  throw new Error('gave up after retries');
}

export const TMDB = 'https://api.themoviedb.org/3';
export const IMG = p => p ? 'https://image.tmdb.org/t/p/w154' + p : null;
export const enc = encodeURIComponent;

/** Best US (else any) certification out of a TMDB release_dates / content_ratings block. */
export function certOf(block, movie) {
  const rs = block && block.results;
  if (!rs || !rs.length) return null;
  const pick = rs.find(r => r.iso_3166_1 === 'US') || rs[0];
  if (!movie) return pick.rating || null;
  const d = (pick.release_dates || []).find(x => x.certification);
  return d ? d.certification : null;
}

export function tmdbTv(d, key) {
  return {
    key, src: 'tmdb', type: 'tv', id: d.id, name: d.name,
    year: d.first_air_date ? +d.first_air_date.slice(0, 4) : null,
    runtime: (d.episode_run_time && d.episode_run_time.length)
      ? Math.round(sum(d.episode_run_time) / d.episode_run_time.length)
      : (d.last_episode_to_air && d.last_episode_to_air.runtime) || 0,
    genres: (d.genres || []).map(g => g.name),
    lang: langName(d.original_language),
    countries: (d.production_countries || []).map(c => c.iso_3166_1).length
      ? (d.production_countries || []).map(c => c.iso_3166_1) : (d.origin_country || []),
    score: d.vote_average || null,
    poster: IMG(d.poster_path),
    episodes: d.number_of_episodes || null,
    seasons: d.number_of_seasons || null,
    network: (d.networks && d.networks[0] && d.networks[0].name) || null,
    status: d.status || null,
    rating: certOf(d.content_ratings, false),
    adult: !!d.adult, ts: Date.now(),
  };
}

export function tmdbMovie(d, key) {
  return {
    key, src: 'tmdb', type: 'movie', id: d.id, name: d.title,
    year: d.release_date ? +d.release_date.slice(0, 4) : null,
    releaseDate: d.release_date || null,
    runtime: d.runtime || 0,
    genres: (d.genres || []).map(g => g.name),
    lang: langName(d.original_language),
    countries: (d.production_countries || []).map(c => c.iso_3166_1),
    score: d.vote_average || null,
    poster: IMG(d.poster_path),
    rating: certOf(d.release_dates, true),
    adult: !!d.adult, ts: Date.now(),
  };
}

export function tvmazeShow(d, key) {
  const c = (d.network && d.network.country) || (d.webChannel && d.webChannel.country) || null;
  const eps = d._embedded && d._embedded.episodes;
  return {
    key, src: 'tvmaze', type: 'tv', id: d.id, name: d.name,
    year: d.premiered ? +d.premiered.slice(0, 4) : null,
    runtime: d.averageRuntime || d.runtime || 0,
    genres: d.genres || [],
    lang: d.language || null,
    countries: c ? [c.code] : [],
    score: (d.rating && d.rating.average) || null,
    poster: (d.image && d.image.medium) || null,
    episodes: eps ? eps.length : null,
    seasons: eps ? uniq(eps.map(e => e.season)).length : null,
    network: (d.network && d.network.name) || (d.webChannel && d.webChannel.name) || null,
    status: d.status || null,
    rating: null, adult: false, ts: Date.now(),
  };
}

/**
 * Resolve one lookup key. `hint` is our classifier's guess ('episode'|'movie').
 * Returns {meta, reclass} — reclass set when the API disagrees with the guess.
 */
async function resolveTitle(name, hint, sig) {
  const key = normKey(name);
  const k = S.tmdbKey;
  const q = enc(name);

  if (k) {
    if (hint === 'episode') {
      const s = await fetchJSON(`${TMDB}/search/tv?api_key=${k}&query=${q}`, sig);
      const hit = s && s.results && s.results[0];
      if (hit) {
        const d = await fetchJSON(`${TMDB}/tv/${hit.id}?api_key=${k}&append_to_response=content_ratings`, sig);
        if (d) return { meta: tmdbTv(d, key) };
      }
      // Not a show after all — let multi-search decide.
      const m = await fetchJSON(`${TMDB}/search/multi?api_key=${k}&query=${q}`, sig);
      const mh = m && m.results && m.results.find(r => r.media_type === 'movie' || r.media_type === 'tv');
      if (mh && mh.media_type === 'movie') {
        const d = await fetchJSON(`${TMDB}/movie/${mh.id}?api_key=${k}&append_to_response=release_dates`, sig);
        if (d) return { meta: tmdbMovie(d, key), reclass: 'movie' };
      }
    } else {
      const m = await fetchJSON(`${TMDB}/search/multi?api_key=${k}&query=${q}`, sig);
      const mh = m && m.results && m.results.find(r => r.media_type === 'movie' || r.media_type === 'tv');
      if (mh && mh.media_type === 'movie') {
        const d = await fetchJSON(`${TMDB}/movie/${mh.id}?api_key=${k}&append_to_response=release_dates`, sig);
        if (d) return { meta: tmdbMovie(d, key) };
      }
      if (mh && mh.media_type === 'tv') {
        const d = await fetchJSON(`${TMDB}/tv/${mh.id}?api_key=${k}&append_to_response=content_ratings`, sig);
        if (d) return { meta: tmdbTv(d, key), reclass: 'episode' };
      }
    }
  }

  // TVMaze — keyless, series only.
  if (hint === 'episode' || !k) {
    const d = await fetchJSON(`https://api.tvmaze.com/singlesearch/shows?q=${q}&embed=episodes`, sig);
    if (d && d.id) return { meta: tvmazeShow(d, key), reclass: k ? undefined : undefined };
  }
  return { meta: { key, src: 'miss', type: hint === 'movie' ? 'movie' : 'tv', name, runtime: 0, genres: [], countries: [], ts: Date.now() } };
}

/**
 * Distinct titles needing lookup, biggest first so useful data lands early.
 * Anything resolved during a keyless run is treated as pending again once a
 * TMDB key exists — otherwise adding a key later would leave every film blank.
 */
export function lookupTargets(includeCached) {
  const m = new Map();
  for (const r of S.rows) {
    const e = m.get(r.key) || { key: r.key, name: r.show, kind: r.kind, n: 0 };
    e.n++; m.set(r.key, e);
  }
  let list = [...m.values()];
  if (!includeCached) list = list.filter(t => {
    const meta = S.meta[t.key];
    if (!meta) return true;
    if (meta.noKey && S.tmdbKey) return true;   // upgradeable: fetched without a key
    return meta.src === 'miss' && !meta.tried;
  });
  return list.sort((a, b) => b.n - a.n);
}

export const ENRICH = { running: false, sig: { stopped: false } };

async function runEnrichment(opts) {
  const { onProgress, onLog, refetch } = opts;
  const targets = lookupTargets(refetch);
  if (!targets.length) { onLog('Everything is already cached.'); onProgress(1, 1); return { ok: 0, miss: 0 }; }

  ENRICH.running = true; ENRICH.sig = { stopped: false };
  const sig = ENRICH.sig;
  let done = 0, ok = 0, miss = 0, fatal = null, netFails = 0;
  // TVMaze allows roughly 20 calls per 10s. Pacing to stay just under that is
  // much faster overall than bursting and then serving out 429 back-offs.
  const CONC = S.tmdbKey ? 6 : 2;
  const PACE = S.tmdbKey ? 0 : 700;

  const worker = async () => {
    while (true) {
      if (sig.stopped || fatal) return;
      const t = targets.shift();
      if (!t) return;
      if (PACE) await sleep(PACE);
      try {
        const { meta, reclass } = await resolveTitle(t.name, t.kind, sig);
        meta.tried = true;
        if (!S.tmdbKey) meta.noKey = true;   // flag for a later upgrade pass
        S.meta[t.key] = meta;
        if (meta.src === 'miss') { miss++; onLog(`· no match  ${t.name}`); }
        else {
          ok++;
          if (reclass) {
            S.overrides[t.key] = Object.assign({}, S.overrides[t.key], { kind: reclass, auto: true });
            onLog(`✓ ${meta.name}  → reclassified as ${reclass === 'movie' ? 'film' : 'series'}`);
          }
        }
      } catch (e) {
        if (e.message === 'stopped') return;
        if (e.message === 'bad-key') { fatal = 'TMDB rejected the API key. Check it in Settings.'; return; }
        if (e.message === 'network') {
          netFails++;
          // Only fatal if nothing has ever succeeded — that means requests are
          // being blocked outright (file:// origin), not a passing hiccup.
          if (ok === 0 && netFails >= 3) {
            fatal = 'Network requests are being blocked. If you opened this file directly, serve the folder over http instead — see the README.';
            return;
          }
          t.retries = (t.retries || 0) + 1;
          if (t.retries <= 2) { targets.push(t); onLog(`… ${t.name}: network hiccup, requeued`); }
          else { miss++; done++; onLog(`! ${t.name}: gave up`); }
          if (netFails % 5 === 0) await sleep(2000);
          continue;
        }
        onLog(`! ${t.name}: ${e.message}`);
        miss++;
      }
      done++; onProgress(done, done + targets.length);
    }
  };

  await Promise.all(Array.from({ length: CONC }, worker));
  ENRICH.running = false;
  saveMeta(); saveOverrides();
  applyOverrides(S.rows, S.overrides);
  recalcFallbacks();
  return { ok, miss, fatal, stopped: sig.stopped };
}
