import type { Element, ElementContent, Root as HastRoot, Text as HastText } from 'hast';
import type { Content, Root as MdastRoot } from 'mdast';
import {
  detectDirection,
  needsBidiIntervention,
  type BidiInterventionMode,
  type DetectionOptions,
  type Direction
} from '@bidilens/core';
import { visit } from 'unist-util-visit';
import { proseText } from './prose.js';
import { isolateForest, type InlineNode } from './inline-forest.js';
import {
  BidiMarkdownStream,
  analyzeConfiguredBidiMarkdown
} from './stream.js';
import type {
  BidiMarkdownDocument,
  BidiMarkdownStreamSession,
  BidiMarkdownStreamOptions,
  MarkdownBidiOptions,
  MarkdownItRuntime,
  MarkdownItToken,
  MarkdownItCompatible
} from './types.js';

export type {
  BidiMarkdownBlock,
  BidiMarkdownDocument,
  BidiMarkdownStreamSession,
  BidiMarkdownStreamOptions,
  BidiMarkdownStreamUpdate,
  MarkdownAstNode,
  MarkdownAstRoot,
  MarkdownBidiOptions,
  MarkdownBlockAnnotation,
  MarkdownDirtyRegion,
  MarkdownItCompatible,
  MarkdownSecurityDelta,
  MarkdownSourceRange
} from './types.js';

function internalMarkdownIt(markdownIt: MarkdownItCompatible): MarkdownItRuntime {
  return markdownIt as unknown as MarkdownItRuntime;
}

const MDAST_BLOCK_TYPES = new Set([
  'paragraph', 'heading', 'blockquote', 'listItem', 'tableCell', 'definition'
]);

const HAST_BLOCK_TAGS = new Set([
  'p', 'li', 'blockquote', 'dd', 'dt', 'figcaption',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'td', 'th'
]);

const HAST_CODE_TAGS = new Set(['pre', 'code', 'kbd', 'samp', 'var']);

// Require a non-whitespace value so whitespace cannot backtrack around the
// normal-value exclusion. Unknown authored values remain conservative barriers.
const AUTHORED_BIDI_STYLE = /(?:^|;)\s*unicode-bidi\s*:\s*(?!normal\b)\S/iu;

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
  if (node.type === 'code' || node.type === 'inlineCode' || node.type === 'math' || node.type === 'inlineMath' || node.type === 'html') return '';
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
    fallback: options.fallback ?? options.inheritedDirection ?? 'ltr'
  };
  if (options.minimumStrongCharacters !== undefined) detection.minimumStrongCharacters = options.minimumStrongCharacters;
  if (options.majorityThreshold !== undefined) detection.majorityThreshold = options.majorityThreshold;
  if (options.inheritedDirection !== undefined) detection.inheritedDirection = options.inheritedDirection;
  if (options.excludeTechnicalTokens !== undefined) detection.excludeTechnicalTokens = options.excludeTechnicalTokens;
  if (options.technicalIdentifiers !== undefined) detection.technicalIdentifiers = options.technicalIdentifiers;
  return detectDirection(text, detection);
}

function shouldIntervene(text: string, options: MarkdownBidiOptions): boolean {
  return options.annotateNeutral === true
    || detectWithOptions(text, options) === 'rtl'
    || needsBidiIntervention(text, {
      intervention: options.intervention,
      inheritedDirection: options.inheritedDirection
    });
}

