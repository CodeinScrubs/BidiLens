import { classifyBidiStrongCharacter, classifyCharacter } from './classify.js';
import { analyzeText, findTechnicalTokenRanges } from './detect.js';
import { scanBidiSecurity } from './security.js';
import { planInlineIsolation } from './segments.js';
import type { BidiInterventionMode } from './intervention.js';
import type {
  BlockAnalysis,
  DetectionOptions,
  DirectionEvidence,
  InlineIsolationKind,
  ResolvedDirection
} from './types.js';

export interface AnalyzeBlockOptions extends DetectionOptions {
  /** `auto` avoids isolation plans for ordinary LTR content; `always` retains explicit plans. */
  intervention?: BidiInterventionMode;
}

function excludesTechnical(options: DetectionOptions): boolean {
  if (options.excludeTechnicalTokens !== undefined) return options.excludeTechnicalTokens;
  const strategy = options.strategy ?? 'content-majority';
  return strategy === 'content-majority' || strategy === 'semantic-dominant' || strategy === 'majority';
}

/** Returns auditable evidence with both UTF-16 and code-point source offsets. */
export function collectDirectionEvidence(text: string, options: DetectionOptions = {}): DirectionEvidence[] {
  const technical = excludesTechnical(options)
    ? findTechnicalTokenRanges(text, options.technicalIdentifiers)
    : [];
  const evidence: DirectionEvidence[] = [];
  let utf16Index = 0;
  let codePointIndex = 0;
  let technicalIndex = 0;
  const strategy = options.strategy ?? 'content-majority';
  const classifier = strategy === 'first-strong' || strategy === 'strict-uax9'
    ? classifyBidiStrongCharacter
    : classifyCharacter;

  for (const character of text) {
    while (technicalIndex < technical.length && utf16Index >= technical[technicalIndex]!.end) technicalIndex += 1;
    const range = technical[technicalIndex];
    const excluded = range !== undefined && utf16Index >= range.start && utf16Index < range.end;
    const direction = excluded ? 'ltr' : classifier(character);
    if (direction !== 'neutral') {
      const previous = evidence.at(-1);
      const reason = excluded ? 'technical-token' : 'natural-language';
      const technicalKind = excluded ? range.kind as Exclude<InlineIsolationKind, 'opposite-direction-run'> : undefined;
      if (previous
        && previous.direction === direction
        && previous.excluded === excluded
        && previous.reason === reason
        && previous.technicalKind === technicalKind
        && previous.sourceRange.utf16.end === utf16Index) {
        previous.text += character;
        previous.sourceRange.utf16.end += character.length;
        previous.sourceRange.codePoint.end += 1;
      } else {
        evidence.push({
          text: character,
          direction,
          excluded,
          reason,
          sourceRange: {
            utf16: { start: utf16Index, end: utf16Index + character.length },
            codePoint: { start: codePointIndex, end: codePointIndex + 1 }
          },
          ...(technicalKind === undefined ? {} : { technicalKind })
        });
      }
    }
    utf16Index += character.length;
    codePointIndex += 1;
  }
  return evidence;
}

export function analyzeBlock(text: string, options: AnalyzeBlockOptions = {}): BlockAnalysis {
  const analysis = analyzeText(text, options);
  const resolved: ResolvedDirection = analysis.direction === 'neutral'
    ? (options.inheritedDirection ?? (options.fallback === 'rtl' ? 'rtl' : 'ltr'))
    : analysis.direction;
  const isolationOptions: {
    excludeTechnicalTokens?: boolean;
    intervention?: BidiInterventionMode;
    technicalIdentifiers?: readonly string[];
  } = {};
  if (options.excludeTechnicalTokens !== undefined) isolationOptions.excludeTechnicalTokens = options.excludeTechnicalTokens;
  if (options.intervention !== undefined) isolationOptions.intervention = options.intervention;
  if (options.technicalIdentifiers !== undefined) {
    isolationOptions.technicalIdentifiers = options.technicalIdentifiers;
  }
  return {
    ...analysis,
    policy: options.strategy ?? 'content-majority',
    evidence: collectDirectionEvidence(text, options),
    isolations: planInlineIsolation(text, resolved, isolationOptions),
    warnings: scanBidiSecurity(text).findings
  };
}
