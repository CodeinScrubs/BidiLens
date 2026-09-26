import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { graphemeBoundaries } from './graphemes.js';
import { planInlineIsolation } from './segments.js';

describe('pinned grapheme-safe isolation', () => {
  it('passes every official Unicode 17 extended GraphemeBreakTest vector', () => {
    const data = readFileSync(new URL('../../../unicode/GraphemeBreakTest-17.0.0.txt', import.meta.url), 'utf8');
    let cases = 0;
    for (const line of data.split(/\r?\n/u)) {
      const tokens = line.split('#')[0]!.trim().split(/\s+/u);
      if (tokens[0] !== '÷') continue;
      let text = '';
      const expected: number[] = [];
      for (const token of tokens) {
        if (token === '÷') expected.push(text.length);
        else if (token !== '×') text += String.fromCodePoint(Number.parseInt(token, 16));
      }
      expect(graphemeBoundaries(text), line).toEqual(expected);
      cases += 1;
    }
    expect(cases).toBeGreaterThan(700);
  });

  it.each(['React\u0301 is a useful library سلام', 'مقدار 1\ufe0f\u20e3 است', 'سلام \u0600React', 'سلام क्\u200dष'])('never splits a grapheme in an isolation: %s', (text) => {
    const boundaries = graphemeBoundaries(text);
    const plans = planInlineIsolation(text, 'rtl');
    expect(plans.length).toBeGreaterThan(0);
    for (const plan of plans) {
      expect(boundaries).toContain(plan.start);
      expect(boundaries).toContain(plan.end);
      expect(plan.text).toBe(text.slice(plan.start, plan.end));
    }
  });

  it('keeps a combining mark inside a technical-only isolation', () => {
    expect(planInlineIsolation('React\u0301 is a useful library سلام', 'rtl', { isolateOppositeRuns: false })[0]?.text).toBe('React\u0301');
  });
});
