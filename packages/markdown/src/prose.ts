import type { MarkdownItToken } from './types.js';

/** Decoded reader-visible evidence; never use link destinations or HTML syntax. */
export function proseText(token: MarkdownItToken | undefined, includeCode = false): string {
  if (!token) return '';
  if (token.type === 'code_inline' || token.type === 'fence' || token.type === 'code_block'
    || token.type.includes('math')) return includeCode ? token.content : ' ';
  if (token.type === 'html_inline' || token.type === 'html_block') return ' ';
  if (token.children) return token.children.map((child) => proseText(child, includeCode)).join('');
  if (token.type === 'softbreak' || token.type === 'hardbreak') return '\n';
  if (token.type === 'text' || token.type === 'text_special' || token.type === 'image') return token.content;
  return '';
}
