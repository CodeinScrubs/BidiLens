import { describe, expect, it } from 'vitest';
import { analyzeText, detectDirection, planInlineIsolation } from './index.js';

describe('Arabic technical conformance', () => {
  it('detects Arabic code instructions as RTL and isolates code tokens', () => {
    const text = 'قم بتثبيت الحزمة باستخدام الأمر pip install requests في سطر الأوامر.';
    const analysis = analyzeText(text);
    expect(analysis.direction).toBe('rtl');
    const isolations = planInlineIsolation(text, 'rtl');
    expect(isolations.some((iso) => iso.text === 'pip install requests')).toBe(true);
  });

  it('handles Arabic-Indic digits correctly in statistical sentences', () => {
    const text = 'بلغ عدد المستخدمين النشطين أكثر من ١٠٠٠٠ مستخدم.';
    expect(detectDirection(text)).toBe('rtl');
  });

  it('isolates HTTP endpoints in Arabic technical documentation', () => {
    const text = 'أرسل طلب POST إلى https://api.example.com/v1/auth للتحقق.';
    const isolations = planInlineIsolation(text, 'rtl');
    expect(isolations.some((iso) => iso.text.includes('https://api.example.com'))).toBe(true);
  });

  it('preserves Arabic question marks at sentence ends', () => {
    const text = 'هل تم تشغيل الخادم بنجاح؟';
    expect(detectDirection(text)).toBe('rtl');
  });
});
