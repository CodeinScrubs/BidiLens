export type Direction = 'ltr' | 'rtl' | 'neutral';
export type ResolvedDirection = Exclude<Direction, 'neutral'>;
/**
 * `content-majority` is the default because a block's base direction belongs
 * to its natural-language prose, not necessarily to its first token. The
 * `semantic-dominant` spelling is retained as an explicit alias for callers
 * that prefer the terminology used in the specification.
 */
export type DetectionStrategy =
  | 'content-majority'
  | 'semantic-dominant'
  | 'first-strong'
  | 'strict-uax9'
  | 'majority'
  | 'inherit'
  | 'ltr'
  | 'rtl';

export interface DetectionOptions {
  strategy?: DetectionStrategy;
  fallback?: Direction;
  inheritedDirection?: ResolvedDirection;
  minimumStrongCharacters?: number;
  majorityThreshold?: number;
  /** Exclude inline technical tokens from natural-language evidence. */
  excludeTechnicalTokens?: boolean;
}

export interface StrongCharacterCounts {
  ltr: number;
  rtl: number;
  total: number;
}

export interface ParagraphAnalysis {
  text: string;
  start: number;
  end: number;
  direction: Direction;
  firstStrong: Direction;
  confidence: number;
  counts: StrongCharacterCounts;
}

export interface TextAnalysis {
  text: string;
  direction: Direction;
  firstStrong: Direction;
  confidence: number;
  counts: StrongCharacterCounts;
  /** Strong natural-language counts before technical-token exclusion. */
  rawCounts: StrongCharacterCounts;
  paragraphs: ParagraphAnalysis[];
  mixed: boolean;
}

export interface DirectionalRun {
  text: string;
  direction: Direction;
  start: number;
  end: number;
}

export type InlineIsolationKind =
  | 'code'
  | 'url'
  | 'email'
  | 'path'
  | 'version'
  | 'hash'
  | 'identifier'
  | 'number'
  | 'command'
  | 'math'
  | 'html'
  | 'opposite-direction-run';

export interface InlineIsolation {
  text: string;
  direction: ResolvedDirection;
  /** Legacy half-open UTF-16 offsets retained for ergonomic JS consumers. */
  start: number;
  end: number;
  /** Language-neutral dual offsets for cross-platform implementations. */
  sourceRange: BidiSourceRange;
  kind: InlineIsolationKind;
}

export type StreamStrategy = 'content-majority' | 'semantic-dominant' | 'first-strong' | 'majority' | 'sticky-majority';

export interface BidiStreamOptions {
  strategy?: StreamStrategy;
  fallback?: Direction;
  /**
   * Paragraph separator used when `finish()` reconciles the complete source.
   * The default newline separator is recognized incrementally. An arbitrary
   * custom RegExp is intentionally finalized only at end-of-stream because
   * lookarounds, anchors, and extendable matches can depend on future chunks.
   */
  paragraphSeparator?: RegExp;
  majorityThreshold?: number;
  /** Evidence required before the default live direction locks. */
  lockAfterStrongCharacters?: number;
  /** Minimum winning character margin required before locking. */
  lockMargin?: number;
}

export interface StreamParagraph {
  text: string;
  direction: Direction;
  completed: boolean;
  index: number;
}

export interface BidiStreamSnapshot {
  text: string;
  direction: Direction;
  changed: boolean;
  locked: boolean;
  finished: boolean;
  paragraphs: StreamParagraph[];
  currentParagraph: StreamParagraph;
}

export type BidiControlRisk = 'low' | 'medium' | 'high';

export interface BidiControlFinding {
  character: string;
  codePoint: string;
  name: string;
  index: number;
  end: number;
  codePointIndex: number;
  risk: BidiControlRisk;
  category: 'mark' | 'embedding' | 'override' | 'isolate' | 'pop' | 'deprecated';
}

export type BidiSecurityMode = 'off' | 'audit' | 'warn' | 'strict';
export type BidiSecuritySeverity = 'info' | 'warning' | 'high';

export interface BidiSourceRange {
  /** Half-open UTF-16 offsets, matching JavaScript String indices. */
  utf16: { start: number; end: number };
  /** Half-open Unicode code-point offsets. */
  codePoint: { start: number; end: number };
}

export interface BidiSecurityFinding {
  code: string;
  severity: BidiSecuritySeverity;
  message: string;
  sourceRange: BidiSourceRange;
  remediation: string;
  control?: BidiControlFinding;
}

export interface BidiSecurityReport {
  mode: BidiSecurityMode;
  safe: boolean;
  shouldBlock: boolean;
  controls: BidiControlFinding[];
  findings: BidiSecurityFinding[];
}

export interface DirectionEvidence {
  text: string;
  direction: ResolvedDirection;
  excluded: boolean;
  reason: 'natural-language' | 'technical-token';
  sourceRange: BidiSourceRange;
  technicalKind?: Exclude<InlineIsolationKind, 'opposite-direction-run'>;
}

export interface BlockAnalysis extends TextAnalysis {
  policy: DetectionStrategy;
  evidence: DirectionEvidence[];
  isolations: InlineIsolation[];
  warnings: BidiSecurityFinding[];
}