export function remarkBidi(options: MarkdownBidiOptions = {}) {
  const blockClassName = options.blockClassName ?? 'bidilens-block';
  const codeClassName = options.codeClassName ?? 'bidilens-code';

  return (tree: MdastRoot): void => {
    let documentNeedsIntervention = false;
    visit(tree, (visitedNode) => {
      const node = visitedNode as ExtendedMdastBidiNode;
      if (MDAST_BLOCK_TYPES.has(node.type) && shouldIntervene(mdastText(node), options)) {
        documentNeedsIntervention = true;
      } else if ((node.type === 'code' || node.type === 'inlineCode'
        || node.type === 'math' || node.type === 'inlineMath')
        && 'value' in node
        && shouldIntervene(node.value, options)) {
        documentNeedsIntervention = true;
      }
    });
    if (!documentNeedsIntervention) return;
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

function hastText(node: Element | HastText | HastRoot): string {
  if (node.type === 'text') return node.value;
  return node.children.map((child) => {
    if (child.type === 'text') return child.value;
    if (child.type === 'element') return HAST_CODE_TAGS.has(child.tagName) ? '' : hastText(child);
    return '';
  }).join('');
}

function isolateHastChildren(
  element: Element,
  direction: 'ltr' | 'rtl',
  intervention: BidiInterventionMode | undefined,
  technicalIdentifiers: readonly string[] | undefined
): void {
  const project = (node: ElementContent): InlineNode<ElementContent> => {
    if (node.type === 'text') return { value: node, text: node.value };
    if (node.type !== 'element' || HAST_BLOCK_TAGS.has(node.tagName) || HAST_CODE_TAGS.has(node.tagName)
      || ['bdi', 'br', 'script', 'style', 'textarea'].includes(node.tagName)
      || node.properties.dir !== undefined || node.properties['data-bidilens-isolate'] !== undefined
      || AUTHORED_BIDI_STYLE.test(String(node.properties.style ?? ''))) return { value: node, opaque: true };
    return { value: node, children: node.children.map(project) };
  };
  const materialize = (node: InlineNode<ElementContent>): ElementContent => {
    if (node.isolation) return { type: 'element', tagName: 'bdi', properties: {
      dir: node.isolation.direction, 'data-bidilens-isolate': '', 'data-bidilens-kind': node.isolation.kind
    }, children: node.children!.map(materialize) };
    const original = node.value!;
    if (original.type === 'text') return node.text === original.value ? original : { ...original, value: node.text! };
    if (original.type === 'element' && node.children) original.children = node.children.map(materialize);
    return original;
  };
  element.children = isolateForest(element.children.map(project), direction, { intervention, technicalIdentifiers }).map(materialize);
}

export function rehypeBidi(options: MarkdownBidiOptions = {}) {
  const blockClassName = options.blockClassName ?? 'bidilens-block';
  const codeClassName = options.codeClassName ?? 'bidilens-code';

  return (tree: HastRoot): void => {
    let documentNeedsIntervention = false;
    visit(tree, 'element', (node: Element) => {
      if (HAST_BLOCK_TAGS.has(node.tagName) && shouldIntervene(hastText(node), options)) {
        documentNeedsIntervention = true;
      } else if (HAST_CODE_TAGS.has(node.tagName) && shouldIntervene(hastText(node), options)) {
        documentNeedsIntervention = true;
      }
    });
    if (!documentNeedsIntervention) return;
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
      if ((options.isolateInline ?? true) && direction !== 'neutral') {
        isolateHastChildren(node, direction, options.intervention, options.technicalIdentifiers);
      }
    });
  };
}

const configuredMarkdownIt = new WeakMap<object, string>();

function assertFiniteMarkdownOption(name: string, value: number | undefined): number | undefined {
  if (value !== undefined && !Number.isFinite(value)) {
    throw new RangeError(`${name} must be a finite number.`);
  }
  return value;
}

function markdownItConfigurationKey(options: MarkdownBidiOptions): string {
  const strategy = options.strategy ?? 'content-majority';
  const majorityStrategy = strategy === 'content-majority'
    || strategy === 'semantic-dominant'
    || strategy === 'majority';
  return JSON.stringify({
    strategy,
    fallback: options.fallback ?? options.inheritedDirection ?? 'ltr',
    inheritedDirection: options.inheritedDirection ?? 'ltr',
    minimumStrongCharacters: Math.max(1, assertFiniteMarkdownOption('minimumStrongCharacters', options.minimumStrongCharacters) ?? 1),
    majorityThreshold: Math.min(1, Math.max(0.5, assertFiniteMarkdownOption('majorityThreshold', options.majorityThreshold) ?? 0.5)),
    excludeTechnicalTokens: options.excludeTechnicalTokens ?? majorityStrategy,
    technicalIdentifiers: options.technicalIdentifiers ?? [],
    blockClassName: options.blockClassName ?? 'bidilens-block',
    codeClassName: options.codeClassName ?? 'bidilens-code',
    annotateNeutral: options.annotateNeutral ?? false,
    isolateInline: options.isolateInline ?? true,
    intervention: options.intervention ?? 'auto'
  });
}

