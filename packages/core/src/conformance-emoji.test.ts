import { describe, expect, it } from 'vitest';
import { analyzeText, detectDirection, planInlineIsolation } from './index.js';

describe('emoji skin tones and ZWJ sequence conformance', () => {
  it('preserves RTL direction when sentences start with complex ZWJ emojis', () => {
    const text = '👨‍💻 توسعه‌دهندگان گرامی، نسخه آزمایشی آماده تست است.';
    expect(detectDirection(text)).toBe('rtl');
  });

  it('handles skin-tone modifier emojis at sentence endings without punctuation drift', () => {
    const text = 'با تشکر از همکاری شما در پروژه! 👍🏽';
    expect(detectDirection(text)).toBe('rtl');
  });

  it('isolates technical commands placed adjacent to emojis in RTL text', () => {
    const text = 'برای شروع پروژه 🚀 دستور npm start را اجرا کنید.';
    const analysis = analyzeText(text);
    expect(analysis.direction).toBe('rtl');
    const isolations = planInlineIsolation(text, 'rtl');
    expect(isolations.some((iso) => iso.text === 'npm start')).toBe(true);
  });

  it('correctly handles multi-emoji reaction rows without affecting paragraph direction', () => {
    const text = 'بازخورد تیم: 🎉 ❤️ 👏 🔥 عالی بود!';
    expect(detectDirection(text)).toBe('rtl');
  });
});
