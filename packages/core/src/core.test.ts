import { describe, expect, it } from 'vitest';
import {
  BIDI_CONTROLS,
  analyzeText,
  createBidiStream,
  detectDirection,
  findBidiControls,
  isolateText,
  sanitizeBidiControls,
  segmentDirectionalRuns,
  stripBidiControls
} from './index.js';

describe('direction detection', () => {
  it('detects Persian and English', () => {
    expect(detectDirection('سلام دنیا')).toBe('rtl');
    expect(detectDirection('hello world')).toBe('ltr');
  });

  it('ignores leading punctuation', () => {
    expect(detectDirection('✅ (سلام) version 2')).toBe('rtl');
  });

  it('supports neutral fallback', () => {
    expect(detectDirection('2026-07-18', { fallback: 'neutral' })).toBe('neutral');
  });

  it('analyzes paragraphs independently', () => {
    const result = analyzeText('Hello\nسلام');
    expect(result.paragraphs.map((paragraph) => paragraph.direction)).toEqual(['ltr', 'rtl']);
    expect(result.mixed).toBe(true);
  });
});

describe('isolation and segmentation', () => {
  it('wraps text with isolates', () => {
    expect(isolateText('سلام', 'rtl')).toBe(`${BIDI_CONTROLS.RLI}سلام${BIDI_CONTROLS.PDI}`);
  });

  it('segments directional runs', () => {
    const runs = segmentDirectionalRuns('سلام API دنیا');
    expect(runs.some((run) => run.direction === 'rtl')).toBe(true);
    expect(runs.some((run) => run.direction === 'ltr')).toBe(true);
  });

  it('strips controls', () => {
    const value = `${BIDI_CONTROLS.RLO}abc${BIDI_CONTROLS.PDF}`;
    expect(stripBidiControls(value)).toBe('abc');
  });
});

describe('streaming', () => {
  it('locks after the first strong character', () => {
    const stream = createBidiStream({ strategy: 'first-strong', fallback: 'ltr' });
    expect(stream.push('...').direction).toBe('ltr');
    expect(stream.push('س').direction).toBe('rtl');
    expect(stream.push(' API').direction).toBe('rtl');
    expect(stream.snapshot().locked).toBe(true);
  });

  it('locks when the detected direction equals the fallback', () => {
    const stream = createBidiStream({ strategy: 'first-strong', fallback: 'ltr' });
    const snapshot = stream.push('Hello');
    expect(snapshot.direction).toBe('ltr');
    expect(snapshot.locked).toBe(true);
  });
});

describe('security', () => {
  it('finds and sanitizes overrides', () => {
    const input = `safe${BIDI_CONTROLS.RLO}evil${BIDI_CONTROLS.PDF}`;
    const findings = findBidiControls(input);
    expect(findings).toHaveLength(2);
    expect(findings[0]?.risk).toBe('high');
    expect(sanitizeBidiControls(input).text).toBe('safeevil');
  });
});
