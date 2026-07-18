import { classifyBidiStrongCharacter, classifyCharacter } from './classify.js';
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
  kind: 'code' | 'url' | 'email' | 'path' | 'version' | 'hash' | 'identifier' | 'number' | 'command' | 'math' | 'html';
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
  'ai', 'api', 'anthropic', 'chatgpt', 'claude', 'cli', 'codex', 'copilot', 'cursor',
  'deepseek', 'electron', 'gemini', 'github', 'gitlab', 'grok', 'huggingface',
  'javascript', 'json', 'llama', 'markdown', 'mistral', 'node', 'npm', 'openai',
  'python', 'qwen', 'react', 'rust', 'svelte', 'typescript', 'url', 'version',
  'vscode', 'vue', 'web', 'webpack', 'yaml'
]);

function normalizeOptions(options: DetectionOptions = {}): Required<DetectionOptions> {
  const strategy = options.strategy ?? DEFAULT_OPTIONS.strategy;
  const majorityStrategy = strategy === 'content-majority'
    || strategy === 'semantic-dominant'
    || strategy === 'majority';
  return {
    strategy,
    fallback: options.fallback ?? options.inheritedDirection ?? DEFAULT_OPTIONS.fallback,
    inheritedDirection: options.inheritedDirection ?? DEFAULT_OPTIONS.inheritedDirection,
    minimumStrongCharacters: Math.max(1, options.minimumStrongCharacters ?? DEFAULT_OPTIONS.minimumStrongCharacters),
    majorityThreshold: Math.min(1, Math.max(0.5, options.majorityThreshold ?? DEFAULT_OPTIONS.majorityThreshold)),
    // Compatibility/strict first-strong modes must see the real first strong
    // character (including a leading technical identifier), like dir="auto".
    excludeTechnicalTokens: options.excludeTechnicalTokens ?? majorityStrategy
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

function trimTechnicalPunctuation(value: string): string {
  while (/[.,;:!?،؛؟。।۔]$/u.test(value)) value = value.slice(0, -1);
  return value;
}

function addValidatedMatches(
  text: string,
  ranges: TechnicalTokenRange[],
  expression: RegExp,
  kind: TechnicalTokenRange['kind'],
  validate: (value: string) => boolean,
  group = 0
): void {
  expression.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = expression.exec(text)) !== null) {
    const value = match[group];
    if (value === undefined || !validate(value)) continue;
    const start = match.index + match[0].indexOf(value);
    addRange(ranges, text, start, start + value.length, kind);
  }
}

function addNormalizedMatches(
  text: string,
  ranges: TechnicalTokenRange[],
  expression: RegExp,
  kind: TechnicalTokenRange['kind'],
  normalize: (value: string) => string,
  group = 0
): void {
  expression.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = expression.exec(text)) !== null) {
    const original = match[group];
    if (original === undefined) continue;
    const value = normalize(original);
    if (!value) continue;
    const start = match.index + match[0].indexOf(original);
    addRange(ranges, text, start, start + value.length, kind);
  }
}

function isIpv4(value: string): boolean {
  const parts = value.split('.');
  return parts.length === 4 && parts.every((part) => /^\d{1,3}$/u.test(part) && Number(part) <= 255);
}

