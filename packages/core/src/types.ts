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
  | 'majority';

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
  | 'opposite-direction-run';

export interface InlineIsolation {
  text: string;
  direction: ResolvedDirection;
  start: number;
  end: number;
  kind: InlineIsolationKind;
}

export type StreamStrategy = 'content-majority' | 'first-strong' | 'majority' | 'sticky-majority';

export interface BidiStreamOptions {
  strategy?: StreamStrategy;
  fallback?: Direction;
  paragraphSeparator?: RegExp;
  majorityThreshold?: number;
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
  paragraphs: StreamParagraph[];
  currentParagraph: StreamParagraph;
}

export type BidiControlRisk = 'low' | 'medium' | 'high';

export interface BidiControlFinding {
  character: string;
  codePoint: string;
  name: string;
  index: number;
  risk: BidiControlRisk;
  category: 'mark' | 'embedding' | 'override' | 'isolate' | 'pop';
}
