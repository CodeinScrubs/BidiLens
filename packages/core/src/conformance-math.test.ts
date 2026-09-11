import { describe, expect, it } from 'vitest';
import { analyzeText, detectDirection, planInlineIsolation } from './index.js';

describe('mathematical notation and formula direction conformance', () => {
  it('detects Persian mathematical explanations containing inline formulas as RTL', () => {
    const text = 'معادله درجه دوم به صورت f(x) = ax^2 + bx + c تعریف می‌شود.';
    const analysis = analyzeText(text);
    expect(analysis.direction).toBe('rtl');
    const isolations = planInlineIsolation(text, 'rtl');
    expect(isolations.some((iso) => iso.text.includes('f(x)'))).toBe(true);
  });

  it('handles integral and summation formulas in Arabic scientific text', () => {
    const text = 'حساب التكامل المحدد ∫ f(x) dx على الفترة من أ إلى ب.';
    expect(detectDirection(text)).toBe('rtl');
  });

  it('preserves RTL direction for geometric theorems with Greek letters', () => {
    const text = 'مجموع زوایای داخلی مثلث برابر با 180° یا π رادیان است.';
    expect(detectDirection(text)).toBe('rtl');
  });

  it('keeps Persian question marks anchored correctly after math equations', () => {
    const text = 'آیا مقدار x > 10 در شرط صدق می‌کند؟';
    expect(detectDirection(text)).toBe('rtl');
  });
});
