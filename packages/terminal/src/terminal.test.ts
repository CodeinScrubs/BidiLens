import { describe, expect, it } from 'vitest';
import { BIDI_CONTROLS, stripBidiControls } from '@bidilens/core';
import { formatTerminalText, maskAnsiForAnalysis } from './index.js';

describe('terminal adapter', () => {
  it('keeps logical source byte-for-byte unchanged by default', () => {
    const source = 'React یک کتابخانه جاوااسکریپت بسیار محبوب است.';
    const result = formatTerminalText(source);
    expect(result.source).toBe(source);
    expect(result.text).toBe(source);
    expect(result.direction).toBe('rtl');
    expect(result.mode).toBe('plain');
    expect(result.controlsInserted).toBe(false);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('emulator');
  });

  it('offers explicit reversible isolate insertion for markup-less channels', () => {
    const source = 'React یک کتابخانه است.';
    const result = formatTerminalText(source, { mode: 'unicode-isolates' });
    expect(result.source).toBe(source);
    expect(result.text.startsWith(BIDI_CONTROLS.RLI)).toBe(true);
    expect(result.text.endsWith(BIDI_CONTROLS.PDI)).toBe(true);
    expect(result.text).toContain(`${BIDI_CONTROLS.LRI}React${BIDI_CONTROLS.PDI}`);
    expect(stripBidiControls(result.text)).toBe(source);
    expect(result.controlsInserted).toBe(true);
    expect(result.warnings).toHaveLength(2);
    expect(result.warnings[1]).toContain('changes the output string');
  });

  it('handles every paragraph independently while preserving separators', () => {
    const source = 'سلام دنیا\nHello world';
    const result = formatTerminalText(source, { mode: 'unicode-isolates' });
    expect(stripBidiControls(result.text)).toBe(source);
    expect(result.text).toContain(`${BIDI_CONTROLS.RLI}سلام دنیا${BIDI_CONTROLS.PDI}`);
    expect(result.text).toContain(`${BIDI_CONTROLS.LRI}Hello world${BIDI_CONTROLS.PDI}`);
    expect(result.text).toContain(`${BIDI_CONTROLS.PDI}\n${BIDI_CONTROLS.LRI}`);
  });

  it('masks ANSI escapes without moving source offsets or skewing direction', () => {
    const source = '\u001B[31mسلام دنیا\u001B[0m';
    const masked = maskAnsiForAnalysis(source);
    expect(masked.length).toBe(source.length);
    expect(masked).not.toContain('\u001B');
    expect(masked).toContain('سلام دنیا');
    const result = formatTerminalText(source);
    expect(result.direction).toBe('rtl');
    expect(result.text).toBe(source);
    expect(result.source).toBe(source);
  });

  it('masks complete OSC hyperlinks without modifying or isolating inside control sequences', () => {
    const open = '\u001B]8;;https://example.com/docs?q=rtl\u001B\\';
    const close = '\u001B]8;;\u001B\\';
    const source = `${open}\u0633\u0644\u0627\u0645 \u062f\u0646\u06cc\u0627${close}`;
    const masked = maskAnsiForAnalysis(source);
    expect(masked).toHaveLength(source.length);
    expect(masked).not.toContain('https://example.com');
    expect(masked).toContain('\u0633\u0644\u0627\u0645 \u062f\u0646\u06cc\u0627');

    const result = formatTerminalText(source, { mode: 'unicode-isolates' });
    expect(result.direction).toBe('rtl');
    expect(result.text).toContain(open);
    expect(result.text).toContain(close);
    expect(stripBidiControls(result.text)).toBe(source);
  });

  it('masks ECMA-48 string controls, C1 forms, and unterminated controls', () => {
    const dcs = '\u001BPprivate payload\u001B\\';
    const c1Osc = '\u009Dwindow title\u0007';
    const unterminated = '\u001B]8;;https://example.com';
    expect(maskAnsiForAnalysis(`${dcs}${c1Osc}`)).toBe(' '.repeat(dcs.length + c1Osc.length));
    expect(maskAnsiForAnalysis(unterminated)).toBe(' '.repeat(unterminated.length));
  });

  it('provides a visible diagnostic mode without claiming rendering repair', () => {
    const rtl = formatTerminalText('سلام', { mode: 'annotated' });
    const ltr = formatTerminalText('Hello', { mode: 'annotated' });
    expect(rtl.text).toBe('[RTL] سلام');
    expect(rtl.controlsInserted).toBe(false);
    expect(rtl.source).toBe('سلام');
    expect(ltr.text).toBe('[LTR] Hello');
    expect(ltr.direction).toBe('ltr');
    expect(ltr.mode).toBe('annotated');
  });

  it('keeps ordinary Persian ZWNJ untouched in every mode', () => {
    const source = 'می\u200Cخواهم کتاب بخوانم.';
    const plain = formatTerminalText(source);
    const isolated = formatTerminalText(source, { mode: 'unicode-isolates' });
    expect(plain.text).toContain('\u200C');
    expect(isolated.text).toContain('\u200C');
    expect(stripBidiControls(isolated.text)).toBe(source);
    expect(isolated.direction).toBe('rtl');
  });
});
