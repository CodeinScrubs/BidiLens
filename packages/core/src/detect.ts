import { classifyCharacter } from './classify.js';
import type {
  DetectionOptions,
  Direction,
  ParagraphAnalysis,
  StrongCharacterCounts,
  TextAnalysis
} from './types.js';

const DEFAULT_OPTIONS: Required<DetectionOptions> = {
  strategy: 'first-strong',
  fallback: 'neutral',
  minimumStrongCharacters: 1,
  majorityThreshold: 0.5
};

function normalizeOptions(options: DetectionOptions = {}): Required<DetectionOptions> {
  return {
    strategy: options.strategy ?? DEFAULT_OPTIONS.strategy,
    fallback: options.fallback ?? DEFAULT_OPTIONS.fallback,
    minimumStrongCharacters: Math.max(1, options.minimumStrongCharacters ?? DEFAULT_OPTIONS.minimumStrongCharacters),
    majorityThreshold: Math.min(1, Math.max(0.5, options.majorityThreshold ?? DEFAULT_OPTIONS.majorityThreshold))
  };
}

export function countStrongCharacters(text: string): StrongCharacterCounts & { firstStrong: Direction } {
  let ltr = 0;
  let rtl = 0;
  let firstStrong: Direction = 'neutral';

  for (const character of text) {
    const direction = classifyCharacter(character);
    if (direction === 'ltr') ltr += 1;
    if (direction === 'rtl') rtl += 1;
    if (firstStrong === 'neutral' && direction !== 'neutral') firstStrong = direction;
  }

  return { ltr, rtl, total: ltr + rtl, firstStrong };
}

export function detectDirection(text: string, options: DetectionOptions = {}): Direction {
  const normalized = normalizeOptions(options);
  const counts = countStrongCharacters(text);

  if (counts.total < normalized.minimumStrongCharacters) return normalized.fallback;
  if (normalized.strategy === 'first-strong') return counts.firstStrong === 'neutral' ? normalized.fallback : counts.firstStrong;

  const rtlRatio = counts.rtl / counts.total;
  const ltrRatio = counts.ltr / counts.total;
  if (rtlRatio >= normalized.majorityThreshold && counts.rtl > counts.ltr) return 'rtl';
  if (ltrRatio >= normalized.majorityThreshold && counts.ltr > counts.rtl) return 'ltr';
  return counts.firstStrong === 'neutral' ? normalized.fallback : counts.firstStrong;
}

function confidenceFor(counts: StrongCharacterCounts, direction: Direction): number {
  if (counts.total === 0 || direction === 'neutral') return 0;
  const matching = direction === 'rtl' ? counts.rtl : counts.ltr;
  return Number((matching / counts.total).toFixed(4));
}

function splitParagraphs(text: string): Array<{ text: string; start: number; end: number }> {
  const paragraphs: Array<{ text: string; start: number; end: number }> = [];
  const separator = /\r\n|\n|\r|\u2029/g;
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
  const countsWithFirst = countStrongCharacters(text);
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
  const countsWithFirst = countStrongCharacters(text);
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
