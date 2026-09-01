import type {
  BidiControlFinding,
  BidiControlRisk,
  BidiControlSanitizationGroup,
  BidiSecurityFinding,
  BidiSecurityMode,
  BidiSecurityReport,
  BidiSecuritySeverity
} from './types.js';

const UAX9_PARAGRAPH_SEPARATOR = new RegExp(
  `\\r\\n|\\n|\\r|\\u0085|[${String.fromCodePoint(0x1c)}-${String.fromCodePoint(0x1e)}]|\\u2029`,
  'gu'
);

const CONTROL_METADATA = new Map<number, Omit<BidiControlFinding, 'character' | 'codePoint' | 'index' | 'end' | 'codePointIndex'>>([
  [0x061c, { name: 'ARABIC LETTER MARK', risk: 'low', category: 'mark' }],
  [0x200e, { name: 'LEFT-TO-RIGHT MARK', risk: 'low', category: 'mark' }],
  [0x200f, { name: 'RIGHT-TO-LEFT MARK', risk: 'low', category: 'mark' }],
  [0x202a, { name: 'LEFT-TO-RIGHT EMBEDDING', risk: 'high', category: 'embedding' }],
  [0x202b, { name: 'RIGHT-TO-LEFT EMBEDDING', risk: 'high', category: 'embedding' }],
  [0x202c, { name: 'POP DIRECTIONAL FORMATTING', risk: 'medium', category: 'pop' }],
  [0x202d, { name: 'LEFT-TO-RIGHT OVERRIDE', risk: 'high', category: 'override' }],
  [0x202e, { name: 'RIGHT-TO-LEFT OVERRIDE', risk: 'high', category: 'override' }],
  [0x2066, { name: 'LEFT-TO-RIGHT ISOLATE', risk: 'medium', category: 'isolate' }],
  [0x2067, { name: 'RIGHT-TO-LEFT ISOLATE', risk: 'medium', category: 'isolate' }],
  [0x2068, { name: 'FIRST STRONG ISOLATE', risk: 'medium', category: 'isolate' }],
  [0x2069, { name: 'POP DIRECTIONAL ISOLATE', risk: 'medium', category: 'pop' }],
  [0x206a, { name: 'INHIBIT SYMMETRIC SWAPPING', risk: 'medium', category: 'deprecated' }],
  [0x206b, { name: 'ACTIVATE SYMMETRIC SWAPPING', risk: 'medium', category: 'deprecated' }],
  [0x206c, { name: 'INHIBIT ARABIC FORM SHAPING', risk: 'medium', category: 'deprecated' }],
  [0x206d, { name: 'ACTIVATE ARABIC FORM SHAPING', risk: 'medium', category: 'deprecated' }],
  [0x206e, { name: 'NATIONAL DIGIT SHAPES', risk: 'medium', category: 'deprecated' }],
  [0x206f, { name: 'NOMINAL DIGIT SHAPES', risk: 'medium', category: 'deprecated' }]
]);

const REMEDIATION = 'Remove the control unless a documented plain-text protocol requires it; prefer semantic markup and isolation.';

function severityForRisk(risk: BidiControlRisk): BidiSecuritySeverity {
  if (risk === 'high') return 'high';
  if (risk === 'medium') return 'warning';
  return 'info';
}

function rangeFor(control: BidiControlFinding): BidiSecurityFinding['sourceRange'] {
  return {
    utf16: { start: control.index, end: control.end },
    codePoint: { start: control.codePointIndex, end: control.codePointIndex + 1 }
  };
}

function codeForControl(control: BidiControlFinding): string {
  if (control.category === 'override') return 'BIDI_OVERRIDE_CONTROL';
  if (control.category === 'embedding') return 'BIDI_EMBEDDING_CONTROL';
  if (control.category === 'isolate') return 'BIDI_ISOLATE_CONTROL';
  if (control.category === 'mark') return 'BIDI_DIRECTIONAL_MARK';
  if (control.category === 'deprecated') return 'BIDI_DEPRECATED_CONTROL';
  return 'BIDI_POP_CONTROL';
}

