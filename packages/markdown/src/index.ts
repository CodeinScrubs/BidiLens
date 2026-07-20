import type { Element, ElementContent, Root as HastRoot, Text as HastText } from 'hast';
import type { Content, Root as MdastRoot } from 'mdast';
import type MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token.mjs';
import { detectDirection, planInlineIsolation, type DetectionOptions, type Direction } from '@bidilens/core';
import { visit } from 'unist-util-visit';

export interface MarkdownBidiOptions extends DetectionOptions {
  fallback?: Direction;
  blockClassName?: string;
  codeClassName?: string;
  annotateNeutral?: boolean;
  isolateInline?: boolean;
}

const MDAST_BLOCK_TYPES = new Set([
  'paragraph', 'heading', 'blockquote', 'listItem', 'tableCell', 'definition'
]);

const HAST_BLOCK_TAGS = new Set([
  'p', 'li', 'blockquote', 'dd', 'dt', 'figcaption',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'td', 'th'
]);

const HAST_CODE_TAGS = new Set(['pre', 'code', 'kbd', 'samp', 'var']);

type MdastBidiData = NonNullable<(Content | MdastRoot)['data']> & {
  hProperties?: Record<string, unknown>;
};

type MdastBidiNode = (Content | MdastRoot) & { data?: MdastBidiData };

type MdastMathNode = {
  type: 'math' | 'inlineMath';
  value: string;
  data?: MdastBidiData;
};

type ExtendedMdastBidiNode = MdastBidiNode | MdastMathNode;

