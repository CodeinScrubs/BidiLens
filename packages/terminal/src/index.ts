import {
  analyzeText,
  isolateText,
  planInlineIsolation,
  type DetectionOptions,
  type Direction
} from '@bidilens/core';

export type TerminalBidiMode = 'plain' | 'unicode-isolates' | 'annotated';

export interface TerminalFormatOptions extends DetectionOptions {
  mode?: TerminalBidiMode;
}

export interface TerminalFormatResult {
  source: string;
  text: string;
  direction: Direction;
  mode: TerminalBidiMode;
  controlsInserted: boolean;
  warnings: string[];
}

function consumeCsi(source: string, start: number): number {
  for (let index = start; index < source.length; index += 1) {
    const code = source.charCodeAt(index);
    if (code >= 0x40 && code <= 0x7e) return index + 1;
  }
  return source.length;
}

function consumeStringControl(source: string, start: number, allowBell: boolean): number {
  for (let index = start; index < source.length; index += 1) {
    const code = source.charCodeAt(index);
    if (allowBell && code === 0x07) return index + 1;
    if (code === 0x9c) return index + 1;
    if (code === 0x1b && source.charCodeAt(index + 1) === 0x5c) return index + 2;
  }
  // An unterminated string control owns the remainder of the input. Treating
  // its payload as prose could both skew direction and inject isolates into it.
  return source.length;
}

function ansiControlEnd(source: string, start: number): number | undefined {
  const code = source.charCodeAt(start);
  if (code === 0x9b) return consumeCsi(source, start + 1);
  if (code === 0x9d) return consumeStringControl(source, start + 1, true);
  if (code === 0x90 || code === 0x98 || code === 0x9e || code === 0x9f) {
    return consumeStringControl(source, start + 1, false);
  }
  if (code >= 0x80 && code <= 0x9f) return start + 1;
  if (code !== 0x1b) return undefined;
  if (start + 1 >= source.length) return source.length;

  const next = source.charCodeAt(start + 1);
  if (next === 0x5b) return consumeCsi(source, start + 2);
  if (next === 0x5d) return consumeStringControl(source, start + 2, true);
  if (next === 0x50 || next === 0x58 || next === 0x5e || next === 0x5f) {
    return consumeStringControl(source, start + 2, false);
  }

  let index = start + 1;
  while (index < source.length) {
    const value = source.charCodeAt(index);
    if (value >= 0x20 && value <= 0x2f) {
      index += 1;
      continue;
    }
    return value >= 0x30 && value <= 0x7e ? index + 1 : start + 1;
  }
  return source.length;
}

export function maskAnsiForAnalysis(source: string): string {
  let result = '';
  let cursor = 0;
  for (let index = 0; index < source.length;) {
    const end = ansiControlEnd(source, index);
    if (end === undefined) {
      index += 1;
      continue;
    }
    result += source.slice(cursor, index);
    result += ' '.repeat(end - index);
    cursor = end;
    index = end;
  }
  return result + source.slice(cursor);
}

function isolateParagraph(
  source: string,
  analysisText: string,
  direction: 'ltr' | 'rtl',
  technicalIdentifiers: readonly string[] | undefined
): string {
  const plans = planInlineIsolation(analysisText, direction, { technicalIdentifiers });
  let output = '';
  let cursor = 0;
  for (const plan of plans) {
    output += source.slice(cursor, plan.start);
    output += isolateText(source.slice(plan.start, plan.end), plan.direction);
    cursor = plan.end;
  }
  output += source.slice(cursor);
  return isolateText(output, direction);
}

/**
 * Terminals do not expose a portable bidi-layout API. The safe default is
 * therefore unchanged logical text; Unicode isolates are explicit opt-in.
 */
export function formatTerminalText(source: string, options: TerminalFormatOptions = {}): TerminalFormatResult {
  const mode = options.mode ?? 'plain';
  const analysisText = maskAnsiForAnalysis(source);
  const analysis = analyzeText(analysisText, { ...options, fallback: options.fallback ?? 'ltr' });
  const warnings = [
    'Terminal bidi behavior depends on the emulator, font, shaping engine, and copy implementation.'
  ];
  if (mode === 'plain') {
    return { source, text: source, direction: analysis.direction, mode, controlsInserted: false, warnings };
  }
  if (mode === 'annotated') {
    return {
      source,
      text: `[${analysis.direction.toUpperCase()}] ${source}`,
      direction: analysis.direction,
      mode,
      controlsInserted: false,
      warnings
    };
  }

  const chunks = analysis.paragraphs.map((paragraph, index) => {
    const sourceParagraph = source.slice(paragraph.start, paragraph.end);
    const direction = paragraph.direction === 'neutral' ? (options.inheritedDirection ?? 'ltr') : paragraph.direction;
    const next = analysis.paragraphs[index + 1];
    const separator = next ? source.slice(paragraph.end, next.start) : '';
    return `${isolateParagraph(sourceParagraph, paragraph.text, direction, options.technicalIdentifiers)}${separator}`;
  });
  warnings.push('Unicode-isolate mode changes the output string; keep the returned source for storage, search, and model input.');
  return {
    source,
    text: chunks.join(''),
    direction: analysis.direction,
    mode,
    controlsInserted: true,
    warnings
  };
}
