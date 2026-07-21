import { countStrongCharacters, detectDirection } from './detect.js';
import { classifyBidiStrongCharacter } from './classify.js';
import type {
  BidiStreamOptions,
  BidiStreamSnapshot,
  Direction,
  StreamParagraph,
  StreamStrategy
} from './types.js';

const DEFAULT_SEPARATOR_SOURCE = '\\r\\n|\\n|\\r|\\u2029';
const DEFAULT_SEPARATOR = new RegExp(DEFAULT_SEPARATOR_SOURCE, 'g');

function batchStrategy(strategy: StreamStrategy): 'content-majority' | 'first-strong' | 'majority' {
  if (strategy === 'first-strong') return 'first-strong';
  if (strategy === 'majority') return 'majority';
  return 'content-majority';
}

function detectForStrategy(text: string, strategy: StreamStrategy, fallback: Direction, threshold: number): Direction {
  return detectDirection(text, {
    strategy: batchStrategy(strategy),
    fallback,
    majorityThreshold: threshold
  });
}

function normalizedSeparator(separator: RegExp): RegExp {
  const flags = separator.flags.replaceAll('y', '').includes('g')
    ? separator.flags.replaceAll('y', '')
    : `${separator.flags.replaceAll('y', '')}g`;
  return new RegExp(separator.source, flags);
}

export class BidiStream {
  readonly #strategy: StreamStrategy;
  readonly #fallback: Direction;
  readonly #separator: RegExp;
  readonly #usesDefaultSeparator: boolean;
  readonly #threshold: number;
  readonly #lockAfter: number;
  readonly #lockMargin: number;
  #text = '';
  #currentText = '';
  #completedParagraphs: StreamParagraph[] = [];
  #direction: Direction;
  #locked = false;
  #lastChanged = false;
  #finished = false;
  #pendingCarriageReturn = false;
  #pendingHighSurrogate: string | null = null;
  #analysisDue = false;
  #nextAnalysisLength = 1;
  #strongCharacters = 0;
  #nextStrongAnalysisCount = 1;

  constructor(options: BidiStreamOptions = {}) {
    this.#strategy = options.strategy ?? 'content-majority';
    this.#fallback = options.fallback ?? 'ltr';
    this.#separator = options.paragraphSeparator ?? DEFAULT_SEPARATOR;
    this.#usesDefaultSeparator = options.paragraphSeparator === undefined;
    this.#threshold = Math.min(1, Math.max(0.5, options.majorityThreshold ?? 0.5));
    // A single short opposite-language word should remain provisional. Eight
    // strong characters and a margin of three settle the flagship promptly
    // without locking the English mirror case on its leading Persian word.
    this.#lockAfter = Math.max(1, options.lockAfterStrongCharacters ?? 8);
    this.#lockMargin = Math.max(1, options.lockMargin ?? 3);
    this.#direction = this.#fallback;
  }

  push(chunk: string): BidiStreamSnapshot {
    if (this.#finished) throw new Error('Cannot push after finish().');
    if (!chunk) return this.snapshot();
    const previous = this.#direction;
    this.#text += chunk;
    if (this.#usesDefaultSeparator) this.#consumeDefaultSeparators(chunk, false);
    else this.#appendCurrent(chunk);
    this.#lastChanged = previous !== this.#direction;
    return this.snapshot();
  }

  /** Clears the session and optionally analyzes replacement source in one step. */
  reset(initialText = ''): BidiStreamSnapshot {
    this.#text = '';
    this.#currentText = '';
    this.#completedParagraphs = [];
    this.#direction = this.#fallback;
    this.#locked = false;
    this.#lastChanged = false;
    this.#finished = false;
    this.#pendingCarriageReturn = false;
    this.#pendingHighSurrogate = null;
    this.#analysisDue = false;
    this.#nextAnalysisLength = 1;
    this.#strongCharacters = 0;
    this.#nextStrongAnalysisCount = 1;
    return initialText ? this.push(initialText) : this.snapshot();
  }

  /** Finalizes the open paragraph and reconciles it with batch analysis. */
  finish(): BidiStreamSnapshot {
    if (!this.#finished) {
      if (this.#pendingCarriageReturn) this.#consumeDefaultSeparators('', true);
      if (!this.#usesDefaultSeparator) this.#finalizeCustomSeparators();
    }
    this.#flushPendingHighSurrogate();
    const previous = this.#direction;
    this.#direction = detectForStrategy(this.#currentText, this.#strategy, this.#fallback, this.#threshold);
    this.#locked = this.#direction !== 'neutral';
    this.#lastChanged = previous !== this.#direction;
    this.#finished = true;
    return this.snapshot();
  }

  snapshot(): BidiStreamSnapshot {
    const currentParagraph: StreamParagraph = {
      text: this.#currentText,
      direction: this.#finished
        ? detectForStrategy(this.#currentText, this.#strategy, this.#fallback, this.#threshold)
        : this.#direction,
      completed: this.#finished,
      index: this.#completedParagraphs.length
    };
    return {
      text: this.#text,
      direction: this.#direction,
      changed: this.#lastChanged,
      locked: this.#locked,
      finished: this.#finished,
      paragraphs: [...this.#completedParagraphs.map((paragraph) => ({ ...paragraph })), currentParagraph],
      currentParagraph
    };
  }

  #appendCurrent(value: string): void {
    if (!value) return;
    for (let index = 0; index < value.length; index += 1) {
      const character = value[index]!;
      const codeUnit = value.charCodeAt(index);

      if (this.#pendingHighSurrogate !== null) {
        if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
          this.#currentText += character;
          const pair = `${this.#pendingHighSurrogate}${character}`;
          this.#pendingHighSurrogate = null;
          this.#processCharacter(pair);
          continue;
        }
        this.#flushPendingHighSurrogate();
      }

      this.#currentText += character;
      if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) this.#pendingHighSurrogate = character;
      else this.#processCharacter(character);
    }
  }

  #flushPendingHighSurrogate(): void {
    if (this.#pendingHighSurrogate === null) return;
    const character = this.#pendingHighSurrogate;
    this.#pendingHighSurrogate = null;
    this.#processCharacter(character);
  }

  #processCharacter(character: string): void {
    if (this.#strategy === 'first-strong' && !this.#locked) {
      const actual = classifyBidiStrongCharacter(character);
      if (actual !== 'neutral') {
        this.#direction = actual;
        this.#locked = true;
      }
      return;
    }
    // Schedule by source position, not by push() boundaries. This guarantees
    // identical live decisions for one large chunk and any subdivision of it.
    const strongDirection = classifyBidiStrongCharacter(character);
    if (strongDirection !== 'neutral') this.#strongCharacters += 1;
    if (/\s/u.test(character) || strongDirection !== 'neutral') {
      this.#analysisDue = true;
    }
    this.#updateLiveDirection();
  }

  #completeCurrentParagraph(): void {
    this.#flushPendingHighSurrogate();
    this.#completedParagraphs.push({
      text: this.#currentText,
      direction: detectForStrategy(this.#currentText, this.#strategy, this.#fallback, this.#threshold),
      completed: true,
      index: this.#completedParagraphs.length
    });
    this.#currentText = '';
    this.#pendingHighSurrogate = null;
    this.#direction = this.#fallback;
    this.#locked = false;
    this.#analysisDue = false;
    this.#nextAnalysisLength = 1;
    this.#strongCharacters = 0;
    this.#nextStrongAnalysisCount = 1;
  }

