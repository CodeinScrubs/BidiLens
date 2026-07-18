import { detectDirection, planInlineIsolation, type DetectionOptions, type Direction } from '@bidilens/core';

export const BIDILENS_CSS = `
[data-bidilens-block] {
  text-align: start;
}
[data-bidilens-isolate],
bdi {
  unicode-bidi: isolate;
}
[data-bidilens-code] {
  direction: ltr;
  text-align: left;
  unicode-bidi: isolate;
}
[data-bidilens-block] table {
  direction: inherit;
}
[data-bidilens-block] th,
[data-bidilens-block] td {
  text-align: start;
}
`;

const DEFAULT_BLOCK_SELECTOR = [
  'p', 'li', 'blockquote', 'dd', 'dt', 'figcaption',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'td', 'th', '[data-bidilens-candidate]'
].join(',');

const DEFAULT_CODE_SELECTOR = 'pre, code, kbd, samp, var, [data-bidilens-code]';

export interface ApplyBidiOptions extends DetectionOptions {
  blockSelector?: string;
  codeSelector?: string;
  fallback?: Direction;
  includeRoot?: boolean;
  markAttribute?: string;
  skipSelector?: string;
  onAnnotated?: (element: HTMLElement, direction: Direction) => void;
  /** Wrap technical and opposite-direction text runs in semantic bdi nodes. */
  isolateInline?: boolean;
}

export interface ApplyBidiResult {
  scanned: number;
  annotated: number;
  rtl: number;
  ltr: number;
  neutral: number;
  isolated: number;
}

interface OriginalElementState {
  attributes: Map<string, string | null>;
}

const originalStates = new WeakMap<HTMLElement, OriginalElementState>();

function rememberState(element: HTMLElement, attributes: readonly string[]): void {
  let state = originalStates.get(element);
  if (!state) {
    state = { attributes: new Map([['style', element.getAttribute('style')]]) };
    originalStates.set(element, state);
  }
  for (const attribute of attributes) {
    if (!state.attributes.has(attribute)) state.attributes.set(attribute, element.getAttribute(attribute));
  }
}

function isHTMLElement(value: Element): value is HTMLElement {
  const constructor = value.ownerDocument.defaultView?.HTMLElement;
  return constructor ? value instanceof constructor : value.nodeType === 1;
}

function textForDirection(element: HTMLElement, codeSelector: string): string {
  if (element.matches(codeSelector)) return element.textContent ?? '';
  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(codeSelector).forEach((node) => node.remove());
  return clone.textContent ?? element.textContent ?? '';
}

function annotateCode(root: ParentNode, selector: string): void {
  root.querySelectorAll(selector).forEach((node) => {
    if (!isHTMLElement(node)) return;
    rememberState(node, ['dir', 'data-bidilens-code']);
    node.dir = 'ltr';
    node.dataset.bidilensCode = '';
    node.style.unicodeBidi = 'isolate';
  });
}

function isolateInlineText(
  element: HTMLElement,
  direction: 'ltr' | 'rtl',
  blockSelector: string,
  codeSelector: string
): number {
  const documentRef = element.ownerDocument;
  const showText = documentRef.defaultView?.NodeFilter.SHOW_TEXT ?? 4;
  const walker = documentRef.createTreeWalker(element, showText);
  const textNodes: Text[] = [];
  let current: Node | null;
  while ((current = walker.nextNode()) !== null) {
    if (current.nodeType !== 3) continue;
    const parent = current.parentElement;
    if (!parent || parent.closest('[data-bidilens-isolate],bdi,script,style,textarea')) continue;
    if (parent.closest(codeSelector)) continue;
    if (parent.closest(blockSelector) !== element) continue;
    textNodes.push(current as Text);
  }

  let isolated = 0;
  for (const node of textNodes) {
    const source = node.data;
    const plans = planInlineIsolation(source, direction);
    if (!plans.length) continue;
    const fragment = documentRef.createDocumentFragment();
    let cursor = 0;
    for (const plan of plans) {
      fragment.append(documentRef.createTextNode(source.slice(cursor, plan.start)));
      const isolate = documentRef.createElement('bdi');
      isolate.dir = plan.direction;
      isolate.dataset.bidilensIsolate = '';
      isolate.dataset.bidilensKind = plan.kind;
      isolate.dataset.bidilensDomGenerated = '';
      isolate.textContent = plan.text;
      fragment.append(isolate);
      cursor = plan.end;
      isolated += 1;
    }
    fragment.append(documentRef.createTextNode(source.slice(cursor)));
    node.replaceWith(fragment);
  }
  return isolated;
}

