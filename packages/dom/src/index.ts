import { detectDirection, type DetectionOptions, type Direction } from '@bidilens/core';

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
}

export interface ApplyBidiResult {
  scanned: number;
  annotated: number;
  rtl: number;
  ltr: number;
  neutral: number;
}

function isHTMLElement(value: Element): value is HTMLElement {
  return value instanceof HTMLElement;
}

function textForDirection(element: HTMLElement): string {
  if (element.matches(DEFAULT_CODE_SELECTOR)) return element.textContent ?? '';
  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(DEFAULT_CODE_SELECTOR).forEach((node) => node.remove());
  return clone.textContent ?? element.textContent ?? '';
}

function annotateCode(root: ParentNode, selector: string): void {
  root.querySelectorAll(selector).forEach((node) => {
    if (!isHTMLElement(node)) return;
    node.dir = 'ltr';
    node.dataset.bidilensCode = '';
    node.style.unicodeBidi = 'isolate';
  });
}

export function applyBidi(root: ParentNode, options: ApplyBidiOptions = {}): ApplyBidiResult {
  const blockSelector = options.blockSelector ?? DEFAULT_BLOCK_SELECTOR;
  const codeSelector = options.codeSelector ?? DEFAULT_CODE_SELECTOR;
  const markAttribute = options.markAttribute ?? 'data-bidilens-block';
  const candidates = [...root.querySelectorAll(blockSelector)];

  if (options.includeRoot && root instanceof HTMLElement && root.matches(blockSelector)) {
    candidates.unshift(root);
  }

  annotateCode(root, codeSelector);

  const result: ApplyBidiResult = { scanned: 0, annotated: 0, rtl: 0, ltr: 0, neutral: 0 };

  for (const candidate of candidates) {
    if (!isHTMLElement(candidate)) continue;
    if (options.skipSelector && candidate.matches(options.skipSelector)) continue;
    if (candidate.matches(codeSelector)) continue;

    result.scanned += 1;
    const detection: DetectionOptions = { fallback: options.fallback ?? 'ltr' };
    if (options.strategy !== undefined) detection.strategy = options.strategy;
    if (options.minimumStrongCharacters !== undefined) detection.minimumStrongCharacters = options.minimumStrongCharacters;
    if (options.majorityThreshold !== undefined) detection.majorityThreshold = options.majorityThreshold;
    if (options.inheritedDirection !== undefined) detection.inheritedDirection = options.inheritedDirection;
    if (options.excludeTechnicalTokens !== undefined) detection.excludeTechnicalTokens = options.excludeTechnicalTokens;
    const direction = detectDirection(textForDirection(candidate), detection);

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
    }
    result.annotated += 1;
    options.onAnnotated?.(candidate, direction);
  }

  return result;
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

  const observer = new MutationObserver(() => {
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
