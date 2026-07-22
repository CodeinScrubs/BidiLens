export * from './index.js';

import { defineBidiMessageElement } from './index.js';

if (typeof globalThis.customElements !== 'undefined') defineBidiMessageElement();