export function applyBidi(root: ParentNode, options: ApplyBidiOptions = {}): ApplyBidiResult {
  const blockSelector = options.blockSelector ?? DEFAULT_BLOCK_SELECTOR;
  const codeSelector = options.codeSelector ?? DEFAULT_CODE_SELECTOR;
  const markAttribute = options.markAttribute ?? 'data-bidilens-block';
  const candidates = [...root.querySelectorAll(blockSelector)];

  if (options.includeRoot && root.nodeType === 1) {
    const element = root as Element;
    if (isHTMLElement(element) && element.matches(blockSelector)) candidates.unshift(element);
  }

  annotateCode(root, codeSelector);

  const result: ApplyBidiResult = { scanned: 0, annotated: 0, rtl: 0, ltr: 0, neutral: 0, isolated: 0 };

  for (const candidate of candidates) {
    if (!isHTMLElement(candidate)) continue;
    if (options.skipSelector && candidate.closest(options.skipSelector)) continue;
    if (candidate.matches(codeSelector)) continue;

    result.scanned += 1;
    const detection: DetectionOptions = { fallback: options.fallback ?? 'ltr' };
    if (options.strategy !== undefined) detection.strategy = options.strategy;
    if (options.minimumStrongCharacters !== undefined) detection.minimumStrongCharacters = options.minimumStrongCharacters;
    if (options.majorityThreshold !== undefined) detection.majorityThreshold = options.majorityThreshold;
    if (options.inheritedDirection !== undefined) detection.inheritedDirection = options.inheritedDirection;
    if (options.excludeTechnicalTokens !== undefined) detection.excludeTechnicalTokens = options.excludeTechnicalTokens;
    const direction = detectDirection(textForDirection(candidate, codeSelector), detection);

    rememberState(candidate, ['dir', markAttribute]);
    candidate.setAttribute(markAttribute, '');
    if (direction === 'neutral') {
      candidate.removeAttribute('dir');
      result.neutral += 1;
    } else {
      candidate.dir = direction;
      // `unicode-bidi: plaintext` re-runs first-strong detection in the
      // browser and can override the content-majority decision above.
      // Explicit `dir` is the block base direction; isolate inline runs.
      candidate.style.unicodeBidi = '';
      if (direction === 'rtl') result.rtl += 1;
      else result.ltr += 1;
      if (options.isolateInline ?? true) {
        result.isolated += isolateInlineText(candidate, direction, blockSelector, codeSelector);
      }
    }
    result.annotated += 1;
    options.onAnnotated?.(candidate, direction);
  }

  return result;
}

export interface RestoreBidiOptions {
  /** Restore the root element itself in addition to descendants. */
  includeRoot?: boolean;
}

/** Restores attributes/styles and unwraps only nodes generated by applyBidi. */
export function restoreBidi(root: ParentNode, options: RestoreBidiOptions = {}): number {
  const generated = [...root.querySelectorAll<HTMLElement>('[data-bidilens-dom-generated]')];
  for (const isolate of generated) isolate.replaceWith(isolate.ownerDocument.createTextNode(isolate.textContent ?? ''));

  const elements: HTMLElement[] = [...root.querySelectorAll('*')].filter(isHTMLElement);
  if (options.includeRoot && root.nodeType === 1 && isHTMLElement(root as Element)) elements.unshift(root as HTMLElement);
  let restored = 0;
  for (const element of elements) {
    const state = originalStates.get(element);
    if (!state) continue;
    for (const [attribute, value] of state.attributes) {
      if (value === null) element.removeAttribute(attribute);
      else element.setAttribute(attribute, value);
    }
    originalStates.delete(element);
    restored += 1;
  }
  if (root.nodeType === 1) (root as Element).normalize();
  else root.normalize();
  return restored;
}

export interface ObserveBidiOptions extends ApplyBidiOptions {
  debounceMs?: number;
  characterData?: boolean;
}

export interface BidiObserver {
  observer: MutationObserver;
  flush: () => ApplyBidiResult;
  disconnect: () => void;
}

export function observeBidi(root: HTMLElement, options: ObserveBidiOptions = {}): BidiObserver {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastResult = applyBidi(root, options);

  const flush = (): ApplyBidiResult => {
    if (timer) clearTimeout(timer);
    timer = undefined;
    lastResult = applyBidi(root, options);
    return lastResult;
  };

  const Observer = root.ownerDocument.defaultView?.MutationObserver ?? globalThis.MutationObserver;
  if (!Observer) throw new Error('MutationObserver is unavailable in this DOM environment.');
  const observer = new Observer(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, options.debounceMs ?? 16);
  });

  observer.observe(root, {
    subtree: true,
    childList: true,
    characterData: options.characterData ?? true
  });

  return {
    observer,
    flush,
    disconnect: () => {
      if (timer) clearTimeout(timer);
      observer.disconnect();
    }
  };
}

export function installBidiStyles(documentRef: Document = document): HTMLStyleElement {
  const existing = documentRef.querySelector<HTMLStyleElement>('style[data-bidilens-styles]');
  if (existing) return existing;
  const style = documentRef.createElement('style');
  style.dataset.bidilensStyles = '';
  style.textContent = BIDILENS_CSS;
  documentRef.head.append(style);
  return style;
}
