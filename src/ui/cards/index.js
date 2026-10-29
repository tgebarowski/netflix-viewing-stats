// Importing a card module registers its cards as a side effect; the order here
// is the order cards appear within each tab.

import './overview.js';
import './time.js';
import './series.js';
import './films.js';
import './content.js';
import './extras.js';
import './data.js';

export { TABS, CARDS } from './registry.js';
