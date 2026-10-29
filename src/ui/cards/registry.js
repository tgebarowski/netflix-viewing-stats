// Tab list and the card registry every card module writes into.

export const TABS = [
  ['overview', 'Overview'], ['time', 'Time'], ['series', 'Series'],
  ['films', 'Films'], ['content', 'Content'], ['extras', 'Extras'], ['data', 'Data'],
];
export const CARDS = [];
export const card = def => { CARDS.push(def); return def; };
