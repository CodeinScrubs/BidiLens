import {
  BidiStream,
  analyzeBlock,
  needsBidiIntervention,
  scanBidiSecurity,
  type BidiStreamOptions,
  type BidiStreamSnapshot,
  type Direction,
  type ResolvedDirection,
  type StreamParagraph,
  type StreamStrategy
} from '@bidilens/core';
import type {
  BidiMarkdownBlock,
  BidiMarkdownDocument,
  BidiMarkdownStreamOptions,
  BidiMarkdownStreamSession,
  BidiMarkdownStreamUpdate,
  MarkdownAstNode,
  MarkdownDirtyRegion,
  MarkdownSecurityDelta,
  MarkdownSourceRange,
  MarkdownItRuntime,
  MarkdownItToken
} from './types.js';

const OPEN_BLOCKS = new Map<string, { close: string; kind: 'prose' | 'code' }>([
  ['paragraph_open', { close: 'paragraph_close', kind: 'prose' }],
  ['heading_open', { close: 'heading_close', kind: 'prose' }],
  ['blockquote_open', { close: 'blockquote_close', kind: 'prose' }],
  ['list_item_open', { close: 'list_item_close', kind: 'prose' }],
  ['td_open', { close: 'td_close', kind: 'prose' }],
  ['th_open', { close: 'th_close', kind: 'prose' }]
]);

function resolvedDirection(direction: Direction, options: BidiMarkdownStreamOptions): ResolvedDirection {
  if (direction !== 'neutral') return direction;
  return options.inheritedDirection ?? (options.fallback === 'rtl' ? 'rtl' : 'ltr');
}

function interventionRequired(text: string, direction: Direction, options: BidiMarkdownStreamOptions): boolean {
  const interventionOptions: { intervention?: 'auto' | 'always'; inheritedDirection?: ResolvedDirection } = {};
  if (options.intervention !== undefined) interventionOptions.intervention = options.intervention;
  if (options.inheritedDirection !== undefined) {
    interventionOptions.inheritedDirection = options.inheritedDirection;
  }
  return options.annotateNeutral === true
    || direction === 'rtl'
    || needsBidiIntervention(text, interventionOptions);
}

function lineOffsets(source: string): number[] {
  const offsets = [0];
  for (let index = 0; index < source.length; index += 1) {
    const codeUnit = source.charCodeAt(index);
    if (codeUnit === 0x0d) {
      if (source.charCodeAt(index + 1) === 0x0a) index += 1;
      offsets.push(index + 1);
    } else if (codeUnit === 0x0a) {
      offsets.push(index + 1);
    }
  }
  return offsets;
}

function sourceMapForToken(tokens: readonly MarkdownItToken[], tokenIndex: number): [number, number] | null {
  const token = tokens[tokenIndex];
  if (!token) return null;
  if (token.map) return [token.map[0], token.map[1]];
  if (token.type !== 'th_open' && token.type !== 'td_open') return null;
  for (let index = tokenIndex - 1; index >= 0; index -= 1) {
    const candidate = tokens[index];
    if (candidate?.type === 'tr_open' && candidate.map) {
      return [candidate.map[0], candidate.map[1]];
    }
    if (candidate?.type === 'table_open') break;
  }
  return null;
}

function rangeForSourceMap(
  map: readonly [number, number] | null,
  offsets: readonly number[],
  sourceLength: number
): MarkdownSourceRange {
  if (!map) return { start: 0, end: 0 };
  const start = offsets[map[0]] ?? sourceLength;
  const end = offsets[map[1]] ?? sourceLength;
  return { start, end };
}

function nestedBlockText(tokens: readonly MarkdownItToken[], index: number, closeType: string): string {
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

function textForBlock(tokens: readonly MarkdownItToken[], index: number, closeType: string): string {
  const token = tokens[index];
  if (!token) return '';
  if (token.type === 'blockquote_open' || token.type === 'list_item_open') {
    return nestedBlockText(tokens, index, closeType);
  }
  return tokens[index + 1]?.type === 'inline' ? tokens[index + 1]!.content : token.content;
}

function blockAnalysisOptions(options: BidiMarkdownStreamOptions): BidiMarkdownStreamOptions {
  return options;
}

function collectBlocks(
  tokens: readonly MarkdownItToken[],
  source: string,
  options: BidiMarkdownStreamOptions
): BidiMarkdownBlock[] {
  const offsets = lineOffsets(source);
  const blocks: BidiMarkdownBlock[] = [];
  for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex += 1) {
    const token = tokens[tokenIndex];
    if (!token) continue;
    const open = OPEN_BLOCKS.get(token.type);
    const standaloneCode = token.type === 'fence' || token.type === 'code_block';
    if (!open && !standaloneCode) continue;
    const kind = standaloneCode ? 'code' : open!.kind;
    const text = standaloneCode ? token.content : textForBlock(tokens, tokenIndex, open!.close);
    const analysis = analyzeBlock(text, blockAnalysisOptions(options));
    const sourceMap = sourceMapForToken(tokens, tokenIndex);
    blocks.push({
      index: blocks.length,
      tokenIndex,
      tokenType: token.type,
      kind,
      text,
      sourceRange: rangeForSourceMap(sourceMap, offsets, source.length),
      ...(sourceMap ? { lineRange: sourceMap } : {}),
      direction: kind === 'code' ? 'ltr' : resolvedDirection(analysis.direction, options),
      intervention: false,
      analysis
    });
  }
  const documentIntervention = blocks.some((block) => interventionRequired(
    block.text,
    block.analysis.direction,
    options
  ));
  if (documentIntervention) {
    for (const block of blocks) block.intervention = true;
  }
  return blocks;
}

function attributesForToken(token: MarkdownItToken): Record<string, string> | undefined {
  if (!token.attrs?.length) return undefined;
  return Object.fromEntries(token.attrs.map(([name, value]) => [name, String(value)]));
}

function serializeToken(token: MarkdownItToken, annotation: BidiMarkdownBlock | undefined): MarkdownAstNode {
  const attributes = attributesForToken(token);
  return {
    type: token.type,
    tag: token.tag,
    nesting: token.nesting,
    level: token.level,
    content: token.content,
    markup: token.markup,
    info: token.info,
    block: token.block,
    hidden: token.hidden,
    ...(token.map ? { map: [token.map[0], token.map[1]] } : {}),
    ...(attributes ? { attributes } : {}),
    ...(token.children ? { children: token.children.map((child) => serializeToken(child, undefined)) } : {}),
    ...(annotation?.intervention ? {
      bidi: {
        blockIndex: annotation.index,
        direction: annotation.direction,
        kind: annotation.kind
      }
    } : {})
  };
}

/** Runs the exact configured Markdown-It batch pipeline used for final reconciliation. */
export function analyzeConfiguredBidiMarkdown(
  markdownIt: MarkdownItRuntime,
  source: string,
  options: BidiMarkdownStreamOptions = {}
): BidiMarkdownDocument {
  const environment: Record<string, unknown> = {};
  const tokens = markdownIt.parse(source, environment);
  const blocks = collectBlocks(tokens, source, options);
  const blockByToken = new Map(blocks.map((block) => [block.tokenIndex, block]));
  const html = markdownIt.renderer.render(tokens, markdownIt.options, environment);
  return {
    source,
    ast: {
      type: 'root',
      children: tokens.map((token, tokenIndex) => serializeToken(token, blockByToken.get(tokenIndex)))
    },
    blocks,
    html,
    security: scanBidiSecurity(source, { mode: options.securityMode ?? 'audit' })
  };
}

function streamStrategy(options: BidiMarkdownStreamOptions): StreamStrategy {
  if (options.strategy === 'first-strong' || options.strategy === 'strict-uax9') return 'first-strong';
  if (options.excludeTechnicalTokens === false || options.strategy === 'majority') return 'majority';
  return options.strategy === 'semantic-dominant' ? 'semantic-dominant' : 'content-majority';
}

function directionStreamOptions(options: BidiMarkdownStreamOptions): BidiStreamOptions {
  // Soft line breaks remain inside one Markdown paragraph. The core stream
  // accepts an arbitrary separator and reconciles it exactly at finish(); rich
  // parse checkpoints provide the semantic-block correction before then.
  const result: BidiStreamOptions = {
    strategy: streamStrategy(options),
    paragraphBoundary: 'markdown',
    lockAfterStrongCharacters: 1,
    lockMargin: 1
  };
  if (options.fallback !== undefined) result.fallback = options.fallback;
  if (options.minimumStrongCharacters !== undefined) {
    result.minimumStrongCharacters = options.minimumStrongCharacters;
  }
  if (options.majorityThreshold !== undefined) result.majorityThreshold = options.majorityThreshold;
  if (options.excludeTechnicalTokens !== undefined) {
    result.excludeTechnicalTokens = options.excludeTechnicalTokens;
  }
  if (options.technicalIdentifiers !== undefined) result.technicalIdentifiers = options.technicalIdentifiers;
  return result;
}

