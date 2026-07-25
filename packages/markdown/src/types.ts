import type {
  BidiInterventionMode,
  BidiSecurityFinding,
  BidiSecurityMode,
  BidiSecurityReport,
  BidiStreamSnapshot,
  BlockAnalysis,
  DetectionOptions,
  Direction,
  ResolvedDirection
} from '@bidilens/core';

export interface MarkdownBidiOptions extends DetectionOptions {
  fallback?: Direction;
  blockClassName?: string;
  codeClassName?: string;
  annotateNeutral?: boolean;
  isolateInline?: boolean;
  /** `auto` leaves an LTR-only document's AST and rendered HTML unchanged. */
  intervention?: BidiInterventionMode;
}

export interface BidiMarkdownStreamOptions extends MarkdownBidiOptions {
  /** Security findings are reported without mutating the Markdown source. */
  securityMode?: BidiSecurityMode;
}

export interface MarkdownSourceRange {
  /** Half-open UTF-16 offsets in the complete Markdown source. */
  start: number;
  end: number;
}

export interface MarkdownAstNode {
  type: string;
  tag: string;
  nesting: -1 | 0 | 1;
  level: number;
  content: string;
  markup: string;
  info: string;
  block: boolean;
  hidden: boolean;
  map?: [number, number];
  attributes?: Record<string, string>;
  children?: MarkdownAstNode[];
  /** Present only when the configured intervention policy annotates the document. */
  bidi?: MarkdownBlockAnnotation;
}

export interface MarkdownAstRoot {
  type: 'root';
  children: MarkdownAstNode[];
}

export interface MarkdownBlockAnnotation {
  blockIndex: number;
  direction: ResolvedDirection;
  kind: 'prose' | 'code';
}

export interface BidiMarkdownBlock {
  index: number;
  tokenIndex: number;
  tokenType: string;
  kind: 'prose' | 'code';
  text: string;
  sourceRange: MarkdownSourceRange;
  lineRange?: [number, number];
  direction: ResolvedDirection;
  intervention: boolean;
  analysis: BlockAnalysis;
}

export interface BidiMarkdownDocument {
  source: string;
  ast: MarkdownAstRoot;
  blocks: BidiMarkdownBlock[];
  html: string;
  security: BidiSecurityReport;
}

export interface MarkdownSecurityDelta {
  added: BidiSecurityFinding[];
  removed: BidiSecurityFinding[];
}

export interface MarkdownDirtyRegion extends MarkdownSourceRange {
  reason: 'initial-render' | 'open-markdown' | 'final-reconciliation' | 'reset';
}

export interface BidiMarkdownStreamUpdate {
  /** Complete logical source, including any suffix not parsed at this revision. */
  source: string;
  /** Most recent rich parse. Check `renderedThrough` before treating it as current. */
  document: BidiMarkdownDocument;
  /** Fast per-push state, reconciled to the active Markdown block at rich revisions. */
  direction: BidiStreamSnapshot;
  revision: number;
  parseCount: number;
  changed: boolean;
  finished: boolean;
  renderedThrough: number;
  /** Prefix whose simple completed Markdown blocks cannot be changed by later input. */
  stableThrough: number;
  /** Rich-output replacements produced by this revision. */
  dirtyRegions: MarkdownDirtyRegion[];
  /** Appended source not represented by `document` yet, or `null` when current. */
  pendingSourceRange: MarkdownSourceRange | null;
  changedBlockIndexes: number[];
  securityDelta: MarkdownSecurityDelta;
}

export interface BidiMarkdownStreamSession {
  push(chunk: string): void;
  getUpdate(): BidiMarkdownStreamUpdate;
  finish(): BidiMarkdownStreamUpdate;
  reset(initialText?: string): BidiMarkdownStreamUpdate;
}
