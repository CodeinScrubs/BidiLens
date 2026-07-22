// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

describe('web component auto entry', () => {
  it('registers the element only when the explicit side-effect entry is imported', async () => {
    expect(customElements.get('bidi-message')).toBeUndefined();
    const { BidiMessageElement } = await import('./auto.js');
    expect(customElements.get('bidi-message')).toBe(BidiMessageElement);
  });
});
