import { describe, expect, it } from 'vitest';
import { isolateDirectionalRuns, isolateText, planInlineIsolation, scanBidiSecurity } from './index.js';

describe('paragraph isolation and formatting-stack regressions', () => {
  it.each(['\n', '\r\n', '\r', '\u0085', '\u001c', '\u001d', '\u001e', '\u2029'])(
    'never scopes an inline isolate across paragraph separator %j', (separator) => {
      const source = `سلام React${separator}JavaScript`;
      const plans = planInlineIsolation(source, 'rtl');
      expect(plans.map((plan) => plan.text)).toEqual(['React', 'JavaScript']);
      let display = '';
      let cursor = 0;
      for (const plan of plans) {
        display += source.slice(cursor, plan.start) + isolateText(plan.text, plan.direction);
        expect(source.slice(plan.start, plan.end)).toBe(plan.text);
        cursor = plan.end;
      }
      display += source.slice(cursor);
      expect(scanBidiSecurity(display).findings.filter((finding) =>
        /UNMATCHED|UNCLOSED/u.test(finding.code))).toEqual([]);
      expect(scanBidiSecurity(isolateDirectionalRuns(source)).findings.filter((finding) =>
        /UNMATCHED|UNCLOSED/u.test(finding.code))).toEqual([]);
    }
  );

  it('handles deep formatting stacks with bounded synchronous work', () => {
    const count = 32_000;
    const source = '\u2066'.repeat(count) + '\u202c'.repeat(count);
    const started = performance.now();
    const findings = scanBidiSecurity(source).findings;
    const elapsed = performance.now() - started;
    expect(findings.filter((finding) => finding.code === 'BIDI_UNMATCHED_PDF')).toHaveLength(count);
    expect(findings.filter((finding) => finding.code === 'BIDI_UNCLOSED_ISOLATE')).toHaveLength(count);
    // Generous budget for shared CI; the former repeated reverse scans are quadratic.
    expect(elapsed).toBeLessThan(2_000);
  });
});
