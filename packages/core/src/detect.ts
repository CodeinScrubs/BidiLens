import { classifyCharacter } from './classify.js';
import type {
  DetectionOptions,
  Direction,
  ParagraphAnalysis,
  StrongCharacterCounts,
  TextAnalysis
} from './types.js';

export interface TechnicalTokenRange {
  text: string;
  start: number;
  end: number;
  kind: 'code' | 'url' | 'email' | 'path' | 'version' | 'hash' | 'identifier';
}

const DEFAULT_OPTIONS: Required<DetectionOptions> = {
  strategy: 'content-majority',
  fallback: 'neutral',
  inheritedDirection: 'ltr',
  minimumStrongCharacters: 1,
  majorityThreshold: 0.5,
  excludeTechnicalTokens: true
};

const KNOWN_TECHNICAL_TOKENS = new Set([
  'api', 'cli', 'codex', 'cursor', 'electron', 'github', 'gitlab', 'javascript',
  'json', 'markdown', 'node', 'npm', 'openai', 'python', 'react', 'rust',
  'typescript', 'url', 'version', 'vscode', 'vue', 'web', 'webpack', 'yaml', 'svelte'
]);

function normalizeOptions(options: DetectionOptions = {}): Required<DetectionOptions> {
  return {
    strategy: options.strategy ?? DEFAULT_OPTIONS.strategy,
    fallback: options.fallback ?? options.inheritedDirection ?? DEFAULT_OPTIONS.fallback,
    inheritedDirection: options.inheritedDirection ?? DEFAULT_OPTIONS.inheritedDirection,
    minimumStrongCharacters: Math.max(1, options.minimumStrongCharacters ?? DEFAULT_OPTIONS.minimumStrongCharacters),
    majorityThreshold: Math.min(1, Math.max(0.5, options.majorityThreshold ?? DEFAULT_OPTIONS.majorityThreshold)),
    excludeTechnicalTokens: options.excludeTechnicalTokens ?? DEFAULT_OPTIONS.excludeTechnicalTokens
  };
}

function addRange(
  ranges: TechnicalTokenRange[],
  text: string,
  start: number,
  end: number,
  kind: TechnicalTokenRange['kind']
): void {
  if (end > start) ranges.push({ text: text.slice(start, end), start, end, kind });
}

function addMatches(
  text: string,
  ranges: TechnicalTokenRange[],
  expression: RegExp,
  kind: TechnicalTokenRange['kind'],
  group = 0
): void {
  expression.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = expression.exec(text)) !== null) {
    const value = match[group];
    if (value === undefined) continue;
    const start = match.index + match[0].indexOf(value);
    addRange(ranges, text, start, start + value.length, kind);
  }
}

function isTechnicalIdentifier(token: string): boolean {
  const normalized = token.toLowerCase();
  return KNOWN_TECHNICAL_TOKENS.has(normalized)
    || /[0-9_.-]/u.test(token)
    || /^[A-Z]{2,}$/u.test(token)
    || /[a-z][A-Z]/u.test(token);
}

