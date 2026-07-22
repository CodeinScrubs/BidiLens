import { DEFAULT_TECHNICAL_IDENTIFIERS, countStrongCharacters, detectDirection } from './detect.js';
import { classifyBidiStrongCharacter, classifyCharacter } from './classify.js';
import type {
  BidiStreamOptions,
  BidiStreamSnapshot,
  Direction,
  StreamParagraph,
  StreamStrategy
} from './types.js';

const DEFAULT_SEPARATOR_SOURCE = '\\r\\n|\\n|\\r|\\u2029';
const DEFAULT_SEPARATOR = new RegExp(DEFAULT_SEPARATOR_SOURCE, 'g');
const COMMAND_STARTERS = new Set(['npm', 'pnpm', 'yarn', 'npx', 'git', 'pip', 'python', 'node', 'cargo', 'go', 'docker', 'kubectl']);

interface IdentifierTrieNode {
  terminal: boolean;
  children: Map<string, IdentifierTrieNode>;
}

function technicalIdentifierTrie(values: readonly string[]): IdentifierTrieNode | null {
  let root: IdentifierTrieNode | null = null;
  for (const identifier of values) {
    if (!/^[A-Za-z][A-Za-z0-9_.-]*$/u.test(identifier)) continue;
    root ??= { terminal: false, children: new Map() };
    let node = root;
    for (const character of identifier.toLowerCase()) {
      let child = node.children.get(character);
      if (!child) {
        child = { terminal: false, children: new Map() };
        node.children.set(character, child);
      }
      node = child;
    }
    node.terminal = true;
  }
  return root;
}

// The immutable built-in vocabulary is shared by every stream. Only explicit
// per-stream additions allocate an overlay trie.
const DEFAULT_TECHNICAL_TRIE = technicalIdentifierTrie(DEFAULT_TECHNICAL_IDENTIFIERS)!;

function batchStrategy(strategy: StreamStrategy): 'content-majority' | 'first-strong' | 'majority' {
  if (strategy === 'first-strong') return 'first-strong';
  if (strategy === 'majority') return 'majority';
  return 'content-majority';
}