function controlFinding(control: BidiControlFinding): BidiSecurityFinding {
  return {
    code: codeForControl(control),
    severity: severityForRisk(control.risk),
    message: `${control.name} (${control.codePoint}) is invisible and changes bidirectional interpretation.`,
    sourceRange: rangeFor(control),
    remediation: REMEDIATION,
    control
  };
}

export function findBidiControls(text: string): BidiControlFinding[] {
  const findings: BidiControlFinding[] = [];
  let utf16Index = 0;
  let codePointIndex = 0;

  for (const character of text) {
    const codePoint = character.codePointAt(0)!;
    const metadata = CONTROL_METADATA.get(codePoint);
    if (metadata) {
      findings.push({
        character,
        codePoint: `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`,
        index: utf16Index,
        end: utf16Index + character.length,
        codePointIndex,
        ...metadata
      });
    }
    utf16Index += character.length;
    codePointIndex += 1;
  }
  return findings;
}

export function visibleBidiControls(text: string): string {
  const namesByCodePoint = new Map([...CONTROL_METADATA].map(([codePoint, metadata]) => [codePoint, metadata.name]));
  let result = '';
  for (const character of text) {
    const codePoint = character.codePointAt(0)!;
    const name = namesByCodePoint.get(codePoint);
    result += name ? `⟦${name}⟧` : character;
  }
  return result;
}

export function highestControlRisk(findings: readonly BidiControlFinding[]): BidiControlRisk | null {
  if (findings.some((finding) => finding.risk === 'high')) return 'high';
  if (findings.some((finding) => finding.risk === 'medium')) return 'medium';
  if (findings.some((finding) => finding.risk === 'low')) return 'low';
  return null;
}

interface FormattingFrame {
  kind: 'embedding' | 'isolate';
  control: BidiControlFinding;
}

function lastFrameIndex(stack: readonly FormattingFrame[], kind: FormattingFrame['kind']): number {
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    if (stack[index]?.kind === kind) return index;
  }
  return -1;
}

function balanceParagraph(
  controls: readonly BidiControlFinding[],
  boundary: 'paragraph' | 'text'
): BidiSecurityFinding[] {
  const findings: BidiSecurityFinding[] = [];
  const stack: FormattingFrame[] = [];

  for (const control of controls) {
    const codePoint = control.codePoint;
    if (codePoint === 'U+202A' || codePoint === 'U+202B' || codePoint === 'U+202D' || codePoint === 'U+202E') {
      stack.push({ kind: 'embedding', control });
      continue;
    }
    if (codePoint === 'U+2066' || codePoint === 'U+2067' || codePoint === 'U+2068') {
      stack.push({ kind: 'isolate', control });
      continue;
    }
    if (codePoint === 'U+202C') {
      const isolateIndex = lastFrameIndex(stack, 'isolate');
      const embeddingIndex = lastFrameIndex(stack, 'embedding');
      if (embeddingIndex <= isolateIndex) {
        findings.push({
          code: 'BIDI_UNMATCHED_PDF',
          severity: 'high',
          message: 'POP DIRECTIONAL FORMATTING has no matching active embedding or override.',
          sourceRange: rangeFor(control),
          remediation: 'Remove the unmatched PDF or add the intended opener within the same isolate.',
          control
        });
      } else {
        stack.splice(embeddingIndex, 1);
      }
      continue;
    }
    if (codePoint === 'U+2069') {
      const isolateIndex = lastFrameIndex(stack, 'isolate');
      if (isolateIndex < 0) {
        findings.push({
          code: 'BIDI_UNMATCHED_PDI',
          severity: 'high',
          message: 'POP DIRECTIONAL ISOLATE has no matching isolate opener.',
          sourceRange: rangeFor(control),
          remediation: 'Remove the unmatched PDI or add the intended LRI, RLI, or FSI opener.',
          control
        });
      } else {
        const crossing = stack.slice(isolateIndex + 1).filter((frame) => frame.kind === 'embedding');
        for (const frame of crossing) {
          findings.push({
            code: 'BIDI_FORMAT_CROSSES_ISOLATE_BOUNDARY',
            severity: 'high',
            message: `${frame.control.name} is not closed before the containing isolate ends.`,
            sourceRange: rangeFor(frame.control),
            remediation: 'Close the embedding or override with PDF before PDI.',
            control: frame.control
          });
        }
        stack.splice(isolateIndex);
      }
    }
  }

  for (const frame of stack) {
    findings.push({
      code: frame.kind === 'isolate' ? 'BIDI_UNCLOSED_ISOLATE' : 'BIDI_UNCLOSED_EMBEDDING',
      severity: 'high',
      message: `${frame.control.name} is not terminated before ${boundary === 'paragraph' ? 'the paragraph boundary' : 'the end of the text'}.`,
      sourceRange: rangeFor(frame.control),
      remediation: frame.kind === 'isolate'
        ? 'Add the matching PDI or remove the isolate opener.'
        : 'Add the matching PDF or remove the embedding/override opener.',
      control: frame.control
    });
  }
  return findings;
}

