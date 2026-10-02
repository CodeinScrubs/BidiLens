import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  detectDirection,
  planInlineIsolation
} from './index.js';

interface Fixture {
  id: string;
  description: string;
  text: string;
  words: string[];
  expected: 'ltr' | 'rtl' | 'neutral';
  expectedVisualOrderRightToLeft?: number[];
  expectedVisualOrderLeftToRight?: number[];
  expectedIsolations?: Array<{ text: string; direction: 'ltr' | 'rtl' | 'auto'; kind: string }>;
  tags: string[];
}

const fixturesDir = resolve('corpus', 'fixtures', 'fa');

describe('real-world ChatGPT Persian medical fixtures', async () => {
  const files = (await readdir(fixturesDir)).filter((file) => file.endsWith('.json')).sort();
  const fixtures: Fixture[] = [];

  for (const file of files) {
    const content = JSON.parse(await readFile(resolve(fixturesDir, file), 'utf8')) as Fixture;
    fixtures.push(content);
  }

  it('contains at least 25 real-world ChatGPT fixtures', () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(25);
  });

  it('validates word-count alignment with visual order sequence', () => {
    for (const fixture of fixtures) {
      if (fixture.expected === 'rtl') {
        expect(fixture.expectedVisualOrderRightToLeft).toBeDefined();
        expect(fixture.expectedVisualOrderRightToLeft?.length).toBe(fixture.words.length);
      } else if (fixture.expected === 'ltr') {
        expect(fixture.expectedVisualOrderLeftToRight).toBeDefined();
        expect(fixture.expectedVisualOrderLeftToRight?.length).toBe(fixture.words.length);
      }
    }
  });

  describe('leading English technical terms in Persian paragraphs', () => {
    it('correctly resolves RTL base for Capsule leading paragraph', () => {
      const text = 'Capsule مثل یک روکش لیز و ضدچسب دور باکتری است.';
      const direction = detectDirection(text);
      expect(direction).toBe('rtl');
      const isolations = planInlineIsolation(text, 'rtl');
      expect(isolations.some((i) => i.text === 'Capsule' && i.direction === 'ltr')).toBe(true);
    });

    it('correctly resolves RTL base for Macrophage leading paragraph', () => {
      const text = 'Macrophage برای بلعیدن باکتری خیلی بهتر عمل میکند وقتی باکتری با opsonin پوشانده شده باشد، مخصوصاً:';
      const direction = detectDirection(text);
      expect(direction).toBe('rtl');
      const isolations = planInlineIsolation(text, 'rtl');
      expect(isolations.some((i) => i.text === 'Macrophage' && i.direction === 'ltr')).toBe(true);
    });

    it('correctly resolves RTL base for Pyruvate kinase leading paragraph', () => {
      const text = 'Pyruvate kinase یکی از آن enzymeهایی است که برای RBC حیاتی است چون RBC mitochondria ندارد و تقریباً برای ATP به glycolysis وابسته است.';
      const direction = detectDirection(text);
      expect(direction).toBe('rtl');
      const isolations = planInlineIsolation(text, 'rtl');
      expect(isolations.some((i) => i.text.includes('Pyruvate') && i.direction === 'ltr')).toBe(true);
    });
  });

  describe('chemical/biochemical formulas and reactions', () => {
    it('resolves LTR direction for standalone reaction equation', () => {
      const text = 'PEP + ADP → Pyruvate + ATP';
      expect(detectDirection(text, { fallback: 'ltr' })).toBe('ltr');
    });

    it('resolves LTR direction for immunology formula', () => {
      const text = 'IgG / IgM + C3b → phagocytosis ↑';
      expect(detectDirection(text, { fallback: 'ltr' })).toBe('ltr');
    });

    it('resolves LTR direction for respiration process chain', () => {
      const text = 'glucose → glycolysis → mitochondria → lots of ATP';
      expect(detectDirection(text, { fallback: 'ltr' })).toBe('ltr');
    });
  });

  describe('leading emoji headers and memory hooks', () => {
    it('skips neutral emoji and resolves RTL for Persian heading', () => {
      const text = '🧠 تصویر ذهنی';
      expect(detectDirection(text)).toBe('rtl');
    });

    it('skips neutral emoji and resolves LTR for English heading', () => {
      const text = '🔴 Bottom line:';
      expect(detectDirection(text)).toBe('ltr');
    });

    it('resolves RTL for checkmark callout when medical terms are declared', () => {
      const text = '✅ واقعیت: ATP deficiency باعث کاهش بقای RBC و splenic destruction میشود.';
      expect(detectDirection(text, { technicalIdentifiers: ['deficiency', 'splenic', 'destruction'] })).toBe('rtl');
    });
  });

  describe('Persian quotations and slang in mnemonics', () => {
    it('preserves RTL base for guillemets question', () => {
      const text = '«پس قبلش چرا مشکل ایجاد نمیکنند؟»';
      expect(detectDirection(text)).toBe('rtl');
    });

    it('preserves RTL base for dialogue quotation', () => {
      const text = '«این آشغالِ بیبرق دیگه رد نمیشه.»';
      expect(detectDirection(text)).toBe('rtl');
    });
  });
});
