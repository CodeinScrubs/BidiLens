import { describe, expect, it } from 'vitest';
import { analyzeText, detectDirection, planInlineIsolation } from './index.js';

describe('Hebrew technical conformance', () => {
  it('detects Hebrew technical instructions as RTL and isolates commands', () => {
    const text = 'כדי להפעיל את הבדיקות, הרץ את הפקודה pnpm test בטרמינל.';
    const analysis = analyzeText(text);
    expect(analysis.direction).toBe('rtl');
    const isolations = planInlineIsolation(text, 'rtl');
    expect(isolations.some((iso) => iso.text === 'pnpm test')).toBe(true);
  });

  it('isolates URL with query parameters in Hebrew text', () => {
    const text = 'לפרטים נוספים בקר בכתובת https://example.com/docs?lang=he&mode=dark בעברית.';
    const isolations = planInlineIsolation(text, 'rtl');
    expect(isolations.some((iso) => iso.text.includes('https://example.com/docs'))).toBe(true);
  });

  it('preserves Hebrew currency symbol with numeric amounts', () => {
    const text = 'המחיר הכולל הוא 250 ₪ כולל מע״מ.';
    expect(detectDirection(text)).toBe('rtl');
  });
});