/**
 * Bidi formatting state is paragraph-scoped under UAX #9. A PDF/PDI after a
 * line or paragraph separator must not close an opener from the preceding
 * paragraph, so balance each paragraph independently.
 */
function balanceFindings(text: string, controls: readonly BidiControlFinding[]): BidiSecurityFinding[] {
  const findings: BidiSecurityFinding[] = [];
  // UAX #9 paragraph separators are CR, LF, NEL, U+001C..U+001E, and
  // U+2029. Keep the security scope aligned with the pinned Unicode data.
  let controlIndex = 0;

  for (const match of text.matchAll(UAX9_PARAGRAPH_SEPARATOR)) {
    const paragraphControls: BidiControlFinding[] = [];
    while (controlIndex < controls.length && controls[controlIndex]!.index < match.index) {
      paragraphControls.push(controls[controlIndex]!);
      controlIndex += 1;
    }
    findings.push(...balanceParagraph(paragraphControls, 'paragraph'));
  }

  findings.push(...balanceParagraph(controls.slice(controlIndex), 'text'));
  return findings;
}

function isAsciiIdentifierCharacter(value: string | undefined): boolean {
  return value !== undefined && /^[A-Za-z0-9_$]$/u.test(value);
}

function invisibleCharacterFindings(text: string): BidiSecurityFinding[] {
  const findings: BidiSecurityFinding[] = [];
  const characters = [...text];
  let utf16Index = 0;
  for (let codePointIndex = 0; codePointIndex < characters.length; codePointIndex += 1) {
    const character = characters[codePointIndex]!;
    const sourceRange = {
      utf16: { start: utf16Index, end: utf16Index + character.length },
      codePoint: { start: codePointIndex, end: codePointIndex + 1 }
    };
    if (character === '\u200B') {
      findings.push({
        code: 'HIDDEN_ZERO_WIDTH_SPACE',
        severity: 'warning',
        message: 'ZERO WIDTH SPACE (U+200B) is hidden and can disguise identifiers, links, or filenames.',
        sourceRange,
        remediation: 'Remove it from identifiers and source-like content unless its use is explicitly required.'
      });
    }
    if ((character === '\u200C' || character === '\u200D')
      && isAsciiIdentifierCharacter(characters[codePointIndex - 1])
      && isAsciiIdentifierCharacter(characters[codePointIndex + 1])) {
      const name = character === '\u200C' ? 'ZERO WIDTH NON-JOINER' : 'ZERO WIDTH JOINER';
      findings.push({
        code: 'HIDDEN_IDENTIFIER_JOINER',
        severity: 'warning',
        message: `${name} is hidden inside an ASCII identifier-like token.`,
        sourceRange,
        remediation: 'Remove the joiner from machine identifiers, or document and validate the identifier protocol that requires it.'
      });
    }
    if (character === '\u2060') {
      findings.push({
        code: 'HIDDEN_WORD_JOINER',
        severity: 'info',
        message: 'WORD JOINER (U+2060) is invisible and can disguise token boundaries.',
        sourceRange,
        remediation: 'Confirm that non-breaking behavior is required; remove it from identifiers and source-like content.'
      });
    }
    // A leading U+FEFF can represent a decoded byte-order signature. The same
    // character midstream is invisible content and deserves an explicit finding.
    if (character === '\uFEFF' && codePointIndex > 0) {
      findings.push({
        code: 'HIDDEN_MIDSTREAM_BOM',
        severity: 'warning',
        message: 'ZERO WIDTH NO-BREAK SPACE/BOM (U+FEFF) appears inside the text.',
        sourceRange,
        remediation: 'Remove the midstream BOM unless a documented protocol explicitly requires it.'
      });
    }
    utf16Index += character.length;
  }
  return findings;
}

