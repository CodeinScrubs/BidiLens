import type { BidiControlFinding, BidiControlRisk } from './types.js';

const CONTROL_METADATA = new Map<number, Omit<BidiControlFinding, 'character' | 'codePoint' | 'index'>>([
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
  [0x2069, { name: 'POP DIRECTIONAL ISOLATE', risk: 'medium', category: 'pop' }]
]);

export function findBidiControls(text: string): BidiControlFinding[] {
  const findings: BidiControlFinding[] = [];
  let utf16Index = 0;

  for (const character of text) {
    const codePoint = character.codePointAt(0)!;
    const metadata = CONTROL_METADATA.get(codePoint);
    if (metadata) {
      findings.push({
        character,
        codePoint: `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`,
        index: utf16Index,
        ...metadata
      });
    }
    utf16Index += character.length;
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

export function sanitizeBidiControls(
  text: string,
  options: { remove?: BidiControlRisk[] } = {}
): { text: string; removed: BidiControlFinding[] } {
  const remove = new Set(options.remove ?? ['high', 'medium', 'low']);
  const removed: BidiControlFinding[] = [];
  let output = '';
  let utf16Index = 0;

  for (const character of text) {
    const codePoint = character.codePointAt(0)!;
    const metadata = CONTROL_METADATA.get(codePoint);
    if (metadata && remove.has(metadata.risk)) {
      removed.push({
        character,
        codePoint: `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`,
        index: utf16Index,
        ...metadata
      });
    } else {
      output += character;
    }
    utf16Index += character.length;
  }

  return { text: output, removed };
}
