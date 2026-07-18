import type { Element, Root as HastRoot, Text as HastText } from 'hast';
import type { Content, Root as MdastRoot } from 'mdast';
import { detectDirection, type DetectionOptions, type Direction } from '@bidilens/core';
import { visit } from 'unist-util-visit';

export interface MarkdownBidiOptions extends DetectionOptions {
  fallback?: Direction;
  blockClassName?: string;
  codeClassName?: string;
  annotateNeutral?: boolean;
}

const MDAST_BLOCK_TYPES = new Set([
  'paragraph', 'heading', 'blockquote', 'listItem', 'tableCell', 'definition'
]);

const HAST_BLOCK_TAGS = new Set([
  'p', 'li', 'blockquote', 'dd', 'dt', 'figcaption',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'td', 'th'
]);

const HAST_CODE_TAGS = new Set(['pre', 'code', 'kbd', 'samp', 'var']);

function mdastText(node: Content | MdastRoot): string {
  if ('value' in node && typeof node.value === 'string') return node.value;
  if ('children' in node && Array.isArray(node.children)) {
    return node.children.map((child) => mdastText(child as Content)).join('');
  }
  if (node.type === 'image') return node.alt ?? '';
  return '';
}

function appendClassName(properties: Record<string, unknown>, className: string): void {
  const current = properties.className;
  if (Array.isArray(current)) {
    if (!current.includes(className)) current.push(className);
  } else if (typeof current === 'string') {
    properties.className = current.split(/\s+/).includes(className) ? current : `${current} ${className}`;
  } else {
    properties.className = [className];
  }
}

function detectWithOptions(text: string, options: MarkdownBidiOptions): Direction {
  const detection: DetectionOptions = {
    strategy: options.strategy ?? 'content-majority',
    fallback: options.fallback ?? 'ltr'
  };
  if (options.minimumStrongCharacters !== undefined) detection.minimumStrongCharacters = options.minimumStrongCharacters;
  if (options.majorityThreshold !== undefined) detection.majorityThreshold = options.majorityThreshold;
  return detectDirection(text, detection);
}

export function remarkBidi(options: MarkdownBidiOptions = {}) {
  const blockClassName = options.blockClassName ?? 'bidilens-block';
  const codeClassName = options.codeClassName ?? 'bidilens-code';

  return (tree: MdastRoot): void => {
    visit(tree, (node: any) => {
      if (node.type === 'code') {
        node.data ??= {};
        node.data.hProperties ??= {};
        node.data.hProperties.dir = 'ltr';
        node.data.hProperties['data-bidilens-code'] = '';
        appendClassName(node.data.hProperties, codeClassName);
        return;
      }

      if (node.type === 'inlineCode') {
        node.data ??= {};
        node.data.hName = 'bdi';
        node.data.hProperties ??= {};
        node.data.hProperties.dir = 'ltr';
        node.data.hProperties['data-bidilens-code'] = '';
        appendClassName(node.data.hProperties, codeClassName);
        return;
      }

      if (!MDAST_BLOCK_TYPES.has(node.type)) return;
      const direction = detectWithOptions(mdastText(node), options);
      node.data ??= {};
      node.data.hProperties ??= {};
      node.data.hProperties['data-bidilens-block'] = '';
      appendClassName(node.data.hProperties, blockClassName);
      if (direction !== 'neutral' || options.annotateNeutral) node.data.hProperties.dir = direction;
    });
  };
}

function hastText(node: Element | HastText): string {
  if (node.type === 'text') return node.value;
  return node.children.map((child) => {
    if (child.type === 'text') return child.value;
    if (child.type === 'element') return HAST_CODE_TAGS.has(child.tagName) ? '' : hastText(child);
    return '';
  }).join('');
}

export function rehypeBidi(options: MarkdownBidiOptions = {}) {
  const blockClassName = options.blockClassName ?? 'bidilens-block';
  const codeClassName = options.codeClassName ?? 'bidilens-code';

  return (tree: HastRoot): void => {
    visit(tree, 'element', (node: Element) => {
      node.properties ??= {};

      if (HAST_CODE_TAGS.has(node.tagName)) {
        node.properties.dir = 'ltr';
        node.properties['data-bidilens-code'] = '';
        appendClassName(node.properties, codeClassName);
        return;
      }

      if (!HAST_BLOCK_TAGS.has(node.tagName)) return;
      const direction = detectWithOptions(hastText(node), options);
      node.properties['data-bidilens-block'] = '';
      appendClassName(node.properties, blockClassName);
      if (direction !== 'neutral' || options.annotateNeutral) node.properties.dir = direction;
    });
  };
}
