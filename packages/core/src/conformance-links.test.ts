import { describe, expect, it } from 'vitest';
import { analyzeText, detectDirection, planInlineIsolation } from './index.js';

describe('Markdown link reference and footnote conformance', () => {
  it('detects Persian markdown footnotes as RTL', () => {
    const text = '[^1]: این یک پاورقی توضیحی در مورد معماری پروژه است.';
    expect(detectDirection(text)).toBe('rtl');
  });

  it('isolates URL targets in Persian markdown links', () => {
    const text = 'برای مشاهده مستندات به [وب‌سایت رسمی](https://bidilens.dev) مراجعه فرمایید.';
    const analysis = analyzeText(text);
    expect(analysis.direction).toBe('rtl');
    const isolations = planInlineIsolation(text, 'rtl');
    expect(isolations.some((iso) => iso.text.includes('https://bidilens.dev'))).toBe(true);
  });

  it('preserves RTL direction for markdown task lists with technical labels', () => {
    const text = '- [x] پیاده‌سازی تست‌های واحد برای ماژول core';
    expect(detectDirection(text)).toBe('rtl');
  });

  it('handles markdown blockquotes with Persian poetry and quotes', () => {
    const text = '> توانا بود هر که دانا بود / ز دانش دل پیر برنا بود';
    expect(detectDirection(text)).toBe('rtl');
  });
});
