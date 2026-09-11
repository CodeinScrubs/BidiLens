import { describe, expect, it } from 'vitest';
import { analyzeText, detectDirection, planInlineIsolation } from './index.js';

describe('Urdu technical conformance', () => {
  it('detects Urdu text as RTL and isolates programming languages', () => {
    const text = 'یہ ایپلیکیشن Python اور React میں تیار کی گئی ہے۔';
    const analysis = analyzeText(text);
    expect(analysis.direction).toBe('rtl');
    const isolations = planInlineIsolation(text, 'rtl');
    expect(isolations.some((iso) => iso.text === 'Python')).toBe(true);
    expect(isolations.some((iso) => iso.text === 'React')).toBe(true);
  });

  it('preserves Urdu sentence-ending full stop', () => {
    const text = 'تمام ترتیبات محفوظ کر لی گئی ہیں۔';
    expect(detectDirection(text)).toBe('rtl');
  });

  it('isolates URLs in Urdu instructions', () => {
    const text = 'مزید معلومات کے لیے https://example.com/help دیکھیں';
    const isolations = planInlineIsolation(text, 'rtl');
    expect(isolations.some((iso) => iso.text === 'https://example.com/help')).toBe(true);
  });
});
