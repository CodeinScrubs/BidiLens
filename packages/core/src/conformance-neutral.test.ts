import { describe, expect, it } from 'vitest';
import { analyzeText, detectDirection, planInlineIsolation } from './index.js';

describe('neutral character and boundary conformance', () => {
  it('preserves RTL direction when text contains mathematical symbols', () => {
    const text = 'مجموع داده‌ها به صورت ∑ x_i محاسبه می‌شود که در آن x ≥ 0 است.';
    expect(detectDirection(text)).toBe('rtl');
  });

  it('preserves RTL direction when text contains leading, trailing, and inline emojis', () => {
    const text = '🚀 اطلاعیه مهم: نسخه ۲٫۰ با ویژگی‌های جدید منتشر شد! 🎉';
    expect(detectDirection(text)).toBe('rtl');
  });

  it('handles balanced parentheses and square brackets inside RTL sentences', () => {
    const text = 'لطفاً فایل پیکربندی (config.json) را باز کرده و بخش [database] را بررسی کنید.';
    const analysis = analyzeText(text);
    expect(analysis.direction).toBe('rtl');
    const isolations = planInlineIsolation(text, 'rtl');
    expect(isolations.some((iso) => iso.text === 'config.json')).toBe(true);
  });

  it('handles percentage and temperature degree units', () => {
    const text = 'دمای پردازنده به ۶۵° سلسیوس رسید که نشان‌دهنده افزایش ۱۰٪ مصرف انرژی است.';
    expect(detectDirection(text)).toBe('rtl');
  });
});