function detectForStrategy(
  text: string,
  strategy: StreamStrategy,
  fallback: Direction,
  threshold: number,
  technicalIdentifiers: readonly string[]
): Direction {
  return detectDirection(text, {
    strategy: batchStrategy(strategy),
    fallback,
    majorityThreshold: threshold,
    technicalIdentifiers
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
  readonly #technicalIdentifiers: readonly string[];
  readonly #customTechnicalTrie: IdentifierTrieNode | null;
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
  #adoptedDirection = false;
  #hadAdoptionEvidence = false;
  #policyToken = '';
  #policyTokenLtr = 0;
  #policyTokenRtl = 0;
  #policyTokenContributionLtr = 0;
  #policyTokenContributionRtl = 0;
  #policyTokenFirstStrong: Direction = 'neutral';
  #policyTokenLettersOnly = true;
  #policyTokenHasAsciiLetter = false;
  #policyTokenDefaultTrieNode: IdentifierTrieNode | null = DEFAULT_TECHNICAL_TRIE;
  #policyTokenCustomTrieNode: IdentifierTrieNode | null;
  #policyTokenAllUpper = true;
  #policyTokenUppercaseCount = 0;
  #policyTokenPreviousLower = false;
  #policyTokenCamelCase = false;
  #policyTokenIdentifierShape = true;
  #policyTokenIdentifierTechnical = false;
  #policyTokenIdentifierHasShapeMarker = false;
  #policyTokenTrailingSeparator = false;
  #policyTokenLastWordTechnical = false;
  #policyTokenStableTechnical: 'url' | 'email' | 'path' | 'identifier' | null = null;
  #policyTokenStableLtr = 0;
  #policyTokenStableRtl = 0;
  #policyTokenStableFirstStrong: Direction = 'neutral';
  #policyTokenStablePathIsOpenEnded = false;
  #policyLtr = 0;
  #policyRtl = 0;
  #policyCorrectionLtr = 0;
  #policyCorrectionRtl = 0;
  #policyFirstStrong: Direction = 'neutral';
  #policyMode: 'plain' | 'backtick' | 'after-backtick' | 'html' | 'dollar' | 'double-dollar' | 'paren' | 'slash' | 'command' = 'plain';
  #policyStructureLtr = 0;
  #policyStructureRtl = 0;
  #policyStructureFirstStrong: Direction = 'neutral';
  #policyHtmlStage = 0;
  #policyHtmlValid = false;
  #policyDollarHasContent = false;
  #policyDollarEnvironment: 'none' | 'brace-open' | 'unbraced' | 'braced' = 'none';
  #policySingleDollarOpen = false;
  #policyDollarOverlapEnvironment = false;
  #policyClosingRun = 0;
  #policyBacktickOpeningRun = 0;
  #policyBacktickContentStarted = false;
  #policyBacktickEvidenceDiscarded = false;
  #policyBacktickRemainder = 0;
  #policyDormantBacktickDelimiter = 0;
  #policyDormantBacktickClosingRun = 0;
  #policyDormantBacktickEffectiveLtr = 0;
  #policyDormantBacktickEffectiveRtl = 0;
  #policyDormantBacktickFirstStrong: Direction = 'neutral';
  #policyDormantBacktickHadAdoptionEvidence = false;
  #policyDormantBacktickAdoptedDirection = false;
  #policyDormantBacktickDirection: Direction = 'ltr';
  #policyBacktickAmbiguousDelimiter = 0;
  #policyPreviousWasSlash = false;
  #policyCommandQuote: "'" | '"' | null = null;
  #quotedCommandDefaultTrieNode: IdentifierTrieNode | null = DEFAULT_TECHNICAL_TRIE;
  #quotedCommandCustomTrieNode: IdentifierTrieNode | null;
  #quotedCommandWordAllUpper = true;
  #quotedCommandUppercaseCount = 0;
  #quotedCommandPreviousLower = false;
  #quotedCommandWordLtr = 0;
  #quotedCommandPendingShapeSeparator = false;
  #quotedCommandStableTechnicalWord = false;
  #quotedCommandWasExactTechnicalWord = false;
  #quotedCommandPendingPathSeparator = false;
  #quotedCommandUrl = false;
  #quotedCommandWordText = '';
  #quotedCommandNestedStarter = false;
  #quotedCommandNestedCommand = false;
  #quotedCommandNestedArgumentPrefix = '';
  #quotedCommandNestedArgumentUrl = false;
  #policyCommandInUnquotedArgument = false;
  #policyCommandAfterQuotedArgument = false;
  #policyCommandArgumentIsFlag = false;
  #policyCommandArgumentHasTechnicalSyntax = false;
  #policyCommandArgumentPrefix = '';
  #policyCommandPreviousWasBackslash = false;
  #policyCommandTechnical = false;
  #policyCommandStarterLtr = 0;
  #policyCommandStarterRtl = 0;
  #requiresExactLiveAnalysis = false;
  #exactLiveAnalysisDue = false;
  #policyTechnicalContinuation: 'command-url' | null = null;
  #policyTechnicalContinuationLastCharacter = '';
  #policyTechnicalContinuationWord = '';

  constructor(options: BidiStreamOptions = {}) {
    this.#strategy = options.strategy ?? 'content-majority';
    this.#fallback = options.fallback ?? 'ltr';
    this.#separator = options.paragraphSeparator ?? DEFAULT_SEPARATOR;
    this.#usesDefaultSeparator = options.paragraphSeparator === undefined;
    this.#threshold = Math.min(1, Math.max(0.5, options.majorityThreshold ?? 0.5));
    // A single short opposite-language word should remain provisional. Eight
    // strong characters and a margin of three let the default strategy adopt
    // a direction while keeping it revisable as more model output arrives.
    this.#lockAfter = Math.max(1, options.lockAfterStrongCharacters ?? 8);
    this.#lockMargin = Math.max(1, options.lockMargin ?? 3);
    this.#technicalIdentifiers = Object.freeze([...(options.technicalIdentifiers ?? [])]);
    this.#customTechnicalTrie = technicalIdentifierTrie(this.#technicalIdentifiers);
    this.#policyTokenCustomTrieNode = this.#customTechnicalTrie;
    this.#quotedCommandCustomTrieNode = this.#customTechnicalTrie;
    this.#direction = this.#fallback;
  }

  push(chunk: string): BidiStreamSnapshot {
    if (this.#finished) throw new Error('Cannot push after finish().');
    if (!chunk) return this.snapshot();
    const previous = this.#direction;
    this.#text += chunk;
    if (this.#usesDefaultSeparator) this.#consumeDefaultSeparators(chunk, false);
    else this.#appendCurrent(chunk);
    // A caller can observe the stream at every push boundary. Reconcile only
    // the still-open lexical run here so live classification has the exact
    // same punctuation, URL, path, package, and identifier semantics as the
    // batch policy without rescanning the full paragraph.
    this.#reconcilePolicyToken();
    // Source-length checkpoints may have inspected a partial technical token
    // immediately before this push ended. Majority mode is intentionally
    // non-sticky, so let the incremental policy state settle the observable
    // snapshot after every boundary; exact reconciliation below still wins
    // for future-sensitive overlaps.
    if (this.#strategy === 'majority') this.#refreshPolicyDirection();
    if (this.#policyBacktickAmbiguousDelimiter > 0
      && this.#policyMode === 'backtick'
      && !this.#policyBacktickContentStarted) {
      this.#exactLiveAnalysisDue = true;
      if (this.#policyBacktickOpeningRun >= this.#policyBacktickAmbiguousDelimiter) {
        this.#policyBacktickAmbiguousDelimiter = 0;
        this.#resetPolicyStructure();
        this.#policyMode = 'after-backtick';
        this.#policyBacktickRemainder = 0;
      }
    }
    if (this.#requiresExactLiveAnalysis || this.#exactLiveAnalysisDue) {
      this.#reconcileExactLiveDirection();
      this.#exactLiveAnalysisDue = false;
    }
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
    this.#adoptedDirection = false;
    this.#hadAdoptionEvidence = false;
    this.#requiresExactLiveAnalysis = false;
    this.#exactLiveAnalysisDue = false;
    this.#policyTechnicalContinuation = null;
    this.#policyTechnicalContinuationLastCharacter = '';
    this.#policyTechnicalContinuationWord = '';
    this.#policySingleDollarOpen = false;
    this.#policyDormantBacktickDelimiter = 0;
    this.#policyBacktickAmbiguousDelimiter = 0;
    this.#resetPolicyToken();
    this.#policyLtr = 0;
    this.#policyRtl = 0;
    this.#policyCorrectionLtr = 0;
    this.#policyCorrectionRtl = 0;
    this.#policyFirstStrong = 'neutral';
    this.#resetPolicyStructure();
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
    this.#direction = detectForStrategy(
      this.#currentText,
      this.#strategy,
      this.#fallback,
      this.#threshold,
      this.#technicalIdentifiers
    );
    this.#locked = this.#direction !== 'neutral';
    this.#lastChanged = previous !== this.#direction;
    this.#finished = true;
    return this.snapshot();
  }

  snapshot(): BidiStreamSnapshot {
    const currentParagraph: StreamParagraph = {
      text: this.#currentText,
      direction: this.#finished
        ? detectForStrategy(
            this.#currentText,
            this.#strategy,
            this.#fallback,
            this.#threshold,
            this.#technicalIdentifiers
          )
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
    this.#processPolicyCharacter(character);
    // Schedule by source position, not by push() boundaries. This guarantees
    // identical live decisions for one large chunk and any subdivision of it.
    const strongDirection = classifyBidiStrongCharacter(character);
    if (strongDirection !== 'neutral') {
      this.#strongCharacters += 1;
    }
    if (/\s/u.test(character) || strongDirection !== 'neutral') {
      this.#analysisDue = true;
    }
    this.#updateLiveDirection();
  }

  #completeCurrentParagraph(): void {
    this.#flushPendingHighSurrogate();
    this.#completedParagraphs.push({
      text: this.#currentText,
      direction: detectForStrategy(
        this.#currentText,
        this.#strategy,
        this.#fallback,
        this.#threshold,
        this.#technicalIdentifiers
      ),
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
    this.#adoptedDirection = false;
    this.#hadAdoptionEvidence = false;
    this.#requiresExactLiveAnalysis = false;
    this.#exactLiveAnalysisDue = false;
    this.#policyTechnicalContinuation = null;
    this.#policyTechnicalContinuationLastCharacter = '';
    this.#policyTechnicalContinuationWord = '';
    this.#policySingleDollarOpen = false;
    this.#policyDormantBacktickDelimiter = 0;
    this.#policyBacktickAmbiguousDelimiter = 0;
    this.#resetPolicyToken();
    this.#policyLtr = 0;
    this.#policyRtl = 0;
    this.#policyCorrectionLtr = 0;
    this.#policyCorrectionRtl = 0;
    this.#policyFirstStrong = 'neutral';
    this.#resetPolicyStructure();
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
    this.#adoptedDirection = false;
    this.#hadAdoptionEvidence = false;
    this.#requiresExactLiveAnalysis = false;
    this.#exactLiveAnalysisDue = false;
    this.#policyTechnicalContinuation = null;
    this.#policyTechnicalContinuationLastCharacter = '';
    this.#policyTechnicalContinuationWord = '';
    this.#policySingleDollarOpen = false;
    this.#policyDormantBacktickDelimiter = 0;
    this.#policyBacktickAmbiguousDelimiter = 0;
    this.#resetPolicyToken();
    this.#policyLtr = 0;
    this.#policyRtl = 0;
    this.#policyCorrectionLtr = 0;
    this.#policyCorrectionRtl = 0;
    this.#policyFirstStrong = 'neutral';
    this.#resetPolicyStructure();
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
    const candidate = detectForStrategy(
      this.#currentText,
      this.#strategy,
      this.#fallback,
      this.#threshold,
      this.#technicalIdentifiers
    );
    this.#analysisDue = false;
    const checkpointGrowth = this.#adoptedDirection ? 4 : 2;
    if (reachedLengthCheckpoint) {
      this.#nextAnalysisLength = Math.max(
        this.#currentText.length + 1,
        this.#currentText.length * checkpointGrowth
      );
    }
    if (reachedStrongCheckpoint) {
      this.#nextStrongAnalysisCount = Math.max(
        this.#strongCharacters + 1,
        this.#strongCharacters * checkpointGrowth
      );
    }
    if (this.#strategy === 'majority') {
      this.#direction = candidate;
      return;
    }

    const counts = countStrongCharacters(this.#currentText, {
      strategy: 'content-majority',
      technicalIdentifiers: this.#technicalIdentifiers
    });
    const margin = Math.abs(counts.rtl - counts.ltr);
    const sticky = this.#strategy === 'sticky-majority';
    const requiredCount = sticky ? 1 : this.#lockAfter;
    const requiredMargin = sticky ? 1 : this.#lockMargin;
    const revisingAdoptedDirection = !sticky
      && this.#adoptedDirection
      && candidate !== this.#direction;
    const enoughEvidence = counts.total >= requiredCount && margin >= requiredMargin;
    if (candidate !== 'neutral'
      && (revisingAdoptedDirection
        || enoughEvidence)) {
      this.#direction = candidate;
      this.#adoptedDirection = true;
      if (enoughEvidence) this.#hadAdoptionEvidence = true;
      this.#locked = sticky;
    }
  }

  #reconcileExactLiveDirection(): void {
    if (this.#locked || this.#strategy === 'first-strong') return;
    const candidate = detectForStrategy(
      this.#currentText,
      this.#strategy,
      this.#fallback,
      this.#threshold,
      this.#technicalIdentifiers
    );
    const counts = countStrongCharacters(this.#currentText, {
      strategy: 'content-majority',
      technicalIdentifiers: this.#technicalIdentifiers
    });
    this.#policyCorrectionLtr = counts.ltr - this.#policyLtr;
    this.#policyCorrectionRtl = counts.rtl - this.#policyRtl;
    this.#policyFirstStrong = counts.firstStrong;
    this.#requiresExactLiveAnalysis = false;
    if (this.#strategy === 'majority') {
      this.#direction = candidate;
      return;
    }
    const margin = Math.abs(counts.rtl - counts.ltr);
    const sticky = this.#strategy === 'sticky-majority';
    const enoughEvidence = counts.total >= (sticky ? 1 : this.#lockAfter)
      && margin >= (sticky ? 1 : this.#lockMargin);
    if (enoughEvidence) this.#hadAdoptionEvidence = true;
    const responsiveEvidence = enoughEvidence
      || (this.#hadAdoptionEvidence && counts.total > 0 && margin >= this.#lockMargin);
    if (responsiveEvidence) {
      this.#direction = candidate;
      this.#adoptedDirection = true;
      this.#locked = sticky;
    } else {
      this.#direction = this.#fallback;
      this.#adoptedDirection = false;
    }
  }

  #completePolicyToken(): { ltr: number; rtl: number; firstStrong: Direction } | null {
    if (!this.#policyToken) return null;
    const counts = this.#reconcilePolicyToken();
    if (!counts) return null;
    if (this.#policyFirstStrong === 'neutral' && counts.firstStrong !== 'neutral') {
      this.#policyFirstStrong = counts.firstStrong;
    }
    this.#resetPolicyToken();
    this.#refreshPolicyDirection();
    return counts;
  }

  #reconcilePolicyToken(): { ltr: number; rtl: number; firstStrong: Direction } | null {
    if (!this.#policyToken) return null;
    let counts: { ltr: number; rtl: number; firstStrong: Direction };
    if (this.#policyTokenLtr + this.#policyTokenRtl === 0) {
      counts = { ltr: 0, rtl: 0, firstStrong: 'neutral' };
    } else if (this.#policyTokenIdentifierShape) {
      const technical = this.#policyTokenTrailingSeparator
        ? this.#policyTokenLastWordTechnical
        : this.#policyTokenIdentifierTechnical;
      counts = technical
        ? { ltr: 0, rtl: 0, firstStrong: 'neutral' }
        : {
            ltr: this.#policyTokenLtr,
            rtl: this.#policyTokenRtl,
            firstStrong: this.#policyTokenFirstStrong
          };
    } else if (this.#policyTokenLettersOnly && !this.#policyTokenHasAsciiLetter) {
      counts = {
        ltr: this.#policyTokenLtr,
        rtl: this.#policyTokenRtl,
        firstStrong: this.#policyTokenFirstStrong
      };
    } else {
      const lastCharacter = this.#policyToken.at(-1)!;
      const stableContinues = this.#policyTokenStableTechnical === 'url'
        ? !/[<>{}"']/u.test(lastCharacter)
        : this.#policyTokenStableTechnical === 'path'
          ? this.#policyTokenStablePathIsOpenEnded
            ? !/[<>()[\]{}]/u.test(lastCharacter)
            : /[A-Za-z0-9_.\\/-]/u.test(lastCharacter)
          : this.#policyTokenStableTechnical === 'email'
            ? /[A-Za-z0-9._%+-]/u.test(lastCharacter)
            : this.#policyTokenStableTechnical === 'identifier'
              ? /[A-Za-z0-9._/-]/u.test(lastCharacter)
              : false;
      if (stableContinues) {
        counts = {
          ltr: this.#policyTokenStableLtr,
          rtl: this.#policyTokenStableRtl,
          firstStrong: this.#policyTokenStableFirstStrong
        };
      } else {
        this.#policyTokenStableTechnical = null;
        const exact = countStrongCharacters(this.#policyToken, {
          strategy: 'content-majority',
          technicalIdentifiers: this.#technicalIdentifiers
        });
        counts = exact;
        const stableRange = exact.technicalTokens.find((range) => range.end === this.#policyToken.length
          && (range.kind === 'url'
            || range.kind === 'email'
            || range.kind === 'path'
            || (range.kind === 'identifier' && range.text.includes('/'))));
        const stableKind = stableRange?.kind;
        if (stableKind === 'url' || stableKind === 'email'
          || stableKind === 'path' || stableKind === 'identifier') {
          this.#policyTokenStableTechnical = stableKind;
          this.#policyTokenStableLtr = exact.ltr;
          this.#policyTokenStableRtl = exact.rtl;
          this.#policyTokenStableFirstStrong = exact.firstStrong;
          this.#policyTokenStablePathIsOpenEnded = stableKind === 'path'
            && /^(?:[A-Za-z]:[\\/]|\.{0,2}\/|~\/)/u.test(this.#policyToken);
        }
      }
    }
    this.#policyLtr += counts.ltr - this.#policyTokenContributionLtr;
    this.#policyRtl += counts.rtl - this.#policyTokenContributionRtl;
    this.#policyTokenContributionLtr = counts.ltr;
    this.#policyTokenContributionRtl = counts.rtl;
    this.#refreshPolicyDirection(counts.firstStrong, false);
    return counts;
  }

  #recordPolicyCharacter(character: string, target: 'token' | 'structure'): void {
    const direction = classifyCharacter(character);
    if (target === 'token') {
      if (direction === 'ltr') this.#policyTokenLtr += 1;
      if (direction === 'rtl') this.#policyTokenRtl += 1;
      if (direction === 'ltr') {
        this.#policyLtr += 1;
        this.#policyTokenContributionLtr += 1;
      }
      if (direction === 'rtl') {
        this.#policyRtl += 1;
        this.#policyTokenContributionRtl += 1;
      }
      if (direction !== 'neutral' && this.#policyTokenFirstStrong === 'neutral') {
        this.#policyTokenFirstStrong = direction;
      }
      const letter = /^\p{L}$/u.test(character);
      const asciiLetter = /^[A-Za-z]$/u.test(character);
      const identifierCharacter = /^[A-Za-z0-9_.-]$/u.test(character);
      const firstIdentifierCharacter = this.#policyToken.length === 1;
      if (!letter) this.#policyTokenLettersOnly = false;
      if (asciiLetter) this.#policyTokenHasAsciiLetter = true;
      if ((firstIdentifierCharacter && !asciiLetter) || !identifierCharacter) {
        this.#policyTokenIdentifierShape = false;
      }
      if (!identifierCharacter) {
        this.#policyTokenDefaultTrieNode = null;
        this.#policyTokenCustomTrieNode = null;
      } else {
        const normalized = character.toLowerCase();
        this.#policyTokenDefaultTrieNode = this.#policyTokenDefaultTrieNode?.children.get(normalized) ?? null;
        this.#policyTokenCustomTrieNode = this.#policyTokenCustomTrieNode?.children.get(normalized) ?? null;
      }
      if (this.#policyTokenPreviousLower && /^[A-Z]$/u.test(character)) {
        this.#policyTokenCamelCase = true;
      }
      if (/^[A-Z]$/u.test(character)) this.#policyTokenUppercaseCount += 1;
      else this.#policyTokenAllUpper = false;
      this.#policyTokenPreviousLower = /^[a-z]$/u.test(character);
      if (/^[0-9_]$/u.test(character)) this.#policyTokenIdentifierHasShapeMarker = true;
      if (/^[.-]$/u.test(character)) {
        this.#policyTokenTrailingSeparator = true;
      } else if (/^[A-Za-z0-9_]$/u.test(character)) {
        if (this.#policyTokenTrailingSeparator) this.#policyTokenIdentifierHasShapeMarker = true;
        this.#policyTokenTrailingSeparator = false;
        const acronym = this.#policyTokenAllUpper && this.#policyTokenUppercaseCount >= 2;
        this.#policyTokenIdentifierTechnical = this.#policyTokenIdentifierHasShapeMarker
          || this.#policyTokenCamelCase
          || acronym
          || this.#policyTokenDefaultTrieNode?.terminal === true
          || this.#policyTokenCustomTrieNode?.terminal === true;
        this.#policyTokenLastWordTechnical = this.#policyTokenIdentifierTechnical;
      }
    } else {
      if (direction === 'neutral') return;
      if (direction === 'ltr') this.#policyLtr += 1;
      else this.#policyRtl += 1;
      if (direction === 'ltr') this.#policyStructureLtr += 1;
      else this.#policyStructureRtl += 1;
      if (this.#policyStructureFirstStrong === 'neutral') this.#policyStructureFirstStrong = direction;
      this.#refreshPolicyDirection(this.#policyStructureFirstStrong);
    }
  }

  #refreshPolicyDirection(
    provisionalFirstStrong: Direction = 'neutral',
    canCreateHistory = true
  ): void {
    if (this.#locked) return;
    const effectiveLtr = Math.max(0, this.#policyLtr + this.#policyCorrectionLtr);
    const effectiveRtl = Math.max(0, this.#policyRtl + this.#policyCorrectionRtl);
    const total = effectiveLtr + effectiveRtl;
    let candidate = this.#policyFirstStrong !== 'neutral'
      ? this.#policyFirstStrong
      : provisionalFirstStrong !== 'neutral' ? provisionalFirstStrong : this.#fallback;
    if (total > 0) {
      if (effectiveRtl > effectiveLtr && effectiveRtl / total >= this.#threshold) candidate = 'rtl';
      if (effectiveLtr > effectiveRtl && effectiveLtr / total >= this.#threshold) candidate = 'ltr';
    }
    if (this.#strategy === 'majority') {
      this.#direction = candidate;
      return;
    }
    const margin = Math.abs(effectiveRtl - effectiveLtr);
    const sticky = this.#strategy === 'sticky-majority';
    const enoughEvidence = total >= (sticky ? 1 : this.#lockAfter)
      && margin >= (sticky ? 1 : this.#lockMargin);
    if (canCreateHistory && enoughEvidence) this.#hadAdoptionEvidence = true;
    const responsiveEvidence = enoughEvidence
      || (this.#hadAdoptionEvidence && total > 0 && margin >= this.#lockMargin);
    // A partial URL, identifier, quote, or code span can temporarily look
    // like natural-language evidence. If exact reconciliation later removes
    // that evidence, revoke the provisional adoption as well; otherwise push
    // boundaries could permanently influence the final live direction.
    if (!sticky && this.#adoptedDirection && !responsiveEvidence) {
      this.#adoptedDirection = false;
      this.#direction = this.#fallback;
      return;
    }
    if (candidate !== this.#direction && (this.#adoptedDirection || responsiveEvidence)) {
      this.#direction = candidate;
    }
    if (!this.#adoptedDirection && responsiveEvidence) this.#adoptedDirection = true;
    if (sticky && this.#adoptedDirection) this.#locked = true;
  }

  #processPolicyCharacter(character: string): void {
    if (/\r|\n|\u2029/u.test(character)) {
      this.#policyDormantBacktickDelimiter = 0;
      this.#policySingleDollarOpen = false;
    }
    if (this.#policyTechnicalContinuation === 'command-url') {
      if (!/\s/u.test(character) && !/[<>{}"']/u.test(character)) {
        this.#policyTechnicalContinuationLastCharacter = character;
        this.#policyTechnicalContinuationWord = /[A-Za-z]/u.test(character)
          ? `${this.#policyTechnicalContinuationWord}${character}`.slice(-12)
          : '';
        return;
      }
      const lastTechnicalCharacter = this.#policyTechnicalContinuationLastCharacter;
      const trailingTechnicalWord = this.#policyTechnicalContinuationWord.toLowerCase();
      this.#policyTechnicalContinuation = null;
      this.#policyTechnicalContinuationLastCharacter = '';
      this.#policyTechnicalContinuationWord = '';
      if (lastTechnicalCharacter === '$' && character === '{') {
        this.#resetPolicyStructure();
        this.#policyMode = 'dollar';
        this.#policySingleDollarOpen = true;
        this.#processPolicyCharacter(character);
        return;
      }
      this.#resetPolicyStructure();
      if (COMMAND_STARTERS.has(trailingTechnicalWord)) {
        this.#policyMode = 'command';
        this.#policyCommandTechnical = true;
      }
      this.#processPolicyCharacter(character);
      return;
    }
    if (this.#policyMode === 'plain') {
      if (character === '`' && this.#policyDormantBacktickDelimiter > 0) {
        this.#completePolicyToken();
        this.#policyDormantBacktickClosingRun += 1;
        const discardThreshold = this.#policyDormantBacktickDelimiter % 2 === 1
          ? 1
          : (this.#policyDormantBacktickDelimiter / 2) + 1;
        if (this.#policyDormantBacktickClosingRun < discardThreshold) return;
        this.#policyCorrectionLtr = this.#policyDormantBacktickEffectiveLtr - this.#policyLtr;
        this.#policyCorrectionRtl = this.#policyDormantBacktickEffectiveRtl - this.#policyRtl;
        this.#policyFirstStrong = this.#policyDormantBacktickFirstStrong;
        this.#hadAdoptionEvidence = this.#policyDormantBacktickHadAdoptionEvidence;
        this.#adoptedDirection = this.#policyDormantBacktickAdoptedDirection;
        this.#direction = this.#policyDormantBacktickDirection;
        this.#resetPolicyStructure();
        this.#policyDormantBacktickDelimiter = 0;
        this.#policyDormantBacktickClosingRun = 0;
        this.#policyMode = 'after-backtick';
        this.#policyBacktickRemainder = 0;
        this.#refreshPolicyDirection();
        return;
      }
      if (this.#policyDormantBacktickDelimiter > 0) {
        this.#policyDormantBacktickClosingRun = 0;
      }
      if (/^[()]$/u.test(character) && this.#policyToken.endsWith('\\')) {
        this.#completePolicyToken();
        this.#resetPolicyStructure();
        if (character === '(') this.#policyMode = 'paren';
        return;
      }
      if (/^[()[\]{},;!?"'،؛؟。।۔]$/u.test(character)) {
        const url = /\b(?:https?|ftp):\/\//iu.test(this.#policyToken);
        const openPath = /^(?:[A-Za-z]:[\\/]|\.{0,2}\/|~\/)/u.test(this.#policyToken);
        const urlPunctuation = url && !/^["']$/u.test(character);
        const openPathPunctuation = openPath && !/^[()[\]{}"']$/u.test(character);
        if (!urlPunctuation && !openPathPunctuation) {
          this.#completePolicyToken();
          return;
        }
      }
      if (/\s/u.test(character)) {
        const commandMatch = /[A-Za-z]+$/u.exec(this.#policyToken);
        const commandStarter = commandMatch?.[0].toLowerCase();
        const commandStart = commandMatch?.index ?? -1;
        const command = commandStarter !== undefined
          && COMMAND_STARTERS.has(commandStarter)
          && (commandStart === 0 || !/[A-Za-z0-9_]/u.test(this.#policyToken[commandStart - 1]!));
        const counts = this.#completePolicyToken();
        if (command && counts) {
          this.#resetPolicyStructure();
          this.#policyMode = 'command';
          const starterCounts = countStrongCharacters(commandStarter, {
            strategy: 'content-majority',
            technicalIdentifiers: this.#technicalIdentifiers
          });
          this.#policyCommandStarterLtr = starterCounts.ltr;
          this.#policyCommandStarterRtl = starterCounts.rtl;
        }
        return;
      }
      if (character === '`' || character === '<' || character === '$') {
        this.#completePolicyToken();
        this.#resetPolicyStructure();
        if (character === '`') {
          this.#policyMode = 'backtick';
          this.#policyBacktickOpeningRun = 1;
        }
        else if (character === '<') {
          this.#policyMode = 'html';
        }
        else if (character === '$') {
          this.#policyMode = 'dollar';
          if (this.#policySingleDollarOpen) {
            this.#policySingleDollarOpen = false;
            this.#policyDollarOverlapEnvironment = true;
            this.#requiresExactLiveAnalysis = true;
          } else {
            this.#policySingleDollarOpen = true;
          }
        }
        return;
      }
      this.#policyToken += character;
      this.#recordPolicyCharacter(character, 'token');
      return;
    }

    if (this.#policyMode === 'command') {
      if (/\r|\n|\u2029/u.test(character)) {
        this.#commitProvisionalPolicyStructure();
        return;
      }
      if (this.#policyCommandPreviousWasBackslash && character === '(') {
        this.#resetPolicyStructure();
        this.#policyMode = 'paren';
        return;
      }
      this.#policyCommandPreviousWasBackslash = false;
      if (this.#policyCommandQuote !== null) {
        if (character === this.#policyCommandQuote) {
          this.#removePolicyStructureEvidence();
          this.#activatePolicyCommand();
          this.#policyCommandQuote = null;
          this.#policyCommandAfterQuotedArgument = true;
          this.#exactLiveAnalysisDue = true;
        } else {
          const technicalWord = this.#advanceQuotedCommandClassifier(character);
          if (!technicalWord) this.#recordPolicyCharacter(character, 'structure');
        }
        return;
      }
      if (/\s/u.test(character)) {
        this.#policyCommandInUnquotedArgument = false;
        this.#policyCommandAfterQuotedArgument = false;
        this.#policyCommandArgumentIsFlag = false;
        this.#policyCommandArgumentHasTechnicalSyntax = false;
        this.#policyCommandArgumentPrefix = '';
        return;
      }
      if (character === "'" || character === '"') {
        if (this.#policyCommandInUnquotedArgument || this.#policyCommandAfterQuotedArgument) {
          this.#resetPolicyStructure();
          this.#processPolicyCharacter(character);
          return;
        }
        this.#resetQuotedCommandWord();
        this.#policyCommandQuote = character;
        return;
      }
      if (/[@./\\A-Za-z0-9_:=+-]/u.test(character)) {
        if (this.#policyCommandAfterQuotedArgument) {
          this.#resetPolicyStructure();
          this.#processPolicyCharacter(character);
          return;
        }
        if (this.#policyCommandInUnquotedArgument
          && this.#policyCommandArgumentIsFlag
          && character === '=') {
          this.#resetPolicyStructure();
          this.#processPolicyCharacter(character);
          return;
        }
        if (!this.#policyCommandInUnquotedArgument) {
          this.#policyCommandArgumentIsFlag = character === '-';
        }
        this.#activatePolicyCommand();
        this.#policyCommandInUnquotedArgument = true;
        if (this.#policyCommandArgumentPrefix.length < 12) {
          this.#policyCommandArgumentPrefix += character;
        }
        if (/[:/@\\.]/u.test(character)) this.#policyCommandArgumentHasTechnicalSyntax = true;
        this.#policyCommandPreviousWasBackslash = character === '\\';
        return;
      }
      if (this.#policyCommandArgumentHasTechnicalSyntax) {
        this.#requiresExactLiveAnalysis = true;
        if (/^(?:https?|ftp):\/\//iu.test(this.#policyCommandArgumentPrefix)
          && !/[<>{}"']/u.test(character)) {
          this.#policyTechnicalContinuation = 'command-url';
          this.#policyTechnicalContinuationLastCharacter = character;
          this.#policyTechnicalContinuationWord = '';
          this.#resetPolicyStructure();
          return;
        }
      }
      this.#resetPolicyStructure();
      this.#processPolicyCharacter(character);
      return;
    }

    if (this.#policyMode === 'slash') {
      if (character === '(') this.#policyMode = 'paren';
      else {
        this.#resetPolicyStructure();
        this.#processPolicyCharacter(character);
      }
      return;
    }

    if (this.#policyMode === 'after-backtick') {
      if (character === '`') {
        this.#policyBacktickRemainder += 1;
        return;
      }
      this.#policyDormantBacktickDelimiter = this.#policyBacktickRemainder;
      if (this.#policyDormantBacktickDelimiter > 0) {
        this.#policyDormantBacktickClosingRun = 0;
        this.#policyDormantBacktickEffectiveLtr = this.#policyLtr + this.#policyCorrectionLtr;
        this.#policyDormantBacktickEffectiveRtl = this.#policyRtl + this.#policyCorrectionRtl;
        this.#policyDormantBacktickFirstStrong = this.#policyFirstStrong;
        this.#policyDormantBacktickHadAdoptionEvidence = this.#hadAdoptionEvidence;
        this.#policyDormantBacktickAdoptedDirection = this.#adoptedDirection;
        this.#policyDormantBacktickDirection = this.#direction;
      }
      this.#resetPolicyStructure();
      this.#processPolicyCharacter(character);
      return;
    }

    if (/\r|\n|\u2029/u.test(character)) {
      this.#commitProvisionalPolicyStructure();
      return;
    }

    if (this.#policyMode === 'backtick') {
      if (!this.#policyBacktickContentStarted) {
        if (character === '`') {
          this.#policyBacktickOpeningRun += 1;
        } else {
          this.#policyBacktickContentStarted = true;
          this.#recordPolicyCharacter(character, 'structure');
        }
      } else if (character === '`') {
        this.#policyClosingRun += 1;
        const discardThreshold = this.#policyBacktickOpeningRun % 2 === 1
          ? 1
          : (this.#policyBacktickOpeningRun / 2) + 1;
        if (!this.#policyBacktickEvidenceDiscarded
          && this.#policyClosingRun >= discardThreshold) {
          this.#removePolicyStructureEvidence();
          this.#policyBacktickEvidenceDiscarded = true;
        }
        if (this.#policyClosingRun === this.#policyBacktickOpeningRun) {
          this.#discardTechnicalPolicyStructure();
          this.#policyMode = 'after-backtick';
          this.#policyBacktickRemainder = 0;
          if (this.#policyBacktickAmbiguousDelimiter > 0) {
            this.#exactLiveAnalysisDue = true;
          }
        }
      } else {
        if (this.#policyClosingRun > 0) {
          this.#policyBacktickAmbiguousDelimiter = Math.max(
            this.#policyBacktickAmbiguousDelimiter,
            this.#policyBacktickOpeningRun
          );
          this.#requiresExactLiveAnalysis = true;
          this.#resetPolicyStructure();
          this.#processPolicyCharacter(character);
          return;
        }
        this.#policyClosingRun = 0;
        this.#recordPolicyCharacter(character, 'structure');
      }
      return;
    }

    if (this.#policyMode === 'html') {
      if (character === '<') {
        this.#commitProvisionalPolicyStructure();
        this.#policyMode = 'html';
        return;
      }
      if (character === '>') {
        if (this.#policyHtmlValid) this.#discardTechnicalPolicyStructure();
        else this.#commitProvisionalPolicyStructure();
        return;
      }
      this.#recordPolicyCharacter(character, 'structure');
      if (this.#policyHtmlStage === 0) {
        if (/[A-Za-z]/u.test(character)) this.#policyHtmlValid = true;
        else if (character === '/') this.#policyHtmlStage = 1;
        else this.#policyHtmlStage = 2;
      } else if (this.#policyHtmlStage === 1) {
        this.#policyHtmlValid = /[A-Za-z]/u.test(character);
        this.#policyHtmlStage = 2;
      }
      return;
    }

    if (this.#policyMode === 'dollar') {
      if (this.#policyDollarOverlapEnvironment) {
        this.#policyDollarOverlapEnvironment = false;
        if (/^[A-Z_]$/u.test(character)) {
          this.#policyDollarEnvironment = 'unbraced';
          return;
        }
        if (character === '{') {
          this.#policyDollarEnvironment = 'brace-open';
          return;
        }
        this.#resetPolicyStructure();
        this.#processPolicyCharacter(character);
        return;
      }
      if (this.#policyDollarEnvironment === 'unbraced') {
        if (/^[A-Z0-9_]$/u.test(character)) return;
        this.#resetPolicyStructure();
        this.#processPolicyCharacter(character);
        return;
      }
      if (this.#policyDollarEnvironment === 'brace-open') {
        if (/^[A-Z_]$/u.test(character)) {
          this.#policyDollarEnvironment = 'braced';
          return;
        }
        this.#policyDollarEnvironment = 'none';
        this.#policyDollarHasContent = true;
        this.#recordPolicyCharacter(character, 'structure');
        return;
      }
      if (this.#policyDollarEnvironment === 'braced') {
        if (/^[A-Z0-9_]$/u.test(character)) return;
        this.#resetPolicyStructure();
        if (character !== '}') this.#processPolicyCharacter(character);
        return;
      }
      if (character === '$') {
        this.#policySingleDollarOpen = false;
        if (this.#policyDollarHasContent) {
          this.#discardTechnicalPolicyStructure();
          this.#policyMode = 'dollar';
          this.#policyDollarOverlapEnvironment = true;
          if (this.#policyCorrectionLtr !== 0 || this.#policyCorrectionRtl !== 0) {
            this.#exactLiveAnalysisDue = true;
          }
        } else {
          this.#policyMode = 'double-dollar';
        }
      } else if (!this.#policyDollarHasContent && /^[A-Z_]$/u.test(character)) {
        this.#policyDollarEnvironment = 'unbraced';
      } else if (!this.#policyDollarHasContent && character === '{') {
        this.#policyDollarEnvironment = 'brace-open';
      } else {
        this.#policyDollarHasContent = true;
        this.#recordPolicyCharacter(character, 'structure');
      }
      return;
    }

    if (this.#policyMode === 'double-dollar') {
      if (character === '$') {
        this.#policyClosingRun += 1;
        if (this.#policyClosingRun === 2) {
          this.#discardTechnicalPolicyStructure();
          this.#policyMode = 'dollar';
          this.#policyDollarOverlapEnvironment = true;
          if (this.#policyCorrectionLtr !== 0 || this.#policyCorrectionRtl !== 0) {
            this.#exactLiveAnalysisDue = true;
          }
        }
      } else {
        this.#policyClosingRun = 0;
        this.#recordPolicyCharacter(character, 'structure');
      }
      return;
    }

    if (this.#policyMode === 'paren') {
      if (this.#policyPreviousWasSlash && character === ')') {
        this.#discardTechnicalPolicyStructure();
      } else {
        this.#recordPolicyCharacter(character, 'structure');
        this.#policyPreviousWasSlash = character === '\\';
      }
    }
  }

  #activatePolicyCommand(): void {
    if (this.#policyCommandTechnical) return;
    this.#policyCommandTechnical = true;
    this.#policyLtr -= this.#policyCommandStarterLtr;
    this.#policyRtl -= this.#policyCommandStarterRtl;
    if (this.#policyLtr + this.#policyCorrectionLtr
      + this.#policyRtl + this.#policyCorrectionRtl === 0) {
      this.#policyFirstStrong = 'neutral';
    }
    this.#refreshPolicyDirection();
  }

  #advanceQuotedCommandClassifier(character: string): boolean {
    const commandArgumentCharacter = /[@./\\A-Za-z0-9_:=+-]/u.test(character);
    if (this.#quotedCommandUrl) {
      if (!/\s/u.test(character) && !/[<>{}"']/u.test(character)) return true;
      this.#quotedCommandUrl = false;
    }
    if (this.#quotedCommandNestedCommand) {
      if (/\s/u.test(character)) {
        this.#quotedCommandNestedArgumentPrefix = '';
        this.#quotedCommandNestedArgumentUrl = false;
        return true;
      }
      if (commandArgumentCharacter) {
        if (character === '=' && this.#quotedCommandNestedArgumentPrefix.startsWith('-')) {
          this.#quotedCommandNestedCommand = false;
          this.#quotedCommandNestedArgumentPrefix = '';
          this.#quotedCommandNestedArgumentUrl = false;
          return false;
        }
        if (this.#quotedCommandNestedArgumentPrefix.length < 12) {
          this.#quotedCommandNestedArgumentPrefix += character;
        }
        if (/^(?:https?|ftp):\/\//iu.test(this.#quotedCommandNestedArgumentPrefix)) {
          this.#quotedCommandNestedArgumentUrl = true;
        }
        return true;
      }
      if (this.#quotedCommandNestedArgumentUrl && !/[<>{}"']/u.test(character)) return true;
      this.#quotedCommandNestedCommand = false;
    }
    if (this.#quotedCommandNestedStarter) {
      if (/\s/u.test(character)) return false;
      this.#quotedCommandNestedStarter = false;
      if (commandArgumentCharacter) {
        this.#quotedCommandNestedCommand = true;
        this.#quotedCommandNestedArgumentPrefix = character;
        this.#quotedCommandNestedArgumentUrl = false;
        this.#hadAdoptionEvidence = true;
        this.#exactLiveAnalysisDue = true;
        return true;
      }
    }
    if (this.#quotedCommandStableTechnicalWord) {
      if (/^[A-Za-z0-9_.-]$/u.test(character)) return true;
      this.#resetQuotedCommandWord();
    }
    if (/^[A-Za-z]$/u.test(character)) {
      if (this.#quotedCommandPendingPathSeparator) {
        this.#policyLtr -= this.#quotedCommandWordLtr;
        this.#policyStructureLtr -= this.#quotedCommandWordLtr;
        this.#quotedCommandWordLtr = 0;
        this.#quotedCommandStableTechnicalWord = true;
        this.#hadAdoptionEvidence = true;
        this.#quotedCommandPendingPathSeparator = false;
        this.#refreshPolicyDirection();
        return true;
      }
      const normalized = character.toLowerCase();
      const wasExactTechnical = this.#quotedCommandWasExactTechnicalWord;
      this.#quotedCommandDefaultTrieNode = this.#quotedCommandDefaultTrieNode?.children.get(normalized) ?? null;
      this.#quotedCommandCustomTrieNode = this.#quotedCommandCustomTrieNode?.children.get(normalized) ?? null;
      const camelCase = this.#quotedCommandPreviousLower && /^[A-Z]$/u.test(character);
      if (this.#quotedCommandPendingShapeSeparator || camelCase) {
        this.#policyLtr -= this.#quotedCommandWordLtr;
        this.#policyStructureLtr -= this.#quotedCommandWordLtr;
        this.#quotedCommandWordLtr = 0;
        this.#quotedCommandStableTechnicalWord = true;
        this.#hadAdoptionEvidence = true;
        this.#quotedCommandPendingShapeSeparator = false;
        this.#refreshPolicyDirection();
        return true;
      }
      if (/^[A-Z]$/u.test(character)) this.#quotedCommandUppercaseCount += 1;
      else this.#quotedCommandWordAllUpper = false;
      const exactTechnical = (this.#quotedCommandWordAllUpper && this.#quotedCommandUppercaseCount >= 2)
        || this.#quotedCommandDefaultTrieNode?.terminal === true
        || this.#quotedCommandCustomTrieNode?.terminal === true;
      if (exactTechnical || (wasExactTechnical && !exactTechnical)) {
        this.#exactLiveAnalysisDue = true;
      }
      this.#quotedCommandWasExactTechnicalWord = exactTechnical;
      this.#quotedCommandPreviousLower = /^[a-z]$/u.test(character);
      this.#quotedCommandWordLtr += 1;
      if (this.#quotedCommandWordText.length < 20) this.#quotedCommandWordText += character;
      return false;
    }
    if (/^[0-9_]$/u.test(character) && this.#quotedCommandWordLtr > 0) {
      this.#policyLtr -= this.#quotedCommandWordLtr;
      this.#policyStructureLtr -= this.#quotedCommandWordLtr;
      this.#quotedCommandWordLtr = 0;
      this.#quotedCommandStableTechnicalWord = true;
      this.#hadAdoptionEvidence = true;
      this.#refreshPolicyDirection();
      return true;
    }
    if (/^[.-]$/u.test(character) && this.#quotedCommandWordLtr > 0) {
      this.#quotedCommandPendingShapeSeparator = true;
      return false;
    }
    if (character === ':'
      && /^(?:https?|ftp)$/iu.test(this.#quotedCommandWordText)) {
      this.#policyLtr -= this.#quotedCommandWordLtr;
      this.#policyStructureLtr -= this.#quotedCommandWordLtr;
      this.#quotedCommandWordLtr = 0;
      this.#quotedCommandUrl = true;
      this.#hadAdoptionEvidence = true;
      this.#refreshPolicyDirection();
      return true;
    }
    if (character === '/' && this.#quotedCommandWordLtr > 0) {
      this.#quotedCommandPendingPathSeparator = true;
      this.#exactLiveAnalysisDue = true;
      return false;
    }
    if (/\s/u.test(character)
      && COMMAND_STARTERS.has(this.#quotedCommandWordText.toLowerCase())) {
      this.#quotedCommandNestedStarter = true;
    }
    if (/[@/:\\`<$]/u.test(character)) this.#exactLiveAnalysisDue = true;
    this.#resetQuotedCommandWord();
    return false;
  }

  #resetQuotedCommandWord(): void {
    this.#quotedCommandDefaultTrieNode = DEFAULT_TECHNICAL_TRIE;
    this.#quotedCommandCustomTrieNode = this.#customTechnicalTrie;
    this.#quotedCommandWordAllUpper = true;
    this.#quotedCommandUppercaseCount = 0;
    this.#quotedCommandPreviousLower = false;
    this.#quotedCommandWordLtr = 0;
    this.#quotedCommandPendingShapeSeparator = false;
    this.#quotedCommandStableTechnicalWord = false;
    this.#quotedCommandWasExactTechnicalWord = false;
    this.#quotedCommandPendingPathSeparator = false;
    this.#quotedCommandUrl = false;
    this.#quotedCommandWordText = '';
  }

  #discardTechnicalPolicyStructure(): void {
    this.#removePolicyStructureEvidence();
    this.#resetPolicyStructure();
    this.#refreshPolicyDirection();
  }

  #removePolicyStructureEvidence(): void {
    this.#policyLtr -= this.#policyStructureLtr;
    this.#policyRtl -= this.#policyStructureRtl;
    this.#policyStructureLtr = 0;
    this.#policyStructureRtl = 0;
    this.#policyStructureFirstStrong = 'neutral';
    if (this.#policyLtr + this.#policyCorrectionLtr
      + this.#policyRtl + this.#policyCorrectionRtl === 0) {
      this.#policyFirstStrong = 'neutral';
    }
    this.#refreshPolicyDirection();
  }

  #commitProvisionalPolicyStructure(): void {
    if (this.#policyFirstStrong === 'neutral' && this.#policyStructureFirstStrong !== 'neutral') {
      this.#policyFirstStrong = this.#policyStructureFirstStrong;
    }
    this.#resetPolicyStructure();
    this.#refreshPolicyDirection();
  }

  #resetPolicyToken(): void {
    this.#policyToken = '';
    this.#policyTokenLtr = 0;
    this.#policyTokenRtl = 0;
    this.#policyTokenContributionLtr = 0;
    this.#policyTokenContributionRtl = 0;
    this.#policyTokenFirstStrong = 'neutral';
    this.#policyTokenLettersOnly = true;
    this.#policyTokenHasAsciiLetter = false;
    this.#policyTokenDefaultTrieNode = DEFAULT_TECHNICAL_TRIE;
    this.#policyTokenCustomTrieNode = this.#customTechnicalTrie;
    this.#policyTokenAllUpper = true;
    this.#policyTokenUppercaseCount = 0;
    this.#policyTokenPreviousLower = false;
    this.#policyTokenCamelCase = false;
    this.#policyTokenIdentifierShape = true;
    this.#policyTokenIdentifierTechnical = false;
    this.#policyTokenIdentifierHasShapeMarker = false;
    this.#policyTokenTrailingSeparator = false;
    this.#policyTokenLastWordTechnical = false;
    this.#policyTokenStableTechnical = null;
    this.#policyTokenStableLtr = 0;
    this.#policyTokenStableRtl = 0;
    this.#policyTokenStableFirstStrong = 'neutral';
    this.#policyTokenStablePathIsOpenEnded = false;
  }

  #resetPolicyStructure(): void {
    this.#policyMode = 'plain';
    this.#policyStructureLtr = 0;
    this.#policyStructureRtl = 0;
    this.#policyStructureFirstStrong = 'neutral';
    this.#policyHtmlStage = 0;
    this.#policyHtmlValid = false;
    this.#policyDollarHasContent = false;
    this.#policyDollarEnvironment = 'none';
    this.#policyDollarOverlapEnvironment = false;
    this.#policyClosingRun = 0;
    this.#policyBacktickOpeningRun = 0;
    this.#policyBacktickContentStarted = false;
    this.#policyBacktickEvidenceDiscarded = false;
    this.#policyBacktickRemainder = 0;
    this.#policyPreviousWasSlash = false;
    this.#policyCommandQuote = null;
    this.#resetQuotedCommandWord();
    this.#quotedCommandNestedStarter = false;
    this.#quotedCommandNestedCommand = false;
    this.#quotedCommandNestedArgumentPrefix = '';
    this.#quotedCommandNestedArgumentUrl = false;
    this.#policyCommandInUnquotedArgument = false;
    this.#policyCommandAfterQuotedArgument = false;
    this.#policyCommandArgumentIsFlag = false;
    this.#policyCommandArgumentHasTechnicalSyntax = false;
    this.#policyCommandArgumentPrefix = '';
    this.#policyCommandPreviousWasBackslash = false;
    this.#policyCommandTechnical = false;
    this.#policyCommandStarterLtr = 0;
    this.#policyCommandStarterRtl = 0;
  }
}

export function createBidiStream(options: BidiStreamOptions = {}): BidiStream {
  return new BidiStream(options);
}

/** Naming aligned with Markdown/chat integrations in the public specification. */
export function createBidiMarkdownStream(options: BidiStreamOptions = {}): BidiStream {
  return createBidiStream(options);
}