function forceDirection(snapshot: BidiStreamSnapshot, options: BidiMarkdownStreamOptions): BidiStreamSnapshot {
  const forced = options.strategy === 'rtl'
    ? 'rtl'
    : options.strategy === 'ltr'
      ? 'ltr'
      : options.strategy === 'inherit'
        ? (options.inheritedDirection ?? (options.fallback === 'rtl' ? 'rtl' : 'ltr'))
        : null;
  if (!forced) return snapshot;
  return {
    ...snapshot,
    direction: forced,
    paragraphs: snapshot.paragraphs.map((paragraph) => ({ ...paragraph, direction: forced })),
    currentParagraph: { ...snapshot.currentParagraph, direction: forced }
  };
}

function reconcileParsedDirection(
  snapshot: BidiStreamSnapshot,
  document: BidiMarkdownDocument,
  options: BidiMarkdownStreamOptions
): BidiStreamSnapshot {
  const forced = forceDirection(snapshot, options);
  const paragraphs = semanticParagraphs(document, forced.finished);
  const currentParagraph = paragraphs.at(-1);
  if (!currentParagraph) return forced;
  const direction = currentParagraph.direction;
  return {
    ...forced,
    direction,
    changed: forced.changed || direction !== forced.direction,
    locked: forced.finished ? true : forced.locked,
    paragraphs,
    currentParagraph
  };
}

function semanticParagraphs(
  document: BidiMarkdownDocument,
  finished: boolean
): StreamParagraph[] {
  const blocks = semanticBlocks(document);
  return blocks.map((block, index) => ({
    text: block.text,
    direction: block.direction,
    completed: index < blocks.length - 1 || finished,
    index
  }));
}

function semanticBlocks(document: BidiMarkdownDocument): BidiMarkdownBlock[] {
  return document.blocks.filter((block) => block.tokenType !== 'blockquote_open'
    && block.tokenType !== 'list_item_open');
}

function reconcilePendingDirection(
  snapshot: BidiStreamSnapshot,
  pendingSnapshot: BidiStreamSnapshot,
  document: BidiMarkdownDocument,
  options: BidiMarkdownStreamOptions,
  hasSeed: boolean,
  replacesActive: boolean,
  replaceFromBlockIndex: number | null
): BidiStreamSnapshot {
  const forced = forceDirection(snapshot, options);
  const pending = forceDirection(pendingSnapshot, options);
  const blocks = semanticBlocks(document);
  const paragraphs = semanticParagraphs(document, false);
  const seedBlock = blocks.at(-1);
  const seedParagraph = hasSeed && replacesActive ? pending.paragraphs[0] : undefined;

  if (replaceFromBlockIndex !== null) {
    paragraphs.splice(replaceFromBlockIndex);
    for (const paragraph of pending.paragraphs) {
      paragraphs.push({ ...paragraph, index: paragraphs.length });
    }
  } else if (seedParagraph && seedBlock?.kind === 'prose' && paragraphs.length > 0) {
    paragraphs[paragraphs.length - 1] = { ...seedParagraph, index: paragraphs.length - 1 };
  } else if (!replacesActive && paragraphs.length > 0) {
    paragraphs[paragraphs.length - 1] = {
      ...paragraphs[paragraphs.length - 1]!,
      completed: true
    };
  }
  if (replaceFromBlockIndex === null) {
    for (const paragraph of pending.paragraphs.slice(replacesActive && hasSeed ? 1 : 0)) {
      paragraphs.push({ ...paragraph, index: paragraphs.length });
    }
  }
  if (paragraphs.length === 0) return forced;
  const currentParagraph = paragraphs.at(-1)!;
  return {
    ...forced,
    direction: currentParagraph.direction,
    changed: forced.changed || currentParagraph.direction !== forced.direction,
    locked: pending.locked,
    paragraphs,
    currentParagraph
  };
}

interface ContainerRelativeLine {
  content: string;
  contentColumn: number;
  prefixLength: number;
  hasBlockquote: boolean;
  blockquoteDepth: number;
}

function nextTabStop(column: number): number {
  return column + (4 - (column % 4));
}

function containerRelativeLine(line: string): ContainerRelativeLine {
  let cursor = 0;
  let column = 0;
  let hasBlockquote = false;
  let blockquoteDepth = 0;
  while (cursor < line.length) {
    const start = cursor;
    const startColumn = column;
    let spaces = 0;
    while (spaces < 3 && line[cursor] === ' ') {
      cursor += 1;
      column += 1;
      spaces += 1;
    }
    if (line[cursor] !== '>') {
      cursor = start;
      column = startColumn;
      break;
    }
    hasBlockquote = true;
    blockquoteDepth += 1;
    cursor += 1;
    column += 1;
    if (line[cursor] === ' ') {
      cursor += 1;
      column += 1;
    } else if (line[cursor] === '\t') {
      cursor += 1;
      column = nextTabStop(column);
    }
  }
  return {
    content: line.slice(cursor),
    contentColumn: column,
    prefixLength: cursor,
    hasBlockquote,
    blockquoteDepth
  };
}

function leadingIndentColumns(line: ContainerRelativeLine): number {
  let column = line.contentColumn;
  for (const character of line.content) {
    if (character === ' ') column += 1;
    else if (character === '\t') column = nextTabStop(column);
    else break;
  }
  return column - line.contentColumn;
}

function removeLeadingColumns(value: string, columns: number): string {
  let cursor = 0;
  let column = 0;
  while (cursor < value.length && column < columns) {
    const character = value[cursor]!;
    if (character === ' ') column += 1;
    else if (character === '\t') column = nextTabStop(column);
    else break;
    cursor += 1;
  }
  if (column < columns) return value;
  return `${' '.repeat(column - columns)}${value.slice(cursor)}`;
}

function listRelativeLine(line: string, listContentIndent: number): ContainerRelativeLine {
  const outer = containerRelativeLine(line);
  if (listContentIndent <= 0
    || leadingIndentColumns({
      ...outer,
      contentColumn: 0
    }) < listContentIndent) return outer;
  const adjusted = containerRelativeLine(removeLeadingColumns(outer.content, listContentIndent));
  return {
    ...adjusted,
    blockquoteDepth: outer.blockquoteDepth + adjusted.blockquoteDepth,
    hasBlockquote: outer.hasBlockquote || adjusted.hasBlockquote,
    prefixLength: outer.prefixLength + adjusted.prefixLength
  };
}

function listContentIndentForLine(line: string): number {
  const content = containerRelativeLine(line).content;
  const match = /^([ \t]*)(?:[-+*]|\d{1,9}[.)])([ \t]+)/u.exec(content);
  if (!match) return 0;
  const leading = leadingIndentColumns(containerRelativeLine(match[1]!));
  const markerStart = match[1]!.length;
  const markerEnd = content.slice(markerStart).search(/[ \t]/u) + markerStart;
  const markerWidth = Math.max(1, markerEnd - markerStart);
  return leading + markerWidth + 1;
}

function forceIndentedCodeDirections(snapshot: BidiStreamSnapshot): BidiStreamSnapshot {
  const paragraphs = snapshot.paragraphs.map((paragraph) => {
    const line = containerRelativeLine(paragraph.text);
    return leadingIndentColumns(line) >= 4 && /\S/u.test(line.content)
      ? { ...paragraph, direction: 'ltr' as const }
      : paragraph;
  });
  const currentParagraph = paragraphs.at(-1) ?? snapshot.currentParagraph;
  return {
    ...snapshot,
    direction: currentParagraph.direction,
    paragraphs,
    currentParagraph
  };
}

interface OpenFenceContext {
  block: BidiMarkdownBlock;
  marker: '`' | '~';
  length: number;
}

function openFenceAtEnd(document: BidiMarkdownDocument): OpenFenceContext | null {
  const block = document.blocks.at(-1);
  if (block?.tokenType !== 'fence') return null;
  const node = document.ast.children[block.tokenIndex];
  if (!node) return null;
  const marker = node?.markup[0];
  if ((marker !== '`' && marker !== '~') || node.markup.length < 3) return null;
  // Markdown-It normalizes each source content line to one `\n` in token
  // content. A closed fence adds one mapped line beyond opening + content;
  // this remains correct under container-relative indentation.
  const contentLineCount = node.content.length === 0
    ? 0
    : (node.content.match(/\n/gu)?.length ?? 0) + (node.content.endsWith('\n') ? 0 : 1);
  const mappedLineCount = (node.map?.[1] ?? 0) - (node.map?.[0] ?? 0);
  if (mappedLineCount >= contentLineCount + 2) return null;
  return { block, marker, length: node.markup.length };
}

type StructuralLineKind =
  | 'blockquote'
  | 'boundary'
  | 'code'
  | 'fence'
  | 'heading'
  | 'list';

type PendingBlockContext = 'blockquote' | 'code' | 'heading' | 'list' | 'table' | null;

const EMPTY_TABLE_CELL_MARKER = '\uFFFC';

