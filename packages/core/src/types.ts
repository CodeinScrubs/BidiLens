export type Direction = 'ltr' | 'rtl' | 'neutral';
export type ResolvedDirection = Exclude<Direction, 'neutral'>;
export type DetectionStrategy = 'first-strong' | 'majority';

export interface DetectionOptions {
  strategy?: DetectionStrategy;
  fallback?: Direction;
  minimumStrongCharacters?: number;
  majorityThreshold?: number;
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

export type StreamStrategy = 'first-strong' | 'majority' | 'sticky-majority';

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
