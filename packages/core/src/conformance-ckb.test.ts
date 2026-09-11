import { describe, expect, it } from 'vitest';
import { analyzeText, detectDirection, planInlineIsolation } from './index.js';

describe('Central Kurdish (Sorani) technical conformance', () => {
  it('detects Sorani Kurdish as RTL with technical identifiers isolated', () => {
    const text = 'تکایە فەرمانی git checkout main لە تێرمیناڵ بنووسە.';
    const analysis = analyzeText(text);
    expect(analysis.direction).toBe('rtl');
    const isolations = planInlineIsolation(text, 'rtl');
    expect(isolations.some((iso) => iso.text === 'git checkout main')).toBe(true);
  });

  it('correctly classifies Sorani Kurdish alphabet characters', () => {
    const text = 'ئەم پرۆگرامە زۆر بەسوودە بۆ خوێندکارانی زانکۆ.';
    expect(detectDirection(text)).toBe('rtl');
  });

  it('isolates URL web links in Kurdish guidance', () => {
    const text = 'بۆ بینینی دۆکیۆمێنت سەردانی https://example.com/ckb بکە.';
    const isolations = planInlineIsolation(text, 'rtl');
    expect(isolations.some((iso) => iso.text === 'https://example.com/ckb')).toBe(true);
  });

  it('handles Iraqi Dinar currency formatting in Sorani', () => {
    const text = 'نرخەکەی بریتییە لە 50,000 دیناری عێراقی.';
    expect(detectDirection(text)).toBe('rtl');
  });
});