function removeEmptyTableCellMarkers(
  snapshot: BidiStreamSnapshot,
  markerParagraphIndexes: ReadonlySet<number>
): BidiStreamSnapshot {
  if (markerParagraphIndexes.size === 0) return snapshot;
  const paragraphs = snapshot.paragraphs.map((paragraph) => {
    return markerParagraphIndexes.has(paragraph.index)
      && paragraph.text === EMPTY_TABLE_CELL_MARKER
      ? { ...paragraph, text: '' }
      : paragraph;
  });
  const currentParagraph = paragraphs.at(-1) ?? snapshot.currentParagraph;
  return {
    ...snapshot,
    paragraphs,
    currentParagraph
  };
}

interface TableCells {
  cells: string[];
  hasUnescapedPipe: boolean;
}

function tableCells(line: string): TableCells {
  const cells: string[] = [];
  let current = '';
  let hasUnescapedPipe = false;
  let previousCharacter = '';
  for (const character of line) {
    if (character === '|' && previousCharacter !== '\\') {
      hasUnescapedPipe = true;
      cells.push(current.trim());
      current = '';
    } else {
      current += character;
    }
    previousCharacter = character;
  }
  cells.push(current.trim());
  if (line.trimStart().startsWith('|')) cells.shift();
  const trimmedEnd = line.trimEnd();
  if (trimmedEnd.endsWith('|') && trimmedEnd.at(-2) !== '\\') cells.pop();
  return { cells, hasUnescapedPipe };
}

interface TableLineView {
  content: string;
  blockquoteDepth: number;
}

function tableLineView(line: string, listContentIndent = 0): TableLineView | null {
  const relative = listRelativeLine(line, listContentIndent);
  let cursor = 0;
  let indentColumns = 0;
  while (cursor < relative.content.length) {
    const character = relative.content[cursor]!;
    if (character === ' ') indentColumns += 1;
    else if (character === '\t') indentColumns = nextTabStop(indentColumns);
    else break;
    cursor += 1;
  }
  if (indentColumns > 3) return null;
  return {
    content: relative.content.slice(cursor),
    blockquoteDepth: relative.blockquoteDepth
  };
}

function isTableDelimiter(header: string, delimiter: string): boolean {
  const headerCells = tableCells(header);
  const delimiterCells = tableCells(delimiter);
  return headerCells.hasUnescapedPipe
    && delimiterCells.hasUnescapedPipe
    && headerCells.cells.length > 0
    && headerCells.cells.length === delimiterCells.cells.length
    && delimiterCells.cells.every((cell) => /^:?-+:?$/u.test(cell));
}

function previousLogicalLine(source: string, lineStart: number): string {
  if (lineStart <= 0) return '';
  let end = lineStart;
  while (end > 0 && (source[end - 1] === '\r' || source[end - 1] === '\n')) end -= 1;
  let start = end;
  while (start > 0 && source[start - 1] !== '\r' && source[start - 1] !== '\n') start -= 1;
  return source.slice(start, end);
}

const HTML_BLOCK_TAG = /^(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)$/iu;

