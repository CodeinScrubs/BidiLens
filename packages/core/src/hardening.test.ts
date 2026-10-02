import { describe, expect, it } from 'vitest';
import {
  analyzeBlock,
  classifyCharacter,
  getCharacterClassification,
  findTechnicalTokenRanges,
  planInlineIsolation,
  scanBidiSecurity,
  type BidiSecurityReport,
  type BidiSecurityFinding
} from './index.js';

describe('Engine Definitive Hardening Suite', () => {
  describe('securityScanner callback integration', () => {
    it('integrates a scanner callback returning a BidiSecurityReport', () => {
      const customScanner = (text: string): BidiSecurityReport => {
        const report = scanBidiSecurity(text);
        return {
          ...report,
          findings: [
            ...report.findings,
            {
              code: 'custom-scanner-rule',
              message: 'Custom security violation',
              remediation: 'Review this violation',
              sourceRange: {
                utf16: { start: 0, end: text.length },
                codePoint: { start: 0, end: [...text].length }
              },
              severity: 'warning'
            }
          ]
        };
      };

      const result = analyzeBlock('سلام دنیا', {
        securityScanner: customScanner
      });

      expect(result.warnings).toBeDefined();
      expect(result.warnings?.some((f) => f.code === 'custom-scanner-rule')).toBe(true);
    });

    it('integrates a scanner callback returning BidiSecurityFinding[] array directly', () => {
      const customScanner = (): BidiSecurityFinding[] => [
        {
          code: 'direct-finding',
          message: 'Direct findings array test',
          remediation: 'Follow instructions',
          sourceRange: {
            utf16: { start: 0, end: 4 },
            codePoint: { start: 0, end: 4 }
          },
          severity: 'high'
        }
      ];

      const result = analyzeBlock('تست امنیت', {
        securityScanner: customScanner
      });

      expect(result.warnings).toBeDefined();
      expect(result.warnings?.some((f) => f.code === 'direct-finding')).toBe(true);
    });
  });

  describe('Character classification per UAX #9', () => {
    it('classifies Arabic numbers as AN with isWeak true', () => {
      const cls = getCharacterClassification(0x0665); // Arabic-Indic digit 5
      expect(cls.bidiClass).toBe('AN');
      expect(cls.isWeak).toBe(true);
      expect(cls.isNeutral).toBe(false);

      const overloaded = classifyCharacter(0x0665);
      expect(overloaded.bidiClass).toBe('AN');
      expect(overloaded.isWeak).toBe(true);
    });

    it('classifies boundary neutral characters as BN with isWeak true', () => {
      const zwnj = getCharacterClassification(0x200C); // ZWNJ
      expect(zwnj.bidiClass).toBe('BN');
      expect(zwnj.isWeak).toBe(true);

      const zwj = getCharacterClassification(0x200D); // ZWJ
      expect(zwj.bidiClass).toBe('BN');
      expect(zwj.isWeak).toBe(true);
    });

    it('classifies paragraph separators as B with isNeutral true', () => {
      const lf = getCharacterClassification(0x000A); // LINE FEED
      expect(lf.bidiClass).toBe('B');
      expect(lf.isNeutral).toBe(true);
    });

    it('classifies segment separators as S with isNeutral true', () => {
      const tab = getCharacterClassification(0x0009); // TAB
      expect(tab.bidiClass).toBe('S');
      expect(tab.isNeutral).toBe(true);
    });

    it('maintains backwards compatibility for string character classification', () => {
      expect(classifyCharacter('A')).toBe('ltr');
      expect(classifyCharacter('ب')).toBe('rtl');
      expect(classifyCharacter(' ')).toBe('neutral');
    });
  });

  describe('Persian and Arabic technical number tokens', () => {
    it('detects Persian thousands separator and Momayyez decimal numbers', () => {
      const text = 'مبلغ ۱٬۰۰۰٬۰۰۰ ریال و نسبت ۱۲۳٫۴۵ درصد ثبت شد.';
      const tokens = findTechnicalTokenRanges(text);
      const numberTokens = tokens.filter((t) => t.kind === 'number').map((t) => t.text);

      expect(numberTokens).toContain('۱٬۰۰۰٬۰۰۰');
      expect(numberTokens).toContain('۱۲۳٫۴۵');
    });

    it('detects number ranges across ASCII, En-dash, and Persian digits', () => {
      const text = 'دوره‌های 2020-2024 و ۱۰–۲۰ در دسترس هستند.';
      const tokens = findTechnicalTokenRanges(text);
      const numberTokens = tokens.filter((t) => t.kind === 'number').map((t) => t.text);

      expect(numberTokens).toContain('2020-2024');
      expect(numberTokens).toContain('۱۰–۲۰');
    });

    it('detects currency and percentage tokens with Arabic percent sign', () => {
      const text = 'قیمت $50 با تخفیف ۵۰٪ و نرخ 20% محاسبه شد.';
      const tokens = findTechnicalTokenRanges(text);
      const numberTokens = tokens.filter((t) => t.kind === 'number').map((t) => t.text);

      expect(numberTokens).toContain('$50');
      expect(numberTokens).toContain('۵۰٪');
      expect(numberTokens).toContain('20%');
    });
  });

  describe('Multiline display math support', () => {
    it('recognizes multiline $$...$$ display math blocks', () => {
      const text = 'معادله زیر:\n$$\nx^2 + y^2 = z^2\n$$\nدر این فضا صدق می‌کند.';
      const tokens = findTechnicalTokenRanges(text);
      const mathTokens = tokens.filter((t) => t.kind === 'math').map((t) => t.text);

      expect(mathTokens).toHaveLength(1);
      expect(mathTokens[0]).toBe('$$\nx^2 + y^2 = z^2\n$$');
    });

    it('recognizes multiline \\[...\\] display math blocks', () => {
      const text = 'معادله به صورت:\n\\[\n\\int_0^1 f(x) dx\n\\]\nمی‌باشد.';
      const tokens = findTechnicalTokenRanges(text);
      const mathTokens = tokens.filter((t) => t.kind === 'math').map((t) => t.text);

      expect(mathTokens).toHaveLength(1);
      expect(mathTokens[0]).toBe('\\[\n\\int_0^1 f(x) dx\n\\]');
    });
  });

  describe('SI metric units in security scanner', () => {
    it('does not flag standard SI metric units with micro symbol as confusables', () => {
      const prose = '10 \u03BCm, 100 \u00B5s, 50 \u03BCg, 25 \u00B5L, 5 \u03BCV, 2 \u00B5A, 1 \u03BCmol, 10 \u00B5bar';
      const report = scanBidiSecurity(prose, { scanConfusables: true });
      const confusableFindings = report.findings.filter((f) => f.code.includes('CONFUSABLE'));
      expect(confusableFindings).toHaveLength(0);
    });

    it('detects mixed-script confusable spoofing attacks when enabled', () => {
      // "p?ypal" with Cyrillic small letter a (U+0430)
      const attack = 'Please verify your p\u0430ypal account credentials.';
      const report = scanBidiSecurity(attack, { scanConfusables: true });
      const confusable = report.findings.find((f) => f.code === 'MIXED_SCRIPT_CONFUSABLE');
      expect(confusable).toBeDefined();
      expect(confusable?.severity).toBe('high');
      expect(confusable?.sourceRange.utf16.start).toBeGreaterThan(0);
    });
  });

  describe('Comprehensive character classification per UAX #9', () => {
    it('classifies European numbers as EN', () => {
      const en = getCharacterClassification(0x0035); // '5'
      expect(en.bidiClass).toBe('EN');
      expect(en.isWeak).toBe(true);
      expect(en.isNeutral).toBe(false);
    });

    it('classifies non-spacing combining marks as NSM', () => {
      const nsm = getCharacterClassification(0x064E); // Arabic Fatha
      expect(nsm.bidiClass).toBe('NSM');
      expect(nsm.isMark).toBe(true);
      expect(nsm.isWeak).toBe(true);
    });

    it('classifies whitespace as WS and punctuation as ON', () => {
      const ws = getCharacterClassification(0x0020); // Space
      expect(ws.bidiClass).toBe('WS');
      expect(ws.isNeutral).toBe(true);

      const on = getCharacterClassification(0x0021); // '!'
      expect(on.bidiClass).toBe('ON');
      expect(on.isNeutral).toBe(true);
    });

    it('classifies soft hyphen and other boundaries as BN', () => {
      const shy = getCharacterClassification(0x00AD); // Soft Hyphen
      expect(shy.bidiClass).toBe('BN');
      expect(shy.isWeak).toBe(true);
    });

    it('classifies strong LTR and RTL letters', () => {
      const l = getCharacterClassification(0x0041); // 'A'
      expect(l.bidiClass).toBe('L');
      expect(l.isStrong).toBe(true);
      expect(l.direction).toBe('ltr');

      const al = getCharacterClassification(0x0633); // Arabic Seen
      expect(al.bidiClass).toBe('AL');
      expect(al.isStrong).toBe(true);
      expect(al.direction).toBe('rtl');
    });

    it('handles empty string classification gracefully', () => {
      expect(classifyCharacter('')).toBe('neutral');
    });
  });

  describe('Inherited direction in isolation planning and container analysis', () => {
    it('honors inheritedDirection option in planInlineIsolation', () => {
      const text = 'React is great';
      // In an LTR inherited container, LTR text needs no isolation
      const isolations = planInlineIsolation(text, 'ltr', { inheritedDirection: 'ltr' });
      expect(isolations).toHaveLength(0);
    });

    it('plans isolation when LTR prose is embedded in an inherited RTL container', () => {
      const text = 'React documentation';
      // When inheritedDirection is RTL, LTR text needs bidi intervention
      const isolations = planInlineIsolation(text, 'ltr', { inheritedDirection: 'rtl' });
      expect(isolations.length).toBeGreaterThan(0);
    });

    it('propagates inheritedDirection through analyzeBlock', () => {
      const ltrContext = analyzeBlock('React documentation', { inheritedDirection: 'ltr' });
      expect(ltrContext.isolations).toHaveLength(0);

      const rtlContext = analyzeBlock('React documentation', { inheritedDirection: 'rtl' });
      expect(rtlContext.isolations.length).toBeGreaterThan(0);
      expect(rtlContext.isolations[0]?.text).toBe('React');
    });
  });
});