/** Finds ranges that should not decide the natural-language base direction. */
export function findTechnicalTokenRanges(text: string): TechnicalTokenRange[] {
  const ranges: TechnicalTokenRange[] = [];
  addMatches(text, ranges, /`[^`\r\n]*`/gu, 'code');
  addMatches(text, ranges, /\b(?:https?|ftp):\/\/[^\s<>()\x5B\x5D{}]+/giu, 'url');
  addMatches(text, ranges, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu, 'email');
  addMatches(text, ranges, /(?:^|\s)((?:[A-Za-z]:[\\/]|\/)[^\s<>()\x5B\x5D{}]+)/gu, 'path', 1);
  addMatches(text, ranges, /\bv?\d+(?:\.\d+){1,}\b/gu, 'version');
  addMatches(text, ranges, /\b[0-9a-f]{7,40}\b/giu, 'hash');

  const words = /\b[A-Za-z][A-Za-z0-9_.-]*\b/gu;
  let match: RegExpExecArray | null;
  while ((match = words.exec(text)) !== null) {
    const token = match[0];
    if (isTechnicalIdentifier(token)) addRange(ranges, text, match.index, match.index + token.length, 'identifier');
  }

  ranges.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: TechnicalTokenRange[] = [];
  for (const range of ranges) {
    const previous = merged.at(-1);
    if (previous && range.start <= previous.end) {
      previous.end = Math.max(previous.end, range.end);
      previous.text = text.slice(previous.start, previous.end);
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}

export function countStrongCharacters(
  text: string,
  options: DetectionOptions = {}
): StrongCharacterCounts & { firstStrong: Direction; technicalTokens: TechnicalTokenRange[] } {
  const normalized = normalizeOptions(options);
  const technicalTokens = normalized.excludeTechnicalTokens ? findTechnicalTokenRanges(text) : [];
  let ltr = 0;
  let rtl = 0;
  let firstStrong: Direction = 'neutral';
  let index = 0;
  let technicalIndex = 0;

  for (const character of text) {
    // Technical ranges are sorted and merged, so advance one cursor instead
    // of rescanning every range for every code point. This keeps detection
    // linear even for long transcripts containing many URLs/identifiers.
    while (technicalIndex < technicalTokens.length && index >= technicalTokens[technicalIndex]!.end) {
      technicalIndex += 1;
    }
    const technicalRange = technicalTokens[technicalIndex];
    const isTechnical = technicalRange !== undefined
      && index >= technicalRange.start
      && index < technicalRange.end;
    if (!isTechnical) {
      const direction = classifyCharacter(character);
      if (direction === 'ltr') ltr += 1;
      if (direction === 'rtl') rtl += 1;
      if (firstStrong === 'neutral' && direction !== 'neutral') firstStrong = direction;
    }
    index += character.length;
  }

  return { ltr, rtl, total: ltr + rtl, firstStrong, technicalTokens };
}

function fallbackDirection(options: Required<DetectionOptions>): Direction {
  return options.fallback === 'neutral' ? 'neutral' : options.fallback === 'ltr' || options.fallback === 'rtl'
    ? options.fallback
    : options.inheritedDirection;
}

export function detectDirection(text: string, options: DetectionOptions = {}): Direction {
  const normalized = normalizeOptions(options);
  const counts = countStrongCharacters(text, normalized);

  if (counts.total < normalized.minimumStrongCharacters) return fallbackDirection(normalized);

  if (normalized.strategy === 'first-strong' || normalized.strategy === 'strict-uax9') {
    return counts.firstStrong === 'neutral' ? fallbackDirection(normalized) : counts.firstStrong;
  }

  // `majority` and `content-majority` intentionally share the same rule. The
  // latter is the public default and excludes technical tokens first.
  if (counts.rtl > counts.ltr && counts.rtl / counts.total >= normalized.majorityThreshold) return 'rtl';
  if (counts.ltr > counts.rtl && counts.ltr / counts.total >= normalized.majorityThreshold) return 'ltr';
  return counts.firstStrong === 'neutral' ? fallbackDirection(normalized) : counts.firstStrong;
}

function confidenceFor(counts: StrongCharacterCounts, direction: Direction): number {
  if (counts.total === 0 || direction === 'neutral') return 0;
  const matching = direction === 'rtl' ? counts.rtl : counts.ltr;
  return Number((matching / counts.total).toFixed(4));
}

function splitParagraphs(text: string): Array<{ text: string; start: number; end: number }> {
  const paragraphs: Array<{ text: string; start: number; end: number }> = [];
  const separator = /\r\n|\n|\r|\u2029/gu;
  let start = 0;
  let match: RegExpExecArray | null;

  while ((match = separator.exec(text)) !== null) {
    paragraphs.push({ text: text.slice(start, match.index), start, end: match.index });
    start = match.index + match[0].length;
  }
  paragraphs.push({ text: text.slice(start), start, end: text.length });
  return paragraphs;
}

export function analyzeParagraph(text: string, start = 0, options: DetectionOptions = {}): ParagraphAnalysis {
  const countsWithFirst = countStrongCharacters(text, options);
  const counts: StrongCharacterCounts = {
    ltr: countsWithFirst.ltr,
    rtl: countsWithFirst.rtl,
    total: countsWithFirst.total
  };
  const direction = detectDirection(text, options);
  return {
    text,
    start,
    end: start + text.length,
    direction,
    firstStrong: countsWithFirst.firstStrong,
    confidence: confidenceFor(counts, direction),
    counts
  };
}

export function analyzeText(text: string, options: DetectionOptions = {}): TextAnalysis {
  const countsWithFirst = countStrongCharacters(text, options);
  const counts: StrongCharacterCounts = {
    ltr: countsWithFirst.ltr,
    rtl: countsWithFirst.rtl,
    total: countsWithFirst.total
  };
  const direction = detectDirection(text, options);
  const paragraphs = splitParagraphs(text).map((paragraph) => analyzeParagraph(paragraph.text, paragraph.start, options));
  return {
    text,
    direction,
    firstStrong: countsWithFirst.firstStrong,
    confidence: confidenceFor(counts, direction),
    counts,
    paragraphs,
    mixed: counts.ltr > 0 && counts.rtl > 0
  };
}
