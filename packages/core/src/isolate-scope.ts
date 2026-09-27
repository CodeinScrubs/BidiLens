import { isDefaultParagraphBoundaryCharacter } from './paragraph.js';

/** UAX #9 P2: skip isolate contents through matching PDI or paragraph end. */
export function isolateScope(): (character: string) => boolean {
  let depth = 0;
  return (character) => {
    if (isDefaultParagraphBoundaryCharacter(character)) { depth = 0; return true; }
    if (character === '\u2066' || character === '\u2067' || character === '\u2068') { depth += 1; return false; }
    if (character === '\u2069') { depth = Math.max(0, depth - 1); return false; }
    return depth === 0;
  };
}
