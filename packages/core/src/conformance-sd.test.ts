import { describe, expect, it } from 'vitest';
import { analyzeText, detectDirection, planInlineIsolation } from './index.js';

describe('Sindhi technical and dialogue conformance', () => {
  it('detects Sindhi sentences as RTL and isolates embedded English commands', () => {
    const text = 'هن سافٽ ويئر کي هلائڻ لاءِ npm install ڪمانڊ استعمال ڪريو.';
    const analysis = analyzeText(text);
    expect(analysis.direction).toBe('rtl');
    const isolations = planInlineIsolation(text, 'rtl');
    expect(isolations.some((iso) => iso.text === 'npm install')).toBe(true);
  });

  it('correctly classifies Sindhi unique alphabet characters as RTL strong', () => {
    const text = 'سنڌي ٻولي هڪ قديم ۽ تاريخي ٻولي آهي جيڪا پاڪستان ۽ هندستان ۾ ڳالهائي وڃي ٿي.';
    expect(detectDirection(text)).toBe('rtl');
  });

  it('isolates documentation URLs inside Sindhi text', () => {
    const text = 'وڌيڪ ڄاڻ لاءِ مهرباني ڪري https://example.com/sd ڏسو.';
    const isolations = planInlineIsolation(text, 'rtl');
    expect(isolations.some((iso) => iso.text === 'https://example.com/sd')).toBe(true);
  });

  it('preserves Sindhi question mark at sentence boundary', () => {
    const text = 'ڇا توهان هن ڪوڊ کي تبديل ڪرڻ چاهيو ٿا؟';
    expect(detectDirection(text)).toBe('rtl');
  });
});