// Content tab: genres, languages, countries and ratings.

import { el } from '../../core/dom.js';
import { by, flag, pct, sum, uniq } from '../../core/format.js';
import { continentOf, countryName } from '../../data/reference.js';
import { genresOf } from '../../data/state.js';
import { fmtM, measureLabel, rowValue, tallyAttr } from '../../data/stats.js';
import { card } from './registry.js';
import { barRows, columns, donut, legend, stackedArea } from '../charts.js';
import { needsMeta, setFilter } from '../components.js';

card({ id: 'genres', tab: 'content', w: 6, title: 'Genres', note: 'titles count in every genre they carry', build: c => {
  const t = tallyAttr(c.rows, m => m.genres);
  if (!t.list.length) return needsMeta();
  return el('div', {},
    barRows(t.list.slice(0, 16).map(g => ({
      label: g.label, value: g.value,
      tip: `<b>${g.label}</b>${fmtM(g.value)} ${measureLabel()}<br><span style="opacity:.7">click to filter everything by this genre</span>`,
      click: () => setFilter('genre', g.label),
    })), { fmt: fmtM, rank: true }),
    t.missing ? el('p', { class: 'help', style: { marginTop: '10px' } }, `${fmtM(t.missing)} ${measureLabel()} have no genre data yet.`) : null);
}});

card({ id: 'genreYears', tab: 'content', w: 6, title: 'How your taste moved', build: c => {
  const t = tallyAttr(c.rows, m => m.genres);
  if (!t.list.length) return needsMeta();
  const top = t.list.slice(0, 6).map(g => g.label);
  const years = uniq(c.rows.map(r => r.date.getFullYear())).sort();
  const series = top.map(g => ({
    name: g,
    values: years.map(y => sum(c.rows.filter(r => r.date.getFullYear() === y && genresOf(r).includes(g)).map(rowValue))),
  }));
  return el('div', {},
    stackedArea(years.map(String), series, { height: 190 }),
    legend(series.map(s => ({ label: s.name }))));
}});

card({ id: 'languages', tab: 'content', w: 4, title: 'Languages', build: c => {
  const t = tallyAttr(c.rows, m => m.lang);
  if (!t.list.length) return needsMeta();
  return el('div', {},
    barRows(t.list.slice(0, 14).map(l => ({
      label: l.label, value: l.value,
      tip: `<b>${l.label}</b>${fmtM(l.value)} ${measureLabel()}<br><span style="opacity:.7">click to filter</span>`,
      click: () => setFilter('lang', l.label),
    })), { fmt: fmtM, rank: true }),
    el('p', { class: 'help', style: { marginTop: '10px' } },
      `${t.list.length} languages · non-English is ${pct(sum(t.list.filter(x => x.label !== 'English').map(x => x.value)), sum(t.list.map(x => x.value)))} of your viewing.`));
}});

card({ id: 'countries', tab: 'content', w: 4, title: 'Country of production', build: c => {
  const t = tallyAttr(c.rows, m => m.countries);
  if (!t.list.length) return needsMeta();
  return el('div', {},
    barRows(t.list.slice(0, 14).map(x => ({
      label: countryName(x.label), value: x.value, icon: flag(x.label),
      tip: `<b>${countryName(x.label)}</b>${fmtM(x.value)} ${measureLabel()}<br><span style="opacity:.7">click to filter</span>`,
      click: () => setFilter('country', x.label),
    })), { fmt: fmtM }),
    el('p', { class: 'help', style: { marginTop: '10px' } },
      `${t.list.length} countries. Co-productions count once per country.`));
}});

card({ id: 'continents', tab: 'content', w: 4, title: 'By continent', build: c => {
  const t = tallyAttr(c.rows, m => uniq((m.countries || []).map(continentOf)));
  if (!t.list.length) return needsMeta();
  return el('div', {},
    donut(t.list, { fmt: fmtM, center: t.list.length ? String(t.list.length) : '', centerSub: 'regions' }),
    legend(t.list, { values: true, fmt: fmtM }));
}});

card({ id: 'decades', tab: 'content', w: 4, title: 'Release decades', build: c => {
  const items = [...c.series, ...c.films].filter(x => x.meta && x.meta.year);
  if (!items.length) return needsMeta();
  const m = new Map();
  for (const x of items) { const d = Math.floor(x.meta.year / 10) * 10; m.set(d, (m.get(d) || 0) + 1); }
  const ks = [...m.keys()].sort();
  return columns(ks.map(d => ({ label: `${String(d).slice(2)}s`, value: m.get(d), tip: `<b>${d}s</b>${m.get(d)} titles` })), { height: 150 });
}});

card({ id: 'networks', tab: 'content', w: 4, title: 'Where the series came from', build: c => {
  const m = new Map();
  for (const s of c.series) { const n = s.meta && s.meta.network; if (n) m.set(n, (m.get(n) || 0) + s.value); }
  if (!m.size) return needsMeta();
  return barRows([...m.entries()].map(([label, value]) => ({ label, value })).sort(by(x => x.value)).slice(0, 12), { fmt: fmtM, rank: true });
}});

card({ id: 'maturity', tab: 'content', w: 4, title: 'Age ratings', build: c => {
  const t = tallyAttr(c.rows, m => m.rating);
  if (!t.list.length) return needsMeta(true);
  return el('div', {},
    barRows(t.list.slice(0, 12).map(x => ({ label: x.label, value: x.value })), { fmt: fmtM }),
    el('p', { class: 'help', style: { marginTop: '10px' } }, 'US certifications from TMDB. These also drive the kids/adult split.'));
}});
