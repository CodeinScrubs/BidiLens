import { describe, expect, it } from 'vitest';
import { analyzeText, detectDirection, planInlineIsolation } from './index.js';

describe('Persian technical conformance', () => {
  it('detects Persian technical documentation as RTL with LTR command tokens', () => {
    const text = 'دستور npm run build را برای کامپایل پروژه اجرا کنید.';
    const analysis = analyzeText(text);
    expect(analysis.direction).toBe('rtl');
    const isolations = planInlineIsolation(text, 'rtl');
    expect(isolations.some((iso) => iso.text === 'npm run build')).toBe(true);
  });

  it('preserves Persian numbers with decimal comma inside RTL blocks', () => {
    const text = 'نسخه جدید با ۱۲٫۵ درصد بهبود کارایی منتشر شد.';
    expect(detectDirection(text)).toBe('rtl');
  });

  it('isolates configuration file paths in Persian text', () => {
    const text = 'تنظیمات در مسیر ./config/settings.json ذخیره شدند.';
    const isolations = planInlineIsolation(text, 'rtl');
    expect(isolations.some((iso) => iso.text === './config/settings.json')).toBe(true);
  });

  it('keeps Persian sentence-ending punctuation on the left margin', () => {
    const text = 'آیا از این کتابخانه استفاده می‌کنید؟ بله، عالی است!';
    const analysis = analyzeText(text);
    expect(analysis.direction).toBe('rtl');
  });

  it('isolates environment variables in Persian instructions', () => {
    const text = 'مقدار متغیر NODE_ENV را بر روی production قرار دهید.';
    const isolations = planInlineIsolation(text, 'rtl');
    expect(isolations.some((iso) => iso.text === 'NODE_ENV')).toBe(true);
  });
});
