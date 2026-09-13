import { describe, expect, it } from 'vitest';
import { analyzeText, detectDirection, planInlineIsolation } from './index.js';

describe('code-switching and script transition conformance', () => {
  it('detects Persian sentences with embedded English acronyms as RTL', () => {
    const text = 'برای احراز هویت از توکن JWT و پروتکل OAuth2 استفاده کنید.';
    const analysis = analyzeText(text);
    expect(analysis.direction).toBe('rtl');
    const isolations = planInlineIsolation(text, 'rtl');
    expect(isolations.some((iso) => iso.text === 'JWT')).toBe(true);
    expect(isolations.some((iso) => iso.text === 'OAuth2')).toBe(true);
  });

  it('detects Arabic chat with embedded brand names as RTL', () => {
    const text = 'قم بتحميل التطبيق من App Store أو Google Play للمتابعة.';
    expect(detectDirection(text)).toBe('rtl');
  });

  it('isolates version tags and semver tokens in RTL explanations', () => {
    const text = 'بسته‌های سازگار با v2.1.0-rc.3 را از مخزن دریافت نمایید.';
    const isolations = planInlineIsolation(text, 'rtl');
    expect(isolations.some((iso) => iso.text === 'v2.1.0-rc.3')).toBe(true);
  });

  it('correctly classifies Hebrew sentences with acronyms containing double quotes (gershayim)', () => {
    const text = 'יש לעדכן את קובץ ה-README לפני שליחת ה-PR לבדיקה.';
    expect(detectDirection(text)).toBe('rtl');
  });
});
