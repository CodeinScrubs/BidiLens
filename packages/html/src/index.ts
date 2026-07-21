import {
  analyzeText,
  needsBidiIntervention,
  planInlineIsolation,
  type BidiInterventionMode,
  type DetectionOptions,
  type ResolvedDirection,
  type TextAnalysis
} from '@bidilens/core';

export interface RenderHtmlOptions extends DetectionOptions {
  blockTag?: string;
  containerTag?: string | false;
  blockClassName?: string;
  containerClassName?: string;
  includeDataAttributes?: boolean;
  /** Skip BidiLens markup for LTR-only text in an LTR context. */
  intervention?: BidiInterventionMode;
}

export interface RenderedHtmlBlock {
  text: string;
  html: string;
  direction: ResolvedDirection;
  start: number;
  end: number;
}

export interface RenderedBidiHtml {
  source: string;
  html: string;
  analysis: TextAnalysis;
  blocks: RenderedHtmlBlock[];
}

const SAFE_TAG = /^[a-z][a-z0-9-]*$/u;
const SAFE_BLOCK_TAGS = new Set([
  'address', 'article', 'aside', 'blockquote', 'dd', 'div', 'dt', 'figcaption',
  'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'li', 'main', 'nav',
  'p', 'pre', 'section', 'span', 'td', 'th'
]);
const SAFE_CONTAINER_TAGS = new Set([
  'article', 'aside', 'blockquote', 'div', 'footer', 'header', 'main', 'nav', 'section', 'span'
]);

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/gu, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character] ?? character));
}

function checkedTag(value: string, option: string, allowed: ReadonlySet<string>): string {
  const normalized = value.toLowerCase();
  if (!SAFE_TAG.test(normalized) || !allowed.has(normalized)) {
    throw new Error(`${option} must be an allowed non-executable HTML container tag.`);
  }
  return normalized;
}

function classAttribute(value: string | undefined): string {
  return value ? ` class="${escapeHtml(value)}"` : '';
}

export function renderInlineBidiHtml(
  source: string,
  direction: ResolvedDirection,
  options: {
    includeDataAttributes?: boolean;
    intervention?: BidiInterventionMode | undefined;
  } = {}
): string {
  const includeData = options.includeDataAttributes ?? true;
  const isolations = planInlineIsolation(source, direction, { intervention: options.intervention });
  let html = '';
  let cursor = 0;
  for (const isolation of isolations) {
    html += escapeHtml(source.slice(cursor, isolation.start));
    const tag = isolation.kind === 'code' ? 'code' : 'bdi';
    const data = includeData
      ? ` data-bidilens-isolate="" data-bidilens-kind="${isolation.kind}"${isolation.kind === 'code' ? ' data-bidilens-code=""' : ''}`
      : '';
    html += `<${tag} dir="${isolation.direction}"${data}>${escapeHtml(isolation.text)}</${tag}>`;
    cursor = isolation.end;
  }
  return html + escapeHtml(source.slice(cursor));
}

/** Serializes untrusted plain text; it never accepts or emits unescaped source HTML. */
export function renderBidiHtml(source: string, options: RenderHtmlOptions = {}): RenderedBidiHtml {
  const detection: DetectionOptions = { ...options, fallback: options.fallback ?? 'ltr' };
  const analysis = analyzeText(source, detection);
  const blockTag = checkedTag(options.blockTag ?? 'p', 'blockTag', SAFE_BLOCK_TAGS);
  const includeData = options.includeDataAttributes ?? true;
  const intervene = analysis.paragraphs.some((paragraph) => paragraph.direction === 'rtl')
    || needsBidiIntervention(source, {
      intervention: options.intervention,
      inheritedDirection: options.inheritedDirection
    });
  const blocks = analysis.paragraphs.map<RenderedHtmlBlock>((paragraph) => {
    const direction = paragraph.direction === 'neutral'
      ? (options.inheritedDirection ?? 'ltr')
      : paragraph.direction;
    const data = intervene && includeData ? ' data-bidilens-block=""' : '';
    const directionAttribute = intervene ? ` dir="${direction}"` : '';
    const blockClass = classAttribute(options.blockClassName);
    const inline = intervene
      ? renderInlineBidiHtml(paragraph.text, direction, {
          includeDataAttributes: includeData,
          intervention: options.intervention
        })
      : escapeHtml(paragraph.text);
    const html = `<${blockTag}${directionAttribute}${data}${blockClass}>${inline}</${blockTag}>`;
    return { text: paragraph.text, html, direction, start: paragraph.start, end: paragraph.end };
  });

  const serializedBlocks = blocks.map((block, index) => {
    const next = blocks[index + 1];
    const separator = next ? source.slice(block.end, next.start) : '';
    return `${block.html}${escapeHtml(separator)}`;
  }).join('');
  const automaticContainer = blocks.length > 1 ? 'div' : false;
  const container = options.containerTag === undefined ? automaticContainer : options.containerTag;
  const html = container === false
    ? serializedBlocks
    : (() => {
      const tag = checkedTag(container, 'containerTag', SAFE_CONTAINER_TAGS);
      const data = intervene && includeData ? ' data-bidilens-document=""' : '';
      const containerClass = classAttribute(options.containerClassName);
      return `<${tag}${data}${containerClass}>${serializedBlocks}</${tag}>`;
    })();
  return { source, html, analysis, blocks };
}