  #consumeDefaultSeparators(chunk: string, final: boolean): void {
    const combined = `${this.#pendingCarriageReturn ? '\r' : ''}${chunk}`;
    this.#pendingCarriageReturn = false;
    const separator = new RegExp(DEFAULT_SEPARATOR_SOURCE, 'g');
    let start = 0;
    let match: RegExpExecArray | null;
    while ((match = separator.exec(combined)) !== null) {
      const value = match[0];
      const end = match.index + value.length;
      if (!final && value === '\r' && end === combined.length) {
        this.#appendCurrent(combined.slice(start, match.index));
        this.#pendingCarriageReturn = true;
        start = end;
        break;
      }
      this.#appendCurrent(combined.slice(start, match.index));
      this.#completeCurrentParagraph();
      start = end;
    }
    this.#appendCurrent(combined.slice(start));
  }

  #finalizeCustomSeparators(): void {
    const combined = this.#currentText;
    const separator = normalizedSeparator(this.#separator);
    this.#currentText = '';
    this.#pendingHighSurrogate = null;
    this.#direction = this.#fallback;
    this.#locked = false;
    this.#analysisDue = false;
    this.#nextAnalysisLength = 1;
    this.#strongCharacters = 0;
    this.#nextStrongAnalysisCount = 1;
    let start = 0;
    let match: RegExpExecArray | null;
    while ((match = separator.exec(combined)) !== null) {
      this.#appendCurrent(combined.slice(start, match.index));
      this.#completeCurrentParagraph();
      start = match.index + match[0].length;
      if (match[0].length === 0) {
        const codePoint = combined.codePointAt(separator.lastIndex);
        const unicodeSets = (separator as RegExp & { readonly unicodeSets?: boolean }).unicodeSets === true;
        const unicodeAware = separator.unicode || unicodeSets;
        separator.lastIndex += unicodeAware && codePoint !== undefined && codePoint > 0xffff ? 2 : 1;
      }
    }
    this.#appendCurrent(combined.slice(start));
  }

  #updateLiveDirection(): void {
    if (this.#locked) return;
    if (this.#strategy === 'first-strong' || !this.#analysisDue
      || (this.#currentText.length < this.#nextAnalysisLength
        && this.#strongCharacters < this.#nextStrongAnalysisCount)) return;

    const reachedLengthCheckpoint = this.#currentText.length >= this.#nextAnalysisLength;
    const reachedStrongCheckpoint = this.#strongCharacters >= this.#nextStrongAnalysisCount;
    const candidate = detectForStrategy(this.#currentText, this.#strategy, this.#fallback, this.#threshold);
    this.#analysisDue = false;
    if (reachedLengthCheckpoint) {
      this.#nextAnalysisLength = Math.max(this.#currentText.length + 1, this.#currentText.length * 2);
    }
    if (reachedStrongCheckpoint) {
      this.#nextStrongAnalysisCount = Math.max(this.#strongCharacters + 1, this.#strongCharacters * 2);
    }
    if (this.#strategy === 'majority') {
      this.#direction = candidate;
      return;
    }

    const counts = countStrongCharacters(this.#currentText, { strategy: 'content-majority' });
    const margin = Math.abs(counts.rtl - counts.ltr);
    const requiredCount = this.#strategy === 'sticky-majority' ? 1 : this.#lockAfter;
    const requiredMargin = this.#strategy === 'sticky-majority' ? 1 : this.#lockMargin;
    if (counts.total >= requiredCount && margin >= requiredMargin && candidate !== 'neutral') {
      this.#direction = candidate;
      this.#locked = true;
    }
  }
}

export function createBidiStream(options: BidiStreamOptions = {}): BidiStream {
  return new BidiStream(options);
}

/** Naming aligned with Markdown/chat integrations in the public specification. */
export function createBidiMarkdownStream(options: BidiStreamOptions = {}): BidiStream {
  return createBidiStream(options);
}
