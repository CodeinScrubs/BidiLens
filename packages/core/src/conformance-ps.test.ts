import { describe, expect, it } from 'vitest';
import { analyzeText, detectDirection, planInlineIsolation } from './index.js';

describe('Pashto technical and dialogue conformance', () => {
  it('detects Pashto sentences as RTL and isolates embedded English commands', () => {
    const text = 'د پروژې جوړولو لپاره د pnpm build کمانډ وکاروئ.';
    const analysis = analyzeText(text);
    expect(analysis.direction).toBe('rtl');
    const isolations = planInlineIsolation(text, 'rtl');
    expect(isolations.some((iso) => iso.text === 'pnpm build')).toBe(true);
  });

  it('correctly classifies Pashto unique characters as RTL strong', () => {
    const text = 'دا د ښوونځي کتابتون دی او د زده کوونکو لپاره ګټور دی.';
    expect(detectDirection(text)).toBe('rtl');
  });

  it('isolates documentation URLs inside Pashto text', () => {
    const text = 'د لا زیاتو لارښوونو لپاره https://example.com/ps وګورئ.';
    const isolations = planInlineIsolation(text, 'rtl');
    expect(isolations.some((iso) => iso.text === 'https://example.com/ps')).toBe(true);
  });

  it('preserves Pashto question mark at sentence boundary', () => {
    const text = 'آیا تاسو غواړئ دا بدلونونه ثبت شي؟';
    expect(detectDirection(text)).toBe('rtl');
  });
});
