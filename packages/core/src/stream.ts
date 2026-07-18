import { detectDirection } from './detect.js';
import type {
  BidiStreamOptions,
  BidiStreamSnapshot,
  Direction,
  StreamParagraph,
  StreamStrategy
} from './types.js';

const DEFAULT_SEPARATOR = /\r\n|\n|\r|\u2029/g;

function detectForStrategy(text: string, strategy: StreamStrategy, fallback: Direction, threshold: number): Direction {
  return detectDirection(text, {
    strategy: strategy === 'first-strong' ? 'first-strong' : 'majority',
    fallback,
    majorityThreshold: threshold
  });
}

export class BidiStream {
  readonly #strategy: StreamStrategy;
  readonly #fallback: Direction;
  readonly #separator: RegExp;
  readonly #threshold: number;
  #text = '';
  #direction: Direction;
  #locked = false;
  #lastChanged = false;
  #finished = false;

  constructor(options: BidiStreamOptions = {}) {
    this.#strategy = options.strategy ?? 'content-majority';
    this.#fallback = options.fallback ?? 'ltr';
    this.#separator = options.paragraphSeparator ?? DEFAULT_SEPARATOR;
    this.#threshold = options.majorityThreshold ?? 0.5;
    this.#direction = this.#fallback;
  }

  push(chunk: string): BidiStreamSnapshot {
    if (this.#finished) throw new Error('Cannot push after finish().');
    if (!chunk) return this.snapshot();
    this.#text += chunk;
    const currentText = this.#currentParagraphText();
    const candidate = detectForStrategy(currentText, this.#strategy, this.#fallback, this.#threshold);
    const previous = this.#direction;

    if (this.#strategy === 'first-strong') {
      const actual = detectDirection(currentText, { strategy: 'first-strong', fallback: 'neutral' });
      if (!this.#locked && actual !== 'neutral') {
        this.#direction = actual;
        this.#locked = true;
      }
    } else if (this.#strategy === 'sticky-majority') {
      const actual = detectDirection(currentText, {
        strategy: 'majority',
        fallback: 'neutral',
        majorityThreshold: this.#threshold
      });
      if (!this.#locked && actual !== 'neutral') {
        this.#direction = actual;
        this.#locked = true;
      }
    } else {
      this.#direction = candidate;
    }

    this.#lastChanged = previous !== this.#direction;
    return this.snapshot();
  }

  reset(): BidiStreamSnapshot {
    this.#text = '';
    this.#direction = this.#fallback;
    this.#locked = false;
    this.#lastChanged = false;
    this.#finished = false;
    return this.snapshot();
  }

  /** Marks the stream complete while preserving the logical source text. */
  finish(): BidiStreamSnapshot {
    this.#finished = true;
    return this.snapshot();
  }

  snapshot(): BidiStreamSnapshot {
    const parts = this.#splitParagraphs();
    const paragraphs: StreamParagraph[] = parts.map((text, index) => ({
      text,
      direction: detectForStrategy(text, this.#strategy, this.#fallback, this.#threshold),
      completed: index < parts.length - 1,
      index
    }));
    const currentParagraph = paragraphs.at(-1) ?? {
      text: '',
      direction: this.#direction,
      completed: false,
      index: 0
    };

    return {
      text: this.#text,
      direction: this.#direction,
      changed: this.#lastChanged,
      locked: this.#locked,
      paragraphs,
      currentParagraph
    };
  }

  #splitParagraphs(): string[] {
    const flags = this.#separator.flags.replace('y', '').includes('g')
      ? this.#separator.flags.replace('y', '')
      : `${this.#separator.flags.replace('y', '')}g`;
    const separator = new RegExp(this.#separator.source, flags);
    const parts: string[] = [];
    let start = 0;
    let match: RegExpExecArray | null;
    while ((match = separator.exec(this.#text)) !== null) {
      parts.push(this.#text.slice(start, match.index));
      start = match.index + match[0].length;
      if (match[0].length === 0) separator.lastIndex += 1;
    }
    parts.push(this.#text.slice(start));
    return parts;
  }

  #currentParagraphText(): string {
    return this.#splitParagraphs().at(-1) ?? '';
  }
}

export function createBidiStream(options: BidiStreamOptions = {}): BidiStream {
  return new BidiStream(options);
}

/** Naming aligned with Markdown/chat integrations in the public specification. */
export function createBidiMarkdownStream(options: BidiStreamOptions = {}): BidiStream {
  return createBidiStream(options);
}
