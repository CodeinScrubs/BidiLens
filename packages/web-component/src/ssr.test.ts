import { describe, expect, it } from 'vitest';
import { BidiMessageElement } from './index.js';

describe('web component SSR import', () => {
  it('can load without browser globals', () => {
    expect(BidiMessageElement.observedAttributes).toEqual(['text']);
    expect(typeof BidiMessageElement).toBe('function');
    expect(typeof BidiMessageElement.prototype.render).toBe('function');
  });
});