function markdownItClass(token: MarkdownItToken | undefined, className: string): void {
  if (!token) return;
  if (token.attrJoin) token.attrJoin('class', className);
  else token.attrSet('class', className);
}

function markdownItBlockContent(tokens: MarkdownItToken[], index: number, closeType: string): string {
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
    if (token.type === 'inline') values.push(proseText(token));
  }
  return values.join(' ');
}

/** Markdown-It adapter with the same content-majority policy as the AST plugins. */
export function markdownItBidi(markdownIt: MarkdownItCompatible, inputOptions: MarkdownBidiOptions = {}): void {
  const md = internalMarkdownIt(markdownIt);
  const options: MarkdownBidiOptions = {
    ...inputOptions,
    ...(inputOptions.technicalIdentifiers
      ? { technicalIdentifiers: Object.freeze([...inputOptions.technicalIdentifiers]) }
      : {})
  };
  const configurationKey = markdownItConfigurationKey(options);
  const previousConfiguration = configuredMarkdownIt.get(md as object);
  if (previousConfiguration !== undefined) {
    if (previousConfiguration !== configurationKey) {
      throw new Error('This Markdown-It instance is already configured with different BidiLens options.');
    }
    return;
  }
  configuredMarkdownIt.set(md as object, configurationKey);
  let activeDirection: 'ltr' | 'rtl' | null = null;
  const blockClassName = options.blockClassName ?? 'bidilens-block';
  const codeClassName = options.codeClassName ?? 'bidilens-code';
  const interventionCache = new WeakMap<MarkdownItToken[], boolean>();
  const tokensNeedIntervention = (tokens: MarkdownItToken[]): boolean => {
    const cached = interventionCache.get(tokens);
    if (cached !== undefined) return cached;
    const required = tokens.some((token) => (token.type === 'inline'
      || token.type === 'code_inline'
      || token.type === 'code_block'
      || token.type === 'fence') && shouldIntervene(proseText(token, true), options));
    interventionCache.set(tokens, required);
    return required;
  };
  const original = md.renderer.rules.paragraph_open;
  md.renderer.rules.paragraph_open = (tokens, index, renderOptions, env, self) => {
    if (!tokensNeedIntervention(tokens)) {
      activeDirection = null;
      return original
        ? original(tokens, index, renderOptions, env, self)
        : self.renderToken(tokens, index, renderOptions);
    }
    const content = proseText(tokens[index + 1]);
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
    if (!tokensNeedIntervention(tokens)) {
      activeDirection = null;
      return originalHeading
        ? originalHeading(tokens, index, renderOptions, env, self)
        : self.renderToken(tokens, index, renderOptions);
    }
    const content = proseText(tokens[index + 1]);
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
      if (!tokensNeedIntervention(tokens)) {
        activeDirection = null;
        return originalOpen
          ? originalOpen(tokens, index, renderOptions, env, self)
          : self.renderToken(tokens, index, renderOptions);
      }
      const content = proseText(tokens[index + 1]);
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
      if (!tokensNeedIntervention(tokens)) {
        return originalOpen
          ? originalOpen(tokens, index, renderOptions, env, self)
          : self.renderToken(tokens, index, renderOptions);
      }
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

  const originalInline = md.renderer.renderInline;
  md.renderer.renderInline = function (tokens, renderOptions, env) {
    if (!(options.isolateInline ?? true) || activeDirection === null) return originalInline.call(this, tokens, renderOptions, env);
    type TokenValue = { open: MarkdownItToken; close?: MarkdownItToken };
    const root: InlineNode<TokenValue> = { children: [] };
    const stack = [root];
    for (const token of tokens) {
      if (token.nesting === -1) {
        const current = stack.pop();
        if (!current?.value || stack.length === 0) return originalInline.call(this, tokens, renderOptions, env);
        current.value.close = token;
      } else {
        const node: InlineNode<TokenValue> = { value: { open: token } };
        if (token.nesting === 1) {
          node.children = [];
          node.opaque = !['strong_open', 'em_open', 's_open', 'link_open'].includes(token.type)
            || token.attrs?.some(([name, value]) => {
              const attribute = name.toLowerCase();
              return attribute === 'dir' || attribute === 'data-bidilens-isolate'
                || (attribute === 'style' && AUTHORED_BIDI_STYLE.test(String(value)));
            }) === true;
          stack.at(-1)!.children!.push(node);
          stack.push(node);
        } else {
          if (token.type === 'text' && !token.hidden) node.text = token.content;
          else node.opaque = true;
          stack.at(-1)!.children!.push(node);
        }
      }
    }
    if (stack.length !== 1) return originalInline.call(this, tokens, renderOptions, env);
    const copyToken = (token: MarkdownItToken, fields: Partial<MarkdownItToken>): MarkdownItToken =>
      Object.assign(Object.create(Object.getPrototypeOf(token)) as MarkdownItToken, token, fields);
    const baseline = tokens[0];
    if (!baseline) return originalInline.call(this, tokens, renderOptions, env);
    const materialize = (nodes: InlineNode<TokenValue>[]): MarkdownItToken[] => nodes.flatMap((node) => {
      if (node.isolation) {
        const attrs: MarkdownItToken['attrs'] = [['dir', node.isolation.direction], ['data-bidilens-isolate', ''], ['data-bidilens-kind', node.isolation.kind]];
        const open = copyToken(baseline, { type: 'bidilens_isolate_open', tag: 'bdi', nesting: 1, attrs, content: '', children: null, hidden: false, block: false });
        const close = copyToken(open, { type: 'bidilens_isolate_close', nesting: -1, attrs: null });
        return [open, ...materialize(node.children!), close];
      }
      const original = node.value!;
      const open = node.text === undefined || node.text === original.open.content ? original.open : copyToken(original.open, { content: node.text });
      return [open, ...(node.children ? materialize(node.children) : []), ...(original.close ? [original.close] : [])];
    });
    const projected = isolateForest(root.children!, activeDirection, { intervention: options.intervention, technicalIdentifiers: options.technicalIdentifiers });
    return originalInline.call(this, materialize(projected), renderOptions, env);
  };

  for (const ruleName of ['code_inline', 'code_block', 'fence']) {
    const originalCodeRule = md.renderer.rules[ruleName];
    if (!originalCodeRule) continue;
    md.renderer.rules[ruleName] = (tokens, index, renderOptions, env, self) => {
      if (activeDirection === null && !tokensNeedIntervention(tokens)) {
        return originalCodeRule(tokens, index, renderOptions, env, self);
      }
      tokens[index]?.attrSet('dir', 'ltr');
      tokens[index]?.attrSet('data-bidilens-code', '');
      markdownItClass(tokens[index], codeClassName);
      return originalCodeRule(tokens, index, renderOptions, env, self);
    };
  }
}

/** Exact batch document used as the rich stream's final equivalence oracle. */
export function analyzeBidiMarkdown(
  markdownIt: MarkdownItCompatible,
  source: string,
  options: BidiMarkdownStreamOptions = {}
): BidiMarkdownDocument {
  markdownItBidi(markdownIt, options);
  return analyzeConfiguredBidiMarkdown(internalMarkdownIt(markdownIt), source, options);
}

/**
 * Incremental Markdown session with fast per-push direction state and
 * checkpointed rich AST/HTML/security updates. `finish()` exactly reconciles
 * through the same batch pipeline as `analyzeBidiMarkdown()`.
 */
export function createBidiMarkdownStream(
  markdownIt: MarkdownItCompatible,
  options: BidiMarkdownStreamOptions = {}
): BidiMarkdownStreamSession {
  markdownItBidi(markdownIt, options);
  return new BidiMarkdownStream(internalMarkdownIt(markdownIt), options);
}