function mdastText(node: ExtendedMdastBidiNode): string {
  if (node.type === 'code' || node.type === 'inlineCode' || node.type === 'math' || node.type === 'inlineMath') return '';
  if ('value' in node && typeof node.value === 'string') return node.value;
  if ('children' in node && Array.isArray(node.children)) {
    return node.children.map((child) => mdastText(child as ExtendedMdastBidiNode)).join('');
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
  if (options.inheritedDirection !== undefined) detection.inheritedDirection = options.inheritedDirection;
  if (options.excludeTechnicalTokens !== undefined) detection.excludeTechnicalTokens = options.excludeTechnicalTokens;
  return detectDirection(text, detection);
}

export function remarkBidi(options: MarkdownBidiOptions = {}) {
  const blockClassName = options.blockClassName ?? 'bidilens-block';
  const codeClassName = options.codeClassName ?? 'bidilens-code';

  return (tree: MdastRoot): void => {
    visit(tree, (visitedNode) => {
      const node = visitedNode as ExtendedMdastBidiNode;
      if (node.type === 'math' || node.type === 'inlineMath') {
        node.data ??= {};
        node.data.hProperties ??= {};
        node.data.hProperties.dir = 'ltr';
        node.data.hProperties['data-bidilens-math'] = '';
        appendClassName(node.data.hProperties, codeClassName);
        return;
      }

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
      if (direction !== 'neutral') node.data.hProperties.dir = direction;
      else if (options.annotateNeutral) node.data.hProperties['data-bidilens-direction'] = 'neutral';
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

function isolateHastChildren(element: Element, direction: 'ltr' | 'rtl'): void {
  const children: ElementContent[] = [];
  for (const child of element.children) {
    if (child.type === 'text') {
      const plans = planInlineIsolation(child.value, direction);
      let cursor = 0;
      for (const plan of plans) {
        if (cursor < plan.start) children.push({ type: 'text', value: child.value.slice(cursor, plan.start) });
        children.push({
          type: 'element',
          tagName: 'bdi',
          properties: {
            dir: plan.direction,
            'data-bidilens-isolate': '',
            'data-bidilens-kind': plan.kind
          },
          children: [{ type: 'text', value: plan.text }]
        });
        cursor = plan.end;
      }
      if (plans.length) {
        if (cursor < child.value.length) children.push({ type: 'text', value: child.value.slice(cursor) });
      } else children.push(child);
      continue;
    }
    if (child.type === 'element'
      && !HAST_BLOCK_TAGS.has(child.tagName)
      && !HAST_CODE_TAGS.has(child.tagName)
      && child.tagName !== 'bdi'
      && child.tagName !== 'script'
      && child.tagName !== 'style'
      && child.tagName !== 'textarea') {
      isolateHastChildren(child, direction);
    }
    children.push(child);
  }
  element.children = children;
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
      if (direction !== 'neutral') node.properties.dir = direction;
      else if (options.annotateNeutral) node.properties['data-bidilens-direction'] = 'neutral';
      if ((options.isolateInline ?? true) && direction !== 'neutral') isolateHastChildren(node, direction);
    });
  };
}

const configuredMarkdownIt = new WeakSet<object>();

function markdownItClass(token: Token | undefined, className: string): void {
  if (!token) return;
  if (token.attrJoin) token.attrJoin('class', className);
  else token.attrSet('class', className);
}

function markdownItBlockContent(tokens: Token[], index: number, closeType: string): string {
  const openType = tokens[index]?.type;
  let nested = 0;
  const values: string[] = [];
  for (let cursor = index + 1; cursor < tokens.length; cursor += 1) {
    const token = tokens[cursor];
    if (!token) continue;
    if (token.type === openType) nested += 1;
    if (token.type === closeType) {
      if (nested === 0) break;
      nested -= 1;
      continue;
    }
    if (token.type === 'inline' && token.content) values.push(token.content);
  }
  return values.join(' ');
}

/** Markdown-It adapter with the same content-majority policy as the AST plugins. */
export function markdownItBidi(md: MarkdownIt, options: MarkdownBidiOptions = {}): void {
  if (configuredMarkdownIt.has(md as object)) return;
  configuredMarkdownIt.add(md as object);
  let activeDirection: 'ltr' | 'rtl' | null = null;
  const blockClassName = options.blockClassName ?? 'bidilens-block';
  const codeClassName = options.codeClassName ?? 'bidilens-code';
  const escape = md.utils?.escapeHtml ?? ((value: string) => value.replace(/[&<>"']/gu, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character] ?? character)));
  const original = md.renderer.rules.paragraph_open;
  md.renderer.rules.paragraph_open = (tokens, index, renderOptions, env, self) => {
    const content = tokens[index + 1]?.content ?? '';
    const direction = detectWithOptions(content, options);
    activeDirection = direction === 'neutral' ? null : direction;
    if (direction !== 'neutral') tokens[index]?.attrSet('dir', direction);
    else if (options.annotateNeutral) tokens[index]?.attrSet('data-bidilens-direction', 'neutral');
    tokens[index]?.attrSet('data-bidilens-block', '');
    markdownItClass(tokens[index], blockClassName);
    return original
      ? original(tokens, index, renderOptions, env, self)
      : self.renderToken(tokens, index, renderOptions);
  };

  const originalParagraphClose = md.renderer.rules.paragraph_close;
  md.renderer.rules.paragraph_close = (tokens, index, renderOptions, env, self) => {
    const rendered = originalParagraphClose
      ? originalParagraphClose(tokens, index, renderOptions, env, self)
      : self.renderToken(tokens, index, renderOptions);
    activeDirection = null;
    return rendered;
  };

  const originalHeading = md.renderer.rules.heading_open;
  md.renderer.rules.heading_open = (tokens, index, renderOptions, env, self) => {
    const content = tokens[index + 1]?.content ?? '';
    const direction = detectWithOptions(content, options);
    activeDirection = direction === 'neutral' ? null : direction;
    if (direction !== 'neutral') tokens[index]?.attrSet('dir', direction);
    else if (options.annotateNeutral) tokens[index]?.attrSet('data-bidilens-direction', 'neutral');
    tokens[index]?.attrSet('data-bidilens-block', '');
    markdownItClass(tokens[index], blockClassName);
    return originalHeading
      ? originalHeading(tokens, index, renderOptions, env, self)
      : self.renderToken(tokens, index, renderOptions);
  };

  const originalHeadingClose = md.renderer.rules.heading_close;
  md.renderer.rules.heading_close = (tokens, index, renderOptions, env, self) => {
    const rendered = originalHeadingClose
      ? originalHeadingClose(tokens, index, renderOptions, env, self)
      : self.renderToken(tokens, index, renderOptions);
    activeDirection = null;
    return rendered;
  };

  for (const tag of ['td', 'th']) {
    const openRule = `${tag}_open`;
    const closeRule = `${tag}_close`;
    const originalOpen = md.renderer.rules[openRule];
    md.renderer.rules[openRule] = (tokens, index, renderOptions, env, self) => {
      const content = tokens[index + 1]?.content ?? '';
      const direction = detectWithOptions(content, options);
      activeDirection = direction === 'neutral' ? null : direction;
      if (direction !== 'neutral') tokens[index]?.attrSet('dir', direction);
      else if (options.annotateNeutral) tokens[index]?.attrSet('data-bidilens-direction', 'neutral');
      tokens[index]?.attrSet('data-bidilens-block', '');
      markdownItClass(tokens[index], blockClassName);
      return originalOpen
        ? originalOpen(tokens, index, renderOptions, env, self)
        : self.renderToken(tokens, index, renderOptions);
    };
    const originalClose = md.renderer.rules[closeRule];
    md.renderer.rules[closeRule] = (tokens, index, renderOptions, env, self) => {
      const rendered = originalClose
        ? originalClose(tokens, index, renderOptions, env, self)
        : self.renderToken(tokens, index, renderOptions);
      activeDirection = null;
      return rendered;
    };
  }

  for (const [openRule, closeType] of [
    ['list_item_open', 'list_item_close'],
    ['blockquote_open', 'blockquote_close']
  ] as const) {
    const originalOpen = md.renderer.rules[openRule];
    md.renderer.rules[openRule] = (tokens, index, renderOptions, env, self) => {
      const direction = detectWithOptions(markdownItBlockContent(tokens, index, closeType), options);
      if (direction !== 'neutral') tokens[index]?.attrSet('dir', direction);
      else if (options.annotateNeutral) tokens[index]?.attrSet('data-bidilens-direction', 'neutral');
      tokens[index]?.attrSet('data-bidilens-block', '');
      markdownItClass(tokens[index], blockClassName);
      return originalOpen
        ? originalOpen(tokens, index, renderOptions, env, self)
        : self.renderToken(tokens, index, renderOptions);
    };
  }

  const originalText = md.renderer.rules.text;
  md.renderer.rules.text = (tokens, index, renderOptions, env, self) => {
    const value = tokens[index]?.content ?? '';
    if (!(options.isolateInline ?? true) || activeDirection === null) {
      return originalText ? originalText(tokens, index, renderOptions, env, self) : escape(value);
    }
    const plans = planInlineIsolation(value, activeDirection);
    if (!plans.length) return originalText ? originalText(tokens, index, renderOptions, env, self) : escape(value);
    const renderValue = (part: string): string => {
      if (!originalText) return escape(part);
      const copy = [...tokens];
      copy[index] = { ...tokens[index]!, content: part } as Token;
      return originalText(copy, index, renderOptions, env, self);
    };
    let rendered = '';
    let cursor = 0;
    for (const plan of plans) {
      rendered += renderValue(value.slice(cursor, plan.start));
      rendered += `<bdi dir="${plan.direction}" data-bidilens-isolate="" data-bidilens-kind="${plan.kind}">${renderValue(plan.text)}</bdi>`;
      cursor = plan.end;
    }
    return rendered + renderValue(value.slice(cursor));
  };

  for (const ruleName of ['code_inline', 'code_block', 'fence']) {
    const originalCodeRule = md.renderer.rules[ruleName];
    if (!originalCodeRule) continue;
    md.renderer.rules[ruleName] = (tokens, index, renderOptions, env, self) => {
      tokens[index]?.attrSet('dir', 'ltr');
      tokens[index]?.attrSet('data-bidilens-code', '');
      markdownItClass(tokens[index], codeClassName);
      return originalCodeRule(tokens, index, renderOptions, env, self);
    };
  }
}