function isIpv6(value: string): boolean {
  if (!/^[0-9A-F:]+$/iu.test(value) || !value.includes(':')) return false;
  const compression = value.indexOf('::');
  if (compression !== value.lastIndexOf('::')) return false;
  const sides = compression >= 0 ? value.split('::') : [value];
  const groups = sides.flatMap((side) => side ? side.split(':') : []);
  if (!groups.every((group) => /^[0-9A-F]{1,4}$/iu.test(group))) return false;
  return compression >= 0 ? groups.length < 8 : groups.length === 8;
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
  addMatches(text, ranges, /(`+)[^\r\n]*?\1/gu, 'code');
  addMatches(text, ranges, /<\/?[A-Za-z][^<>\r\n]*>/gu, 'html');
  addMatches(text, ranges, /(?:\$\$[^\r\n]*?\$\$|\$[^$\r\n]+\$|\\\([^\r\n]*?\\\))/gu, 'math');

  const urls = /\b(?:https?|ftp):\/\/[^\s<>{}"']+/giu;
  let urlMatch: RegExpExecArray | null;
  while ((urlMatch = urls.exec(text)) !== null) {
    let value = urlMatch[0];
    value = trimTechnicalPunctuation(value);
    for (const [open, close] of [['(', ')'], ['[', ']'], ['{', '}']] as const) {
      while (value.endsWith(close)
        && [...value].filter((character) => character === close).length > [...value].filter((character) => character === open).length) {
        value = value.slice(0, -1);
      }
    }
    addRange(ranges, text, urlMatch.index, urlMatch.index + value.length, 'url');
  }
  addMatches(text, ranges, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu, 'email');
  addNormalizedMatches(
    text,
    ranges,
    /(?<![\p{L}\p{N}_])(?:[A-Za-z]:[\\/]|\.{0,2}\/|~\/)[^\s<>()\x5B\x5D{}]+/gu,
    'path',
    trimTechnicalPunctuation
  );
  addMatches(text, ranges, /\b(?:[A-Za-z0-9_.-]+[\\/])+(?:[A-Za-z0-9_.-]+)\b/gu, 'path');
  addMatches(text, ranges, /(?<![\w@])@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*/giu, 'identifier');
  addMatches(text, ranges, /(?:\$\{?[A-Z_][A-Z0-9_]*\}?|%[A-Z_][A-Z0-9_]*%)/gu, 'identifier');
  addMatches(text, ranges, /\b(?:npm|pnpm|yarn|npx|git|pip|python|node|cargo|go|docker|kubectl)(?:\s+(?:--?[A-Za-z0-9_-]+|[@./\\A-Za-z0-9_:=+-]+|'[^'\r\n]*'|"[^"\r\n]*"))+/gu, 'command');
  addValidatedMatches(text, ranges, /\b(?:\d{1,3}\.){3}\d{1,3}\b/gu, 'number', isIpv4);
  addValidatedMatches(
    text,
    ranges,
    /(?<![0-9A-F:])(?:[0-9A-F]{0,4}:){2,7}[0-9A-F]{0,4}(?![0-9A-F:])/giu,
    'number',
    isIpv6
  );
  addMatches(text, ranges, /(?<![\p{L}\p{N}_])\+?\d[\d ()-]{6,}\d(?![\p{L}\p{N}_])/gu, 'number');
  addMatches(text, ranges, /\b\d{4}[-/]\d{1,2}[-/]\d{1,2}(?:[T ]\d{1,2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?)?\b/gu, 'number');
  addMatches(text, ranges, /\b\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?\b/giu, 'number');
  addMatches(text, ranges, /\bv?\d+(?:\.\d+){1,}\b/gu, 'version');
  addMatches(text, ranges, /\b[0-9a-f]{7,40}\b/giu, 'hash');
  addMatches(text, ranges, /(?<![\p{L}\p{N}_])[+-]?(?:\d+(?:[.,]\d+)?|[\u0660-\u0669]+(?:[\u066B\u066C][\u0660-\u0669]+)?|[\u06F0-\u06F9]+(?:[.,][\u06F0-\u06F9]+)?)(?![\p{L}\p{N}_])/gu, 'number');

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
  const classify = normalized.strategy === 'first-strong' || normalized.strategy === 'strict-uax9'
    ? classifyBidiStrongCharacter
    : classifyCharacter;

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
      const direction = classify(character);
      if (direction === 'ltr') ltr += 1;
      if (direction === 'rtl') rtl += 1;
      if (firstStrong === 'neutral' && direction !== 'neutral') firstStrong = direction;
    }
    index += character.length;
  }

  return { ltr, rtl, total: ltr + rtl, firstStrong, technicalTokens };
}

function fallbackDirection(options: Required<DetectionOptions>): Direction {
  return options.fallback;
}

export function detectDirection(text: string, options: DetectionOptions = {}): Direction {
  const normalized = normalizeOptions(options);
  if (normalized.strategy === 'ltr' || normalized.strategy === 'rtl') return normalized.strategy;
  if (normalized.strategy === 'inherit') return normalized.inheritedDirection;
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
  const rawCountsWithFirst = countStrongCharacters(text, {
    ...options,
    strategy: 'content-majority',
    excludeTechnicalTokens: false
  });
  const rawCounts: StrongCharacterCounts = {
    ltr: rawCountsWithFirst.ltr,
    rtl: rawCountsWithFirst.rtl,
    total: rawCountsWithFirst.total
  };
  const paragraphs = splitParagraphs(text).map((paragraph) => analyzeParagraph(paragraph.text, paragraph.start, options));
  return {
    text,
    direction,
    firstStrong: countsWithFirst.firstStrong,
    confidence: confidenceFor(counts, direction),
    counts,
    rawCounts,
    paragraphs,
    mixed: rawCounts.ltr > 0 && rawCounts.rtl > 0
  };
}