/** Audits hidden bidi formatting without mutating the source string. */
export function scanBidiSecurity(
  text: string,
  options: { mode?: BidiSecurityMode } = {}
): BidiSecurityReport {
  const mode = options.mode ?? 'audit';
  if (mode === 'off') return { mode, safe: true, shouldBlock: false, controls: [], findings: [] };
  const controls = findBidiControls(text);
  const findings = [
    ...controls.map(controlFinding),
    ...balanceFindings(text, controls),
    ...invisibleCharacterFindings(text)
  ].sort((a, b) => a.sourceRange.utf16.start - b.sourceRange.utf16.start || a.code.localeCompare(b.code));
  const hasHigh = findings.some((finding) => finding.severity === 'high');
  return {
    mode,
    safe: !hasHigh,
    shouldBlock: mode === 'strict' ? findings.length > 0 : mode === 'warn' && hasHigh,
    controls,
    findings
  };
}

export interface SanitizeBidiControlsOptions {
  /** Remove controls with these risk levels. Defaults to every level. */
  remove?: BidiControlRisk[];
  /**
   * Remove only these semantic control groups. PDF follows embedding/override;
   * PDI follows isolate, so preserved isolate pairs stay structurally intact.
   */
  removeGroups?: BidiControlSanitizationGroup[];
}

const ALL_SANITIZATION_GROUPS: readonly BidiControlSanitizationGroup[] = [
  'mark', 'embedding-override', 'isolate', 'deprecated'
];

const SANITIZATION_GROUP_RISK: Readonly<Record<BidiControlSanitizationGroup, BidiControlRisk>> = {
  mark: 'low',
  'embedding-override': 'high',
  isolate: 'medium',
  deprecated: 'medium'
};

function sanitizationGroup(codePoint: number, category: BidiControlFinding['category']): BidiControlSanitizationGroup {
  if (codePoint === 0x202c || category === 'embedding' || category === 'override') {
    return 'embedding-override';
  }
  if (codePoint === 0x2069 || category === 'isolate') return 'isolate';
  if (category === 'mark' || category === 'deprecated') return category;
  // Every recognized pop is handled above; keep an explicit defensive
  // fallback so future metadata cannot silently escape the default sanitizer.
  return 'deprecated';
}

export function sanitizeBidiControls(
  text: string,
  options: SanitizeBidiControlsOptions = {}
): { text: string; removed: BidiControlFinding[] } {
  const remove = new Set(options.remove ?? ['high', 'medium', 'low']);
  const removeGroups = new Set(options.removeGroups ?? ALL_SANITIZATION_GROUPS);
  const grouped = options.removeGroups !== undefined;
  const removed: BidiControlFinding[] = [];
  let output = '';
  let utf16Index = 0;
  let codePointIndex = 0;

  for (const character of text) {
    const codePoint = character.codePointAt(0)!;
    const metadata = CONTROL_METADATA.get(codePoint);
    const group = metadata && sanitizationGroup(codePoint, metadata.category);
    const selected = metadata && group && removeGroups.has(group)
      && remove.has(grouped ? SANITIZATION_GROUP_RISK[group] : metadata.risk);
    if (metadata && selected) {
      removed.push({
        character,
        codePoint: `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`,
        index: utf16Index,
        end: utf16Index + character.length,
        codePointIndex,
        ...metadata
      });
    } else {
      output += character;
    }
    utf16Index += character.length;
    codePointIndex += 1;
  }

  return { text: output, removed };
}