function isHtmlBlockStart(content: string, complete: boolean): boolean {
  const value = content.replace(/^ {0,3}/u, '');
  if (/^<(?:!--|\?|!\[CDATA\[|![A-Z])/u.test(value)) return true;
  const match = /^<\/?([A-Za-z][A-Za-z0-9-]*)(.*)$/u.exec(value);
  if (!match) return false;
  const tag = match[1]!;
  const remainder = match[2]!;
  const raw = /^(?:pre|script|style|textarea)$/iu.test(tag);
  const block = HTML_BLOCK_TAG.test(tag);
  if (!raw && !block) return false;
  return /^[ \t/>]/u.test(remainder) || (complete && remainder.length === 0);
}

function structuralLineKind(
  line: string,
  continuesParagraph: boolean,
  complete = false,
  continuesBlockquoteParagraph = false,
  htmlEnabled = false,
  listContentIndent = 0
): StructuralLineKind | null {
  const outer = containerRelativeLine(line);
  const relative = listRelativeLine(line, listContentIndent);
  const content = relative.content;
  const listSibling = listContentIndent > 0
    && leadingIndentColumns({ ...outer, contentColumn: 0 }) < listContentIndent;
  const continuesInsideContainer = relative.hasBlockquote
    ? continuesBlockquoteParagraph
    : continuesParagraph;
  if (/^ {0,3}(?:`{3,}|~{3,})/u.test(content)) return 'fence';
  if (!continuesInsideContainer
    && leadingIndentColumns(relative) >= 4
    && /\S/u.test(content)) return 'code';
  if (/^ {0,3}#{1,6}[ \t]/u.test(content)
    || (complete && /^ {0,3}#{1,6}$/u.test(content))) return 'heading';

  const thematicBreak = /^ {0,3}(?:(?:\*[ \t]*){3,}|(?:_[ \t]*){3,}|(?:-[ \t]*){3,})$/u
    .test(content);
  const setextUnderline = continuesInsideContainer && /^ {0,3}-{3,}[ \t]*$/u.test(content);
  if (complete && thematicBreak && !setextUnderline) return 'boundary';

  const unordered = /^ {0,3}[-+*][ \t]+(.*)$/u.exec(content);
  if (unordered && (!continuesInsideContainer || /\S/u.test(unordered[1]!))) {
    const marker = content.trimStart()[0]!;
    const markerSequence = content.trimStart().replace(/[ \t]/gu, '');
    const canBecomeThematic = [...markerSequence].every((character) => character === marker);
    if (complete || !canBecomeThematic) return 'list';
  }

  const ordered = /^ {0,3}(\d{1,9})[.)][ \t]+(.*)$/u.exec(content);
  if (ordered && (!continuesInsideContainer
    || listSibling
    || (ordered[1] === '1' && /\S/u.test(ordered[2]!)))) return 'list';

  if (htmlEnabled && isHtmlBlockStart(content, complete)) return 'boundary';
  if (relative.hasBlockquote
    && !complete
    && couldBecomeStructuralLine(content, htmlEnabled)) return null;
  if (relative.hasBlockquote) return 'blockquote';
  return null;
}

function couldBecomeStructuralLine(
  line: string,
  htmlEnabled = false,
  listContentIndent = 0
): boolean {
  if (line.length > 64) return false;
  const relative = listRelativeLine(line, listContentIndent);
  const content = relative.content;
  if (/^ {0,3}$/u.test(content)) return true;
  if (/^ {0,3}#{0,6}$/u.test(content)) return true;
  if (/^ {0,3}(?:`{0,2}|~{0,2})$/u.test(content)) return true;
  if (/^ {0,3}([*_-])(?:[ \t]*\1)*[ \t]*$/u.test(content)) return true;
  if (/^ {0,3}\+[ \t]*$/u.test(content)) return true;
  if (htmlEnabled && /^ {0,3}<(?:[!?/]?[A-Za-z0-9-]*)?$/u.test(content)) return true;
  return /^ {0,3}\d{0,9}(?:[.)]?[ \t]*)?$/u.test(content);
}

function contextForBlock(
  document: BidiMarkdownDocument,
  block: BidiMarkdownBlock | undefined
): PendingBlockContext {
  if (!block) return null;
  if (block.kind === 'code') return 'code';
  if (block.tokenType === 'heading_open') return 'heading';
  const stack: Exclude<PendingBlockContext, null>[] = [];
  for (let index = 0; index < block.tokenIndex; index += 1) {
    const type = document.ast.children[index]?.type;
    if (type === 'blockquote_open') stack.push('blockquote');
    else if (type === 'list_item_open') stack.push('list');
    else if (type === 'table_open') stack.push('table');
    else if (type === 'blockquote_close'
      || type === 'list_item_close'
      || type === 'table_close') stack.pop();
  }
  return stack.at(-1) ?? null;
}

function blockquoteDepthForBlock(
  document: BidiMarkdownDocument,
  block: BidiMarkdownBlock | undefined
): number {
  if (!block) return 0;
  let depth = 0;
  for (let index = 0; index < block.tokenIndex; index += 1) {
    const type = document.ast.children[index]?.type;
    if (type === 'blockquote_open') depth += 1;
    else if (type === 'blockquote_close') depth = Math.max(0, depth - 1);
  }
  return depth;
}

function tableColumnCountForBlock(
  document: BidiMarkdownDocument,
  block: BidiMarkdownBlock | undefined
): number {
  if (!block) return 0;
  let tableStart = -1;
  let tableDepth = 0;
  for (let index = 0; index <= block.tokenIndex; index += 1) {
    const type = document.ast.children[index]?.type;
    if (type === 'table_open') {
      tableDepth += 1;
      if (tableDepth === 1) tableStart = index;
    } else if (type === 'table_close' && tableDepth > 0) {
      tableDepth -= 1;
      if (tableDepth === 0) tableStart = -1;
    }
  }
  if (tableStart < 0) return 0;
  let columns = 0;
  for (let index = tableStart + 1; index < document.ast.children.length; index += 1) {
    const type = document.ast.children[index]?.type;
    if (type === 'th_open') columns += 1;
    else if (type === 'thead_close' || type === 'table_close') break;
  }
  return columns;
}

function tableSourceRangeForBlock(
  document: BidiMarkdownDocument,
  block: BidiMarkdownBlock | undefined
): MarkdownSourceRange | null {
  if (!block) return null;
  let tableMap: [number, number] | undefined;
  let tableDepth = 0;
  for (let index = 0; index <= block.tokenIndex; index += 1) {
    const node = document.ast.children[index];
    if (node?.type === 'table_open') {
      tableDepth += 1;
      if (tableDepth === 1) tableMap = node.map;
    } else if (node?.type === 'table_close' && tableDepth > 0) {
      tableDepth -= 1;
      if (tableDepth === 0) tableMap = undefined;
    }
  }
  if (!tableMap) return null;
  return rangeForSourceMap(tableMap, lineOffsets(document.source), document.source.length);
}

function endsWithMarkdownBlankLine(source: string): boolean {
  let cursor = source.length;
  const consumeLineBreak = (): boolean => {
    if (cursor <= 0) return false;
    if (source[cursor - 1] === '\n') {
      cursor -= 1;
      if (source[cursor - 1] === '\r') cursor -= 1;
      return true;
    }
    if (source[cursor - 1] === '\r') {
      cursor -= 1;
      return true;
    }
    return false;
  };
  if (!consumeLineBreak()) return false;
  while (cursor > 0 && (source[cursor - 1] === ' ' || source[cursor - 1] === '\t')) cursor -= 1;
  return consumeLineBreak();
}

function forceOpenFenceDirection(
  snapshot: BidiStreamSnapshot,
  source: string,
  document: BidiMarkdownDocument,
  context: OpenFenceContext
): BidiStreamSnapshot {
  const paragraphs = semanticParagraphs(document, false);
  const currentParagraph = {
    ...(paragraphs.at(-1) ?? snapshot.currentParagraph),
    text: source.slice(context.block.sourceRange.start),
    direction: 'ltr' as const,
    completed: false
  };
  return {
    ...snapshot,
    direction: 'ltr',
    changed: snapshot.changed || snapshot.direction !== 'ltr',
    locked: true,
    paragraphs: paragraphs.length > 0
      ? [...paragraphs.slice(0, -1), currentParagraph]
      : [currentParagraph],
    currentParagraph
  };
}

function findingKey(finding: BidiMarkdownDocument['security']['findings'][number]): string {
  return `${finding.code}:${finding.sourceRange.utf16.start}:${finding.sourceRange.utf16.end}`;
}

function securityDelta(
  previous: BidiMarkdownDocument,
  current: BidiMarkdownDocument
): MarkdownSecurityDelta {
  const previousKeys = new Set(previous.security.findings.map(findingKey));
  const currentKeys = new Set(current.security.findings.map(findingKey));
  return {
    added: current.security.findings.filter((finding) => !previousKeys.has(findingKey(finding))),
    removed: previous.security.findings.filter((finding) => !currentKeys.has(findingKey(finding)))
  };
}

function changedBlockIndexes(
  previous: readonly BidiMarkdownBlock[],
  current: readonly BidiMarkdownBlock[]
): number[] {
  const changed: number[] = [];
  const length = Math.max(previous.length, current.length);
  for (let index = 0; index < length; index += 1) {
    if (JSON.stringify(previous[index]) !== JSON.stringify(current[index])) changed.push(index);
  }
  return changed;
}

function earliestDirtyStart(
  previous: BidiMarkdownDocument,
  current: BidiMarkdownDocument,
  changed: readonly number[]
): number {
  const first = changed[0];
  if (first === undefined) return Math.min(previous.source.length, current.source.length);
  return Math.min(
    previous.blocks[first]?.sourceRange.start ?? current.source.length,
    current.blocks[first]?.sourceRange.start ?? previous.source.length
  );
}

function nodeSourceStart(node: MarkdownAstNode | undefined, source: string): number {
  if (!node?.map) return node ? 0 : source.length;
  return lineOffsets(source)[node.map[0]] ?? source.length;
}

function earliestAstDirtyStart(
  previous: BidiMarkdownDocument,
  current: BidiMarkdownDocument
): number {
  const length = Math.max(previous.ast.children.length, current.ast.children.length);
  for (let index = 0; index < length; index += 1) {
    const previousNode = previous.ast.children[index];
    const currentNode = current.ast.children[index];
    if (JSON.stringify(previousNode) !== JSON.stringify(currentNode)) {
      return Math.min(
        nodeSourceStart(previousNode, previous.source),
        nodeSourceStart(currentNode, current.source)
      );
    }
  }
  return Math.min(previous.source.length, current.source.length);
}

function isSelfContainedParagraph(section: string): boolean {
  const value = section.trim();
  if (!value) return false;
  if (value.includes('[') || value.includes(']') || value.includes('<')
    || value.includes('>') || value.includes('|')) return false;
  if (/(^|\n)[ \t]+/u.test(value)) return false;
  if (/(^|\n)(?:#{1,6}(?:[ \t]|$)|>|[-+*](?:[ \t]|$)|\d+[.)](?:[ \t]|$)|`{3,}|~{3,}|={3,}[ \t]*$|-{3,}[ \t]*$)/mu.test(value)) {
    return false;
  }
  return true;
}

/** @internal Conservative prefix that later Markdown cannot reinterpret. */
export function stablePrefixEnd(source: string, document: BidiMarkdownDocument): number {
  const separator = /\r?\n[ \t]*\r?\n/gu;
  let cursor = 0;
  let stable = 0;
  let blockIndex = 0;
  for (const match of source.matchAll(separator)) {
    const index = match.index;
    if (!isSelfContainedParagraph(source.slice(cursor, index))) break;
    while (blockIndex < document.blocks.length
      && document.blocks[blockIndex]!.sourceRange.end < index) {
      blockIndex += 1;
    }
    const candidate = document.blocks[blockIndex];
    const block = candidate && candidate.sourceRange.start <= cursor
      && candidate.sourceRange.end >= index
      ? candidate
      : undefined;
    // A currently annotation-free LTR block can still gain document-level
    // metadata if a later RTL block arrives, so it is not immutable yet.
    if (!block?.intervention) break;
    stable = index + match[0].length;
    cursor = stable;
  }
  return stable;
}

function emptyDocument(options: BidiMarkdownStreamOptions): BidiMarkdownDocument {
  return {
    source: '',
    ast: { type: 'root', children: [] },
    blocks: [],
    html: '',
    security: scanBidiSecurity('', { mode: options.securityMode ?? 'audit' })
  };
}

export class BidiMarkdownStream implements BidiMarkdownStreamSession {
  readonly #markdownIt: MarkdownItRuntime;
  readonly #options: BidiMarkdownStreamOptions;
  #directionStream: BidiStream;
  #pendingDirectionStream: BidiStream;
  #pendingLineDirectionStream: BidiStream;
  #source = '';
  #document: BidiMarkdownDocument;
  #renderedThrough = 0;
  #stableThrough = 0;
  #nextCheckpoint = 1;
  #revision = 0;
  #parseCount = 0;
  #finished = false;
  #openFence: OpenFenceContext | null = null;
  #terminalBlockPending = false;
  #preferLineDirection = false;
  #pendingHasSeed = false;
  #pendingLineHasSeed = false;
  #pendingReplacesActive = false;
  #pendingLineReplacesActive = false;
  #pendingLineReplaceFromBlockIndex: number | null = null;
  #pendingLinePrefix = '';
  #pendingLineRelevant = true;
  #pendingLineTouched = false;
  #pendingLineHasNonWhitespace = false;
  #previousStructuralCharacterWasCarriageReturn = false;
  #pendingSemanticLineBuffer = '';
  #pendingSemanticLineUndecided = false;
  #suppressPendingSemanticLine = false;
  #currentSemanticLineKind: StructuralLineKind | null = null;
  #pendingBlockContext: PendingBlockContext = null;
  #pendingBlockquoteDepth = 0;
  #pendingListContentIndent = 0;
  #pendingTable = false;
  #pendingTableColumns = 0;
  #pendingTableContainerDepth = 0;
  #pendingTableNeedsRowSeparator = false;
  #pendingTablePendingPipe = false;
  #pendingTableCellWhitespace = '';
  #pendingTablePreviousCharacterWasBackslash = false;
  #pendingTableAtRowStart = true;
  #pendingTableCellIndex = 0;
  #pendingTableCurrentCellHasContent = false;
  #pendingTableCurrentCellMarkerEmitted = false;
  #pendingTableIgnoreRemainder = false;
  #pendingTableLineBuffer = '';
  #pendingTableLineDecided = false;
  #pendingTableOnDelimiterLine = false;
  #pendingTableEmptyMarkerParagraphIndexes = new Set<number>();
  #pendingLineCurrentParagraphIndex = 0;
  #pendingTableHasHalfRowSeparator = false;
  #currentRawLineParts: string[] = [];
  #previousRawLine = '';
  #currentLineContinuesParagraph = false;
  #pendingIndentedCode = false;
  #completedStructuralBoundary = false;
  #sawLineStructuralBoundary = false;
  #fenceLinePhase: 'container' | 'marker' | 'trailing' | 'invalid' = 'container';
  #fenceMarkerCount = 0;

  constructor(markdownIt: MarkdownItRuntime, options: BidiMarkdownStreamOptions = {}) {
    this.#markdownIt = markdownIt;
    this.#options = Object.freeze({
      ...options,
      ...(options.technicalIdentifiers
        ? { technicalIdentifiers: Object.freeze([...options.technicalIdentifiers]) }
        : {})
    });
    this.#directionStream = new BidiStream(directionStreamOptions(this.#options));
    this.#pendingDirectionStream = new BidiStream(directionStreamOptions(this.#options));
    this.#pendingLineDirectionStream = new BidiStream(directionStreamOptions(this.#options));
    this.#document = emptyDocument(this.#options);
  }

  push(chunk: string): void {
    if (this.#finished) throw new Error('Cannot push after finish().');
    if (!chunk) return;
    const terminalBoundary = this.#terminalBlockPending
      && (/(?:\r|\n)/u.test(chunk) || /(?:\r|\n)$/u.test(this.#source));
    this.#source += chunk;
    this.#directionStream.push(chunk);
    this.#pendingDirectionStream.push(chunk);
    this.#scanPendingStructure(chunk, true);
    if (terminalBoundary) this.#completedStructuralBoundary = true;
  }

  getUpdate(): BidiMarkdownStreamUpdate {
    const hasPendingSource = this.#source.length !== this.#renderedThrough;
    const structuralRevisionRequired = hasPendingSource && this.#completedStructuralBoundary;
    if (!this.#finished && hasPendingSource
      && (this.#source.length >= this.#nextCheckpoint || structuralRevisionRequired)) {
      return this.#parse(this.#revision === 0 ? 'initial-render' : 'open-markdown');
    }
    return this.#snapshot(false, [], [], { added: [], removed: [] });
  }

  finish(): BidiMarkdownStreamUpdate {
    if (this.#finished) return this.#snapshot(false, [], [], { added: [], removed: [] });
    this.#finished = true;
    this.#directionStream.finish();
    return this.#parse('final-reconciliation');
  }

  reset(initialText = ''): BidiMarkdownStreamUpdate {
    this.#finished = false;
    this.#source = initialText;
    this.#directionStream = new BidiStream(directionStreamOptions(this.#options));
    this.#pendingDirectionStream = new BidiStream(directionStreamOptions(this.#options));
    this.#pendingLineDirectionStream = new BidiStream(directionStreamOptions(this.#options));
    this.#directionStream.reset(initialText);
    this.#nextCheckpoint = 1;
    return this.#parse('reset');
  }

  #parse(reason: MarkdownDirtyRegion['reason']): BidiMarkdownStreamUpdate {
    const previous = this.#document;
    const current = analyzeConfiguredBidiMarkdown(this.#markdownIt, this.#source, this.#options);
    const changedBlocks = changedBlockIndexes(previous.blocks, current.blocks);
    const dirtyStart = reason === 'reset'
      ? 0
      : Math.min(
        earliestDirtyStart(previous, current, changedBlocks),
        earliestAstDirtyStart(previous, current)
      );
    const dirtyRegions: MarkdownDirtyRegion[] = previous.source === current.source && reason !== 'reset'
      ? []
      : [{ start: dirtyStart, end: current.source.length, reason }];
    const delta = securityDelta(previous, current);
    this.#document = current;
    this.#renderedThrough = this.#source.length;
    this.#resetPendingStructure();
    this.#stableThrough = this.#finished
      ? this.#source.length
      : stablePrefixEnd(this.#source, current);
    this.#revision += 1;
    this.#parseCount += 1;
    this.#nextCheckpoint = Math.max(this.#source.length + 1, this.#source.length * 2);
    return this.#snapshot(true, dirtyRegions, changedBlocks, delta);
  }

  #snapshot(
    changed: boolean,
    dirtyRegions: MarkdownDirtyRegion[],
    changedBlocks: number[],
    delta: MarkdownSecurityDelta
  ): BidiMarkdownStreamUpdate {
    const pendingSourceRange: MarkdownSourceRange | null = this.#renderedThrough < this.#source.length
      ? { start: this.#renderedThrough, end: this.#source.length }
      : null;
    const direction = this.#directionStream.snapshot();
    const currentLineKind = this.#currentLineStructuralKind();
    const currentLineInterrupts = this.#currentLineContinuesParagraph
      && currentLineKind !== null
      && currentLineKind !== 'boundary';
    const useLineDirection = this.#preferLineDirection || this.#sawLineStructuralBoundary
      || currentLineInterrupts;
    const pendingDirection = useLineDirection
      ? removeEmptyTableCellMarkers(
          this.#pendingLineDirectionStream.snapshot(),
          this.#pendingTableEmptyMarkerParagraphIndexes
        )
      : this.#pendingDirectionStream.snapshot();
    const pendingHasSeed = useLineDirection
      ? this.#pendingLineHasSeed
      : this.#pendingHasSeed;
    const pendingReplacesActive = useLineDirection
      ? this.#pendingLineReplacesActive
      : this.#pendingReplacesActive;
    const reconciledPending = reconcilePendingDirection(
      direction,
      pendingDirection,
      this.#document,
      this.#options,
      pendingHasSeed,
      pendingReplacesActive,
      useLineDirection ? this.#pendingLineReplaceFromBlockIndex : null
    );
    const parsedDirection = this.#renderedThrough === this.#source.length
      ? reconcileParsedDirection(direction, this.#document, this.#options)
      : this.#openFence
        ? forceOpenFenceDirection(direction, this.#source, this.#document, this.#openFence)
        : currentLineKind === 'code' || this.#pendingIndentedCode
          ? forceIndentedCodeDirections(reconciledPending)
          : reconciledPending;
    return {
      source: this.#source,
      document: this.#document,
      direction: parsedDirection,
      revision: this.#revision,
      parseCount: this.#parseCount,
      changed,
      finished: this.#finished,
      renderedThrough: this.#renderedThrough,
      stableThrough: this.#stableThrough,
      dirtyRegions,
      pendingSourceRange,
      changedBlockIndexes: changedBlocks,
      securityDelta: delta
    };
  }

  #resetPendingStructure(): void {
    this.#openFence = openFenceAtEnd(this.#document);
    const blocks = semanticBlocks(this.#document);
    const activeBlock = blocks.at(-1);
    const activeContext = contextForBlock(this.#document, activeBlock);
    const tableRange = activeContext === 'table'
      ? tableSourceRangeForBlock(this.#document, activeBlock)
      : null;
    const activeRangeEnd = tableRange?.end ?? activeBlock?.sourceRange.end ?? 0;
    const unownedTail = this.#source.slice(activeRangeEnd);
    const hasUnownedContent = /\S/u.test(unownedTail);
    const activeOwnsTail = activeBlock !== undefined
      && !hasUnownedContent
      && (activeContext !== 'table' || activeRangeEnd === this.#source.length);
    this.#terminalBlockPending = this.#openFence === null && activeOwnsTail
      && activeBlock.kind === 'code';
    this.#preferLineDirection = activeOwnsTail && activeBlock.tokenType === 'heading_open';
    const endsLine = /(?:\r|\n)$/u.test(this.#source);
    const endsBlankLine = endsWithMarkdownBlankLine(this.#source);
    this.#pendingReplacesActive = activeOwnsTail
      && !endsBlankLine
      && !(this.#terminalBlockPending && endsLine);
    this.#pendingLineReplacesActive = activeOwnsTail && !endsLine;
    this.#pendingHasSeed = hasUnownedContent || this.#pendingReplacesActive;
    this.#pendingLineHasSeed = hasUnownedContent || this.#pendingLineReplacesActive;
    const activeSource = activeBlock
      ? this.#source.slice(activeBlock.sourceRange.start, this.#renderedThrough)
      : '';
    const trailingWhitespace = /[ \t\r\n]+$/u.exec(activeSource)?.[0] ?? '';
    const activeSeed = `${activeBlock?.text ?? ''}${activeBlock?.kind === 'prose' ? trailingWhitespace : ''}`;
    const markdownSeed = hasUnownedContent
      ? unownedTail
      : this.#pendingReplacesActive ? activeSeed : '';
    this.#pendingDirectionStream = new BidiStream(directionStreamOptions(this.#options));
    this.#pendingDirectionStream.reset(markdownSeed);
    this.#pendingLineDirectionStream = new BidiStream(directionStreamOptions(this.#options));
    const lineSeed = hasUnownedContent
      ? unownedTail
      : this.#pendingLineReplacesActive ? activeBlock?.text ?? '' : '';
    this.#pendingLineDirectionStream.reset(lineSeed);
    this.#pendingLineCurrentParagraphIndex =
      this.#pendingLineDirectionStream.snapshot().currentParagraph.index;
    this.#pendingLinePrefix = '';
    this.#pendingLineRelevant = true;
    this.#pendingLineTouched = false;
    this.#pendingLineHasNonWhitespace = false;
    this.#previousStructuralCharacterWasCarriageReturn = false;
    this.#pendingSemanticLineBuffer = '';
    this.#pendingSemanticLineUndecided = false;
    this.#suppressPendingSemanticLine = false;
    this.#pendingLineReplaceFromBlockIndex = null;
    this.#currentSemanticLineKind = null;
    this.#pendingBlockContext = activeContext === 'table' && !activeOwnsTail
      ? null
      : activeContext;
    this.#pendingBlockquoteDepth = blockquoteDepthForBlock(this.#document, activeBlock);
    this.#pendingListContentIndent = this.#pendingBlockContext === 'list'
      ? listContentIndentForLine(activeSource)
      : 0;
    const lineStart = Math.max(this.#source.lastIndexOf('\n'), this.#source.lastIndexOf('\r')) + 1;
    this.#pendingTable = this.#pendingBlockContext === 'table';
    this.#pendingTableColumns = this.#pendingTable
      ? tableColumnCountForBlock(this.#document, activeBlock)
      : 0;
    this.#pendingTableContainerDepth = this.#pendingTable ? this.#pendingBlockquoteDepth : 0;
    this.#pendingTableNeedsRowSeparator = this.#pendingTable && endsLine;
    this.#pendingTablePendingPipe = false;
    this.#pendingTableCellWhitespace = '';
    this.#pendingTablePreviousCharacterWasBackslash = false;
    this.#pendingTableAtRowStart = true;
    this.#pendingTableCellIndex = 0;
    this.#pendingTableCurrentCellHasContent = false;
    this.#pendingTableCurrentCellMarkerEmitted = false;
    this.#pendingTableIgnoreRemainder = false;
    this.#pendingTableLineBuffer = '';
    this.#pendingTableLineDecided = false;
    this.#pendingTableOnDelimiterLine = false;
    this.#pendingTableEmptyMarkerParagraphIndexes = new Set<number>();
    this.#pendingTableHasHalfRowSeparator = false;
    this.#currentRawLineParts = [this.#source.slice(lineStart)];
    this.#previousRawLine = previousLogicalLine(this.#source, lineStart);
    this.#currentLineContinuesParagraph = !endsWithMarkdownBlankLine(this.#source.slice(0, lineStart))
      && activeBlock?.kind === 'prose'
      && activeBlock.tokenType === 'paragraph_open'
      && activeBlock.sourceRange.start <= lineStart;
    this.#pendingIndentedCode = false;
    this.#completedStructuralBoundary = false;
    this.#sawLineStructuralBoundary = false;
    this.#resetFenceLine();
    this.#scanPendingStructure(this.#source.slice(lineStart), false);
    this.#restorePendingTableLineState();
    this.#pendingLineTouched = false;
  }

  #scanPendingStructure(value: string, touched: boolean): void {
    for (const character of value) {
      if (character === '\n' && this.#previousStructuralCharacterWasCarriageReturn) {
        if (touched) this.#pendingLineDirectionStream.push(character);
        this.#previousStructuralCharacterWasCarriageReturn = false;
        continue;
      }
      this.#previousStructuralCharacterWasCarriageReturn = false;
      if (character === '\r' || character === '\n') {
        const completedRawLine = this.#currentRawLineParts.join('');
        if (touched) {
          if (this.#pendingTable) this.#finishPendingTableLine(completedRawLine);
          this.#flushPendingSemanticLine(true);
          this.#pendingLineDirectionStream.push(character);
          this.#pendingSemanticLineBuffer = '';
          this.#pendingSemanticLineUndecided = true;
          this.#suppressPendingSemanticLine = false;
        }
        if (character === '\r') this.#previousStructuralCharacterWasCarriageReturn = true;
        const lineWasBlank = !this.#pendingLineHasNonWhitespace
          || (this.#pendingLineRelevant
            && containerRelativeLine(this.#pendingLinePrefix).content.trim().length === 0);
        if (this.#pendingLineTouched) {
          if (this.#openFence && this.#currentLineClosesFence()) {
            this.#completedStructuralBoundary = true;
          } else if (!this.#openFence) {
            const kind = this.#currentLineStructuralKind(true) ?? this.#currentSemanticLineKind;
            if (kind === 'boundary' || kind === 'fence') {
              this.#completedStructuralBoundary = true;
            }
            this.#pendingIndentedCode = kind === 'code'
              || (lineWasBlank && this.#pendingIndentedCode);
            this.#currentLineContinuesParagraph = !lineWasBlank
              && (kind === null || kind === 'blockquote' || kind === 'list');
            if (this.#pendingTable) {
              this.#pendingBlockContext = 'table';
              this.#pendingBlockquoteDepth = this.#pendingTableContainerDepth;
            } else {
              this.#updatePendingBlockContext(
                kind,
                lineWasBlank,
                containerRelativeLine(this.#pendingLinePrefix).blockquoteDepth
              );
            }
          }
        } else if (lineWasBlank) {
          this.#currentLineContinuesParagraph = false;
          if (this.#pendingBlockContext !== 'list') {
            this.#pendingBlockContext = null;
            this.#pendingBlockquoteDepth = 0;
            this.#pendingListContentIndent = 0;
          }
        }
        if (touched) {
          const headerView = tableLineView(
            this.#previousRawLine,
            this.#pendingListContentIndent
          );
          const delimiterView = tableLineView(
            completedRawLine,
            this.#pendingListContentIndent
          );
          if (headerView
            && delimiterView
            && headerView.blockquoteDepth === delimiterView.blockquoteDepth
            && isTableDelimiter(headerView.content, delimiterView.content)) {
            this.#activatePendingTable(
              this.#previousRawLine,
              completedRawLine,
              headerView,
              delimiterView
            );
          }
          this.#previousRawLine = completedRawLine;
          this.#currentRawLineParts = [];
          if (this.#pendingTable) this.#beginPendingTableLine(true, true);
        }
        this.#pendingLinePrefix = '';
        this.#pendingLineRelevant = true;
        this.#pendingLineTouched = false;
        this.#pendingLineHasNonWhitespace = false;
        this.#currentSemanticLineKind = null;
        this.#resetFenceLine();
        continue;
      }
      if (touched) this.#pendingLineTouched = true;
      if (touched) this.#currentRawLineParts.push(character);
      if (character !== ' ' && character !== '\t') this.#pendingLineHasNonWhitespace = true;
      if (this.#openFence) this.#advanceFenceLine(character);
      else this.#advanceStructuralLine(character);
      if (touched) this.#pushPendingSemanticCharacter(character);
    }
  }

  #advanceStructuralLine(character: string): void {
    if (!this.#pendingLineRelevant) return;
    this.#pendingLinePrefix += character;
    const kind = this.#currentLineStructuralKind();
    if (this.#pendingIndentedCode
      && /\S/u.test(this.#pendingLinePrefix)
      && kind !== 'code') {
      this.#pendingIndentedCode = false;
      this.#sawLineStructuralBoundary = true;
    }
    const container = containerRelativeLine(this.#pendingLinePrefix);
    const remainder = this.#pendingLinePrefix.slice(container.prefixLength);
    if (remainder.length <= 64) {
      if (container.prefixLength > 64) this.#pendingLinePrefix = `> ${remainder}`;
      return;
    }
    this.#pendingLinePrefix = '';
    this.#pendingLineRelevant = false;
  }

  #pushPendingSemanticCharacter(character: string): void {
    if (this.#pendingTable) {
      this.#pushPendingTableLineCharacter(character);
      return;
    }
    if (this.#suppressPendingSemanticLine) return;
    if (!this.#pendingSemanticLineUndecided) {
      this.#pendingLineDirectionStream.push(character);
      return;
    }
    this.#pendingSemanticLineBuffer += character;
    this.#flushPendingSemanticLine(false);
  }

  #pushPendingTableLineCharacter(character: string): void {
    this.#pendingSemanticLineBuffer = '';
    this.#pendingSemanticLineUndecided = false;
    if (this.#pendingTableOnDelimiterLine) {
      // Extending the delimiter can invalidate or realign the entire table.
      // Force the next rich update through the exact parser instead of
      // projecting delimiter syntax as a body cell.
      this.#completedStructuralBoundary = true;
      return;
    }
    if (this.#pendingTableLineDecided) {
      this.#pushPendingTableCellCharacter(character, true);
      return;
    }
    this.#pendingTableLineBuffer += character;
    this.#resolvePendingTableLine(false);
  }

  #resolvePendingTableLine(complete: boolean): void {
    if (!this.#pendingTable || this.#pendingTableLineDecided) return;
    const buffer = this.#pendingTableLineBuffer;
    const view = tableLineView(buffer, this.#pendingListContentIndent);
    const kind = this.#currentLineStructuralKind(complete);
    const blank = complete && (view === null || view.content.trim().length === 0);
    const wrongContainer = view === null
      || view.blockquoteDepth !== this.#pendingTableContainerDepth;
    const incompleteContainerPrefix = !complete
      && view !== null
      && view.blockquoteDepth < this.#pendingTableContainerDepth
      && view.content.trim().length === 0;
    if (incompleteContainerPrefix) return;
    const structural = kind !== null
      && !(kind === 'blockquote'
        && view !== null
        && view.blockquoteDepth === this.#pendingTableContainerDepth);
    if (blank || wrongContainer || structural) {
      this.#terminatePendingTableLine(buffer, kind);
      return;
    }
    if (!view) return;
    if (!complete
      && (view.content.trim().length === 0
        || (kind === null
          && couldBecomeStructuralLine(
            buffer,
            this.#markdownIt.options.html === true,
            this.#pendingListContentIndent
          )))) return;

    this.#pendingTableLineDecided = true;
    this.#pendingTableLineBuffer = '';
    for (const character of view.content) {
      this.#pushPendingTableCellCharacter(character, true);
    }
  }

  #finishPendingTableLine(completedRawLine: string): void {
    if (!this.#pendingTable) return;
    if (this.#pendingTableOnDelimiterLine) {
      this.#pendingTableOnDelimiterLine = false;
      this.#pendingTableLineDecided = true;
      return;
    }
    if (!this.#pendingTableLineDecided) {
      this.#pendingTableLineBuffer = completedRawLine;
      this.#resolvePendingTableLine(true);
    }
    if (!this.#pendingTable) return;
    this.#emitPendingEmptyTableCell(true);
    while (this.#pendingTableCellIndex < this.#pendingTableColumns - 1) {
      this.#advancePendingTableCell(true, true);
    }
    // A separator followed only by whitespace is Markdown-It's optional
    // trailing pipe, not the start of a surplus empty cell.
    this.#pendingTablePendingPipe = false;
    this.#pendingTableCellWhitespace = '';
    this.#pendingTablePreviousCharacterWasBackslash = false;
  }

  #terminatePendingTableLine(
    buffer: string,
    kind: StructuralLineKind | null
  ): void {
    this.#pendingTable = false;
    this.#pendingTableColumns = 0;
    this.#pendingBlockContext = null;
    this.#pendingBlockquoteDepth = 0;
    this.#pendingTableLineBuffer = '';
    this.#pendingTableLineDecided = false;
    this.#pendingTablePendingPipe = false;
    this.#pendingTableCellWhitespace = '';
    this.#pendingTablePreviousCharacterWasBackslash = false;
    this.#pendingTableIgnoreRemainder = false;
    this.#pendingTableOnDelimiterLine = false;
    if (this.#pendingTableNeedsRowSeparator) {
      this.#pendingLineDirectionStream.push('\n');
    } else if (this.#pendingLineDirectionStream.snapshot().text.length > 0) {
      this.#pendingLineDirectionStream.push('\n\n');
    }
    this.#pendingTableNeedsRowSeparator = false;
    this.#currentSemanticLineKind = kind;
    this.#pendingLineDirectionStream.push(buffer);
    this.#pendingSemanticLineBuffer = '';
    this.#pendingSemanticLineUndecided = false;
    this.#suppressPendingSemanticLine = false;
    this.#sawLineStructuralBoundary = true;
  }

  #beginPendingTableLine(
    needsRowSeparator: boolean,
    hasHalfRowSeparator = false
  ): void {
    this.#pendingTableNeedsRowSeparator = needsRowSeparator;
    this.#pendingTablePendingPipe = false;
    this.#pendingTableCellWhitespace = '';
    this.#pendingTablePreviousCharacterWasBackslash = false;
    this.#pendingTableAtRowStart = true;
    this.#pendingTableCellIndex = 0;
    this.#pendingTableCurrentCellHasContent = false;
    this.#pendingTableCurrentCellMarkerEmitted = false;
    this.#pendingTableIgnoreRemainder = false;
    this.#pendingTableLineBuffer = '';
    this.#pendingTableLineDecided = false;
    this.#pendingTableOnDelimiterLine = false;
    this.#pendingTableHasHalfRowSeparator = hasHalfRowSeparator;
  }

  #startPendingTableRow(emit: boolean): void {
    if (emit && this.#pendingTableNeedsRowSeparator) {
      this.#pendingLineDirectionStream.push('\n');
      if (this.#pendingTableHasHalfRowSeparator) {
        this.#pendingLineCurrentParagraphIndex += 1;
      }
    }
    this.#pendingTableNeedsRowSeparator = false;
    this.#pendingTableHasHalfRowSeparator = false;
    this.#pendingTableAtRowStart = false;
  }

  #advancePendingTableCell(emit: boolean, empty = false): void {
    this.#pendingTableCellIndex += 1;
    this.#pendingTableIgnoreRemainder = this.#pendingTableColumns > 0
      && this.#pendingTableCellIndex >= this.#pendingTableColumns;
    this.#pendingTableCurrentCellHasContent = false;
    this.#pendingTableCurrentCellMarkerEmitted = false;
    if (emit && !this.#pendingTableIgnoreRemainder) {
      this.#pendingLineDirectionStream.push('\n\n');
      this.#pendingLineCurrentParagraphIndex += 1;
    }
    if (empty) this.#emitPendingEmptyTableCell(emit);
  }

  #emitPendingEmptyTableCell(emit: boolean): void {
    if (this.#pendingTableIgnoreRemainder
      || this.#pendingTableCurrentCellHasContent
      || this.#pendingTableCurrentCellMarkerEmitted) return;
    this.#pendingTableCellWhitespace = '';
    this.#pendingTableCurrentCellMarkerEmitted = true;
    if (emit) {
      this.#pendingLineDirectionStream.push(EMPTY_TABLE_CELL_MARKER);
      this.#pendingTableEmptyMarkerParagraphIndexes.add(
        this.#pendingLineCurrentParagraphIndex
      );
    }
  }

  #pushPendingTableCellCharacter(rawCharacter: string, emit: boolean): void {
    const character = rawCharacter === '\u0000' ? '\uFFFD' : rawCharacter;
    if (character === '|' && this.#pendingTablePreviousCharacterWasBackslash) {
      if (this.#pendingTableAtRowStart) this.#startPendingTableRow(emit);
      if (emit && !this.#pendingTableIgnoreRemainder) {
        this.#pendingLineDirectionStream.push(character);
      }
      this.#pendingTableCurrentCellHasContent = true;
      this.#pendingTablePreviousCharacterWasBackslash = false;
      return;
    }
    if (character === '|') {
      this.#pendingTablePreviousCharacterWasBackslash = false;
      if (this.#pendingTableAtRowStart) {
        this.#startPendingTableRow(emit);
        return;
      }
      if (this.#pendingTablePendingPipe) {
        this.#emitPendingEmptyTableCell(emit);
        this.#advancePendingTableCell(emit, true);
      }
      this.#pendingTablePendingPipe = true;
      this.#pendingTableCellWhitespace = '';
      return;
    }

    this.#pendingTablePreviousCharacterWasBackslash = character === '\\';
    if (this.#pendingTableAtRowStart) this.#startPendingTableRow(emit);
    if (this.#pendingTablePendingPipe) {
      if (/^[ \t]$/u.test(character)) {
        this.#pendingTableCellWhitespace += character;
        return;
      }
      this.#emitPendingEmptyTableCell(emit);
      this.#advancePendingTableCell(emit);
      this.#pendingTablePendingPipe = false;
      this.#pendingTableCurrentCellHasContent = true;
      if (emit && !this.#pendingTableIgnoreRemainder) {
        this.#pendingLineDirectionStream.push(character);
      }
      this.#pendingTableCellWhitespace = '';
      return;
    }
    if (/^[ \t]$/u.test(character)) {
      this.#pendingTableCellWhitespace += character;
      return;
    }
    const internalWhitespace = this.#pendingTableCurrentCellHasContent
      ? this.#pendingTableCellWhitespace
      : '';
    this.#pendingTableCurrentCellHasContent = true;
    if (emit && !this.#pendingTableIgnoreRemainder) {
      this.#pendingLineDirectionStream.push(`${internalWhitespace}${character}`);
    }
    this.#pendingTableCellWhitespace = '';
  }

  #activatePendingTable(
    rawHeader: string,
    rawDelimiter: string,
    header: TableLineView,
    delimiter: TableLineView
  ): void {
    const snapshot = this.#pendingLineDirectionStream.snapshot();
    const delimiterStart = snapshot.text.lastIndexOf(rawDelimiter);
    const headerStart = delimiterStart < 0
      ? -1
      : snapshot.text.lastIndexOf(rawHeader, delimiterStart);
    if (headerStart < 0) return;
    const cells = tableCells(header.content).cells;
    this.#pendingLineDirectionStream.reset(snapshot.text.slice(0, headerStart));
    this.#pendingLineCurrentParagraphIndex =
      this.#pendingLineDirectionStream.snapshot().currentParagraph.index;
    cells.forEach((rawCell, index) => {
      if (index > 0) {
        this.#pendingLineDirectionStream.push('\n\n');
        this.#pendingLineCurrentParagraphIndex += 1;
      }
      const cell = rawCell.replaceAll('\u0000', '\uFFFD');
      if (cell.length > 0) {
        this.#pendingLineDirectionStream.push(cell);
      } else {
        this.#pendingLineDirectionStream.push(EMPTY_TABLE_CELL_MARKER);
        this.#pendingTableEmptyMarkerParagraphIndexes.add(
          this.#pendingLineCurrentParagraphIndex
        );
      }
    });
    // The source line ending is the first half of the blank separator that
    // will precede the first body row.
    this.#pendingLineDirectionStream.push('\n');
    this.#pendingTableHasHalfRowSeparator = true;
    this.#pendingTable = true;
    this.#pendingTableColumns = cells.length;
    this.#pendingTableContainerDepth = delimiter.blockquoteDepth;
    this.#pendingBlockContext = 'table';
    this.#pendingBlockquoteDepth = delimiter.blockquoteDepth;
    this.#pendingSemanticLineBuffer = '';
    this.#pendingSemanticLineUndecided = false;
    this.#suppressPendingSemanticLine = false;
    this.#sawLineStructuralBoundary = true;
  }

  #restorePendingTableLineState(): void {
    if (!this.#pendingTable) return;
    this.#sawLineStructuralBoundary = true;
    const rawLine = this.#currentRawLineParts.join('');
    if (rawLine.length === 0) {
      // The parsed document already owns the preceding row and its line
      // ending. The fresh pending stream starts at the next cell, so injecting
      // another newline would become public cell text instead of a separator.
      this.#beginPendingTableLine(false);
      return;
    }
    const activeBlock = semanticBlocks(this.#document).at(-1);
    const headerView = tableLineView(this.#previousRawLine, this.#pendingListContentIndent);
    const delimiterView = tableLineView(rawLine, this.#pendingListContentIndent);
    if (activeBlock?.tokenType === 'th_open'
      && headerView
      && delimiterView
      && headerView.blockquoteDepth === delimiterView.blockquoteDepth
      && isTableDelimiter(headerView.content, delimiterView.content)) {
      this.#beginPendingTableLine(false);
      this.#pendingTableOnDelimiterLine = true;
      this.#pendingTableLineDecided = true;
      return;
    }
    const view = tableLineView(rawLine, this.#pendingListContentIndent);
    if (!view || view.blockquoteDepth !== this.#pendingTableContainerDepth) return;
    this.#beginPendingTableLine(false);
    this.#pendingTableLineDecided = true;
    for (const character of view.content) {
      this.#pushPendingTableCellCharacter(character, false);
    }
    const lineStart = this.#source.length - rawLine.length;
    const blocks = semanticBlocks(this.#document);
    const rowCells = blocks.filter((block) => (block.tokenType === 'th_open'
      || block.tokenType === 'td_open')
      && block.sourceRange.start === lineStart);
    if (rowCells.length === 0) return;
    const currentCell = rowCells[Math.min(this.#pendingTableCellIndex, rowCells.length - 1)];
    if (!currentCell) return;
    const replaceFrom = blocks.indexOf(currentCell);
    if (replaceFrom < 0) return;
    if (currentCell.text.length === 0) {
      // A parsed unfinished row pads missing cells speculatively. Keep the
      // active cell genuinely empty so later content can fill it; synthesize
      // a marker only if a separator or line ending actually closes it empty.
      this.#pendingLineDirectionStream.reset('');
      this.#pendingLineCurrentParagraphIndex =
        this.#pendingLineDirectionStream.snapshot().currentParagraph.index;
      this.#pendingTableCurrentCellMarkerEmitted = false;
    } else {
      this.#pendingLineDirectionStream.reset(currentCell.text);
      this.#pendingLineCurrentParagraphIndex =
        this.#pendingLineDirectionStream.snapshot().currentParagraph.index;
    }
    this.#pendingLineReplaceFromBlockIndex = replaceFrom;
    this.#pendingLineHasSeed = true;
    this.#pendingLineReplacesActive = true;
  }

  #flushPendingSemanticLine(complete: boolean): void {
    if (!this.#pendingSemanticLineUndecided) return;
    const buffer = this.#pendingSemanticLineBuffer;
    const relative = listRelativeLine(buffer, this.#pendingListContentIndent);
    const continuesBlockquoteParagraph = this.#pendingBlockContext === 'blockquote'
      && relative.blockquoteDepth === this.#pendingBlockquoteDepth;
    const kind = structuralLineKind(
      buffer,
      this.#currentLineContinuesParagraph,
      complete,
      continuesBlockquoteParagraph,
      this.#markdownIt.options.html === true,
      this.#pendingListContentIndent
    );
    if (!complete
      && kind === null
      && couldBecomeStructuralLine(
        buffer,
        this.#markdownIt.options.html === true,
        this.#pendingListContentIndent
      )) return;

    const hasContent = /\S/u.test(buffer);
    const emptyBlockquoteLine = complete
      && kind === 'blockquote'
      && relative.content.trim().length === 0;
    if (emptyBlockquoteLine) {
      this.#currentSemanticLineKind = kind;
      this.#pendingSemanticLineBuffer = '';
      this.#pendingSemanticLineUndecided = false;
      return;
    }
    if (kind === 'boundary') {
      this.#currentSemanticLineKind = kind;
      this.#pendingSemanticLineBuffer = '';
      this.#pendingSemanticLineUndecided = false;
      this.#suppressPendingSemanticLine = true;
      this.#sawLineStructuralBoundary = true;
      return;
    }
    const needsSeparator = kind === 'heading'
      || kind === 'list'
      || kind === 'fence'
      || (kind === 'code' && this.#pendingBlockContext !== 'code')
      || (kind === 'blockquote'
        && (relative.blockquoteDepth !== this.#pendingBlockquoteDepth
          || (this.#pendingBlockContext !== 'blockquote'
            && this.#pendingBlockContext !== 'list')))
      || (kind === null
        && hasContent
        && (this.#pendingBlockContext === 'code' || this.#pendingBlockContext === 'heading'));
    if (needsSeparator) {
      this.#pendingLineDirectionStream.push('\n');
      this.#sawLineStructuralBoundary = true;
    }
    this.#currentSemanticLineKind = kind;
    this.#pendingLineDirectionStream.push(buffer);
    this.#pendingSemanticLineBuffer = '';
    this.#pendingSemanticLineUndecided = false;
  }

  #updatePendingBlockContext(
    kind: StructuralLineKind | null,
    lineWasBlank: boolean,
    blockquoteDepth: number
  ): void {
    if (lineWasBlank) {
      if (this.#pendingBlockContext === 'list') return;
      this.#pendingBlockContext = null;
      this.#pendingBlockquoteDepth = 0;
      this.#pendingListContentIndent = 0;
      return;
    }
    if (kind === 'blockquote') {
      if (this.#pendingBlockContext !== 'list'
        || blockquoteDepth !== this.#pendingBlockquoteDepth) {
        this.#pendingBlockContext = 'blockquote';
      }
      this.#pendingBlockquoteDepth = blockquoteDepth;
    } else if (kind === 'code' || kind === 'heading' || kind === 'list') {
      this.#pendingBlockContext = kind;
      this.#pendingBlockquoteDepth = blockquoteDepth;
      this.#pendingListContentIndent = kind === 'list'
        ? listContentIndentForLine(this.#pendingLinePrefix)
        : 0;
    } else if (kind === 'boundary' || kind === 'fence') {
      this.#pendingBlockContext = null;
      this.#pendingBlockquoteDepth = 0;
      this.#pendingListContentIndent = 0;
    } else if (this.#pendingBlockContext === 'code' || this.#pendingBlockContext === 'heading') {
      this.#pendingBlockContext = null;
      this.#pendingBlockquoteDepth = 0;
      this.#pendingListContentIndent = 0;
    }
  }

  #advanceFenceLine(character: string): void {
    if (!this.#openFence || this.#fenceLinePhase === 'invalid') return;
    if (this.#fenceLinePhase === 'container') {
      if (character === ' ' || character === '\t' || character === '>') return;
      if (character === this.#openFence.marker) {
        this.#fenceLinePhase = 'marker';
        this.#fenceMarkerCount = 1;
      } else {
        this.#fenceLinePhase = 'invalid';
      }
      return;
    }
    if (this.#fenceLinePhase === 'marker') {
      if (character === this.#openFence.marker) this.#fenceMarkerCount += 1;
      else if (character === ' ' || character === '\t') this.#fenceLinePhase = 'trailing';
      else this.#fenceLinePhase = 'invalid';
      return;
    }
    if (character !== ' ' && character !== '\t') this.#fenceLinePhase = 'invalid';
  }

  #currentLineClosesFence(): boolean {
    return this.#openFence !== null
      && (this.#fenceLinePhase === 'marker' || this.#fenceLinePhase === 'trailing')
      && this.#fenceMarkerCount >= this.#openFence.length;
  }

  #currentLineStructuralKind(complete = false): StructuralLineKind | null {
    return !this.#openFence && this.#pendingLineRelevant
      ? structuralLineKind(
          this.#pendingLinePrefix,
          this.#currentLineContinuesParagraph,
          complete,
          this.#pendingBlockContext === 'blockquote'
            && containerRelativeLine(this.#pendingLinePrefix).blockquoteDepth
              === this.#pendingBlockquoteDepth,
          this.#markdownIt.options.html === true,
          this.#pendingListContentIndent
        )
      : null;
  }

  #resetFenceLine(): void {
    this.#fenceLinePhase = 'container';
    this.#fenceMarkerCount = 0;
  }
}
