/**
 * The default paragraph grammar follows the complete Unicode 17
 * Bidi_Class=Paragraph_Separator set. CRLF is listed before CR and LF so it
 * is consumed as one separator. U+2028 is intentionally absent: Unicode
 * classifies it as a line separator (WS), not a paragraph separator (B).
 */
export const DEFAULT_PARAGRAPH_SEPARATOR_SOURCE =
  '\\r\\n|\\n|\\r|\\u0085|[\\u001C-\\u001E]|\\u2029';

export function isDefaultParagraphBoundaryCharacter(character: string): boolean {
  if (character.length !== 1) return false;
  const codeUnit = character.charCodeAt(0);
  return codeUnit === 0x0a
    || codeUnit === 0x0d
    || codeUnit === 0x85
    || (codeUnit >= 0x1c && codeUnit <= 0x1e)
    || codeUnit === 0x2029;
}
