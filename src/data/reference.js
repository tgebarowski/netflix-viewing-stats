// Static lookup tables: ISO language codes, country names and continents.

import { el } from '../core/dom.js';

export const LANGS = {
  en:'English', es:'Spanish', fr:'French', de:'German', it:'Italian', pt:'Portuguese',
  pl:'Polish', ru:'Russian', ja:'Japanese', ko:'Korean', zh:'Chinese', cn:'Chinese',
  hi:'Hindi', ar:'Arabic', he:'Hebrew', tr:'Turkish', nl:'Dutch', sv:'Swedish',
  da:'Danish', no:'Norwegian', nb:'Norwegian', fi:'Finnish', is:'Icelandic', cs:'Czech',
  sk:'Slovak', hu:'Hungarian', ro:'Romanian', bg:'Bulgarian', el:'Greek', uk:'Ukrainian',
  sr:'Serbian', hr:'Croatian', sl:'Slovenian', lt:'Lithuanian', lv:'Latvian', et:'Estonian',
  th:'Thai', vi:'Vietnamese', id:'Indonesian', ms:'Malay', tl:'Tagalog', ta:'Tamil',
  te:'Telugu', ml:'Malayalam', bn:'Bengali', pa:'Punjabi', mr:'Marathi', ur:'Urdu',
  fa:'Persian', af:'Afrikaans', sw:'Swahili', zu:'Zulu', ca:'Catalan', eu:'Basque',
  gl:'Galician', ga:'Irish', cy:'Welsh', la:'Latin', yi:'Yiddish', ka:'Georgian',
  hy:'Armenian', az:'Azerbaijani', kk:'Kazakh', uz:'Uzbek', mn:'Mongolian', ne:'Nepali',
  si:'Sinhala', km:'Khmer', my:'Burmese', am:'Amharic', xx:'No dialogue',
};
export const langName = c => !c ? null : (c.length > 3 ? c : (LANGS[c.toLowerCase()] || c.toUpperCase()));

/** ISO-3166 alpha-2 → [display name, continent]. */
export const COUNTRY = {
  US:['United States','N. America'],CA:['Canada','N. America'],MX:['Mexico','N. America'],
  GT:['Guatemala','N. America'],CR:['Costa Rica','N. America'],PA:['Panama','N. America'],
  CU:['Cuba','N. America'],DO:['Dominican Rep.','N. America'],PR:['Puerto Rico','N. America'],
  JM:['Jamaica','N. America'],HN:['Honduras','N. America'],SV:['El Salvador','N. America'],
  BR:['Brazil','S. America'],AR:['Argentina','S. America'],CL:['Chile','S. America'],
  CO:['Colombia','S. America'],PE:['Peru','S. America'],VE:['Venezuela','S. America'],
  UY:['Uruguay','S. America'],EC:['Ecuador','S. America'],BO:['Bolivia','S. America'],
  PY:['Paraguay','S. America'],
  GB:['United Kingdom','Europe'],IE:['Ireland','Europe'],FR:['France','Europe'],
  DE:['Germany','Europe'],IT:['Italy','Europe'],ES:['Spain','Europe'],PT:['Portugal','Europe'],
  NL:['Netherlands','Europe'],BE:['Belgium','Europe'],CH:['Switzerland','Europe'],
  AT:['Austria','Europe'],PL:['Poland','Europe'],CZ:['Czechia','Europe'],SK:['Slovakia','Europe'],
  HU:['Hungary','Europe'],RO:['Romania','Europe'],BG:['Bulgaria','Europe'],GR:['Greece','Europe'],
  HR:['Croatia','Europe'],RS:['Serbia','Europe'],SI:['Slovenia','Europe'],UA:['Ukraine','Europe'],
  RU:['Russia','Europe'],BY:['Belarus','Europe'],LT:['Lithuania','Europe'],LV:['Latvia','Europe'],
  EE:['Estonia','Europe'],FI:['Finland','Europe'],SE:['Sweden','Europe'],NO:['Norway','Europe'],
  DK:['Denmark','Europe'],IS:['Iceland','Europe'],LU:['Luxembourg','Europe'],MT:['Malta','Europe'],
  CY:['Cyprus','Europe'],BA:['Bosnia & Herz.','Europe'],MK:['N. Macedonia','Europe'],
  AL:['Albania','Europe'],MD:['Moldova','Europe'],ME:['Montenegro','Europe'],MC:['Monaco','Europe'],
  TR:['Türkiye','Asia'],IL:['Israel','Asia'],AE:['United Arab Emirates','Asia'],
  SA:['Saudi Arabia','Asia'],QA:['Qatar','Asia'],JO:['Jordan','Asia'],LB:['Lebanon','Asia'],
  IR:['Iran','Asia'],IQ:['Iraq','Asia'],KZ:['Kazakhstan','Asia'],GE:['Georgia','Asia'],
  AM:['Armenia','Asia'],IN:['India','Asia'],PK:['Pakistan','Asia'],BD:['Bangladesh','Asia'],
  LK:['Sri Lanka','Asia'],NP:['Nepal','Asia'],CN:['China','Asia'],JP:['Japan','Asia'],
  KR:['South Korea','Asia'],KP:['North Korea','Asia'],TW:['Taiwan','Asia'],HK:['Hong Kong','Asia'],
  TH:['Thailand','Asia'],VN:['Vietnam','Asia'],ID:['Indonesia','Asia'],MY:['Malaysia','Asia'],
  PH:['Philippines','Asia'],SG:['Singapore','Asia'],
  EG:['Egypt','Africa'],MA:['Morocco','Africa'],DZ:['Algeria','Africa'],TN:['Tunisia','Africa'],
  ZA:['South Africa','Africa'],NG:['Nigeria','Africa'],KE:['Kenya','Africa'],GH:['Ghana','Africa'],
  ET:['Ethiopia','Africa'],SN:['Senegal','Africa'],
  AU:['Australia','Oceania'],NZ:['New Zealand','Oceania'],
};
export const countryName = c => (COUNTRY[c] && COUNTRY[c][0]) || c;
export const continentOf = c => (COUNTRY[c] && COUNTRY[c][1]) || 'Other';
