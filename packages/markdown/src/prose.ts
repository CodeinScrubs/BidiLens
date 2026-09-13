import type { MarkdownItToken } from './types.js';

/** Decoded reader-visible evidence; never use link destinations or HTML syntax. */
export function proseText(token: MarkdownItToken | undefined, includeCode = false): string {
  if (!token || token.hidden) return '';
  if (token.type === 'code_inline' || token.type === 'fence' || token.type === 'code_block'
    || token.type.includes('math')) return includeCode ? token.content : ' ';
  if (token.type === 'html_inline' || token.type === 'html_block') return ' ';
  if (token.children && (token.children.length > 0 || token.type === 'inline' || token.type === 'image')) {
    return token.children.map((child) => proseText(child, includeCode)).join('');
  }
  if (token.type === 'softbreak' || token.type === 'hardbreak') return '\n';
  // Inline extensions often rename a text leaf and keep its decoded content.
  // Structural opener/closer metadata must not become prose evidence.
  return token.nesting === 0 ? token.content : '';
}
