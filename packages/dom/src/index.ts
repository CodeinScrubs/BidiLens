import {
  detectDirection,
  needsBidiIntervention,
  planInlineIsolation,
  type BidiInterventionMode,
  type DetectionOptions,
  type Direction,
  type ResolvedDirection
} from '@bidilens/core';

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
  /** `auto` avoids every DOM mutation when the scanned scope is LTR-only. */
  intervention?: BidiInterventionMode;
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
  applied: Map<string, string | null>;
  style: {
    originalAttribute: string | null;
    originalDirection: string;
    originalDirectionPriority: string;
    originalUnicodeBidi: string;
    originalUnicodeBidiPriority: string;
    appliedWithoutOwnedProperties?: string;
    appliedDirection?: string;
    appliedDirectionPriority?: string;
    appliedUnicodeBidi?: string;
    appliedUnicodeBidiPriority?: string;
  };
}

interface OriginalDirectionState {
  /** The element's own CSS, rather than its parent, established its direction. */
  ownCssDirection: boolean;
  resolved: ResolvedDirection;
}

const originalStates = new WeakMap<HTMLElement, OriginalElementState>();
const originalDirections = new WeakMap<HTMLElement, OriginalDirectionState>();

function styleWithoutOwnedProperties(element: HTMLElement): string {
  const probe = element.ownerDocument.createElement('span');
  const attribute = element.getAttribute('style');
  if (attribute !== null) probe.setAttribute('style', attribute);
  probe.style.removeProperty('direction');
  probe.style.removeProperty('unicode-bidi');
  return probe.style.cssText;
}

function reconcileStyleBeforeApply(element: HTMLElement, state: OriginalElementState): void {
  if (state.style.appliedUnicodeBidi === undefined) return;
  const currentDirection = element.style.getPropertyValue('direction');
  const currentDirectionPriority = element.style.getPropertyPriority('direction');
  const directionChanged = currentDirection !== state.style.appliedDirection
    || currentDirectionPriority !== state.style.appliedDirectionPriority;
  const currentUnicodeBidi = element.style.getPropertyValue('unicode-bidi');
  const currentPriority = element.style.getPropertyPriority('unicode-bidi');
  const unicodeBidiChanged = currentUnicodeBidi !== state.style.appliedUnicodeBidi
    || currentPriority !== state.style.appliedUnicodeBidiPriority;
  const otherStyleChanged = styleWithoutOwnedProperties(element) !== state.style.appliedWithoutOwnedProperties;
  if (!directionChanged && !unicodeBidiChanged && !otherStyleChanged) return;

  if (!directionChanged) {
    if (state.style.originalDirection) {
      element.style.setProperty(
        'direction',
        state.style.originalDirection,
        state.style.originalDirectionPriority
      );
    } else element.style.removeProperty('direction');
  }
  if (!unicodeBidiChanged) {
    if (state.style.originalUnicodeBidi) {
      element.style.setProperty(
        'unicode-bidi',
        state.style.originalUnicodeBidi,
        state.style.originalUnicodeBidiPriority
      );
    } else element.style.removeProperty('unicode-bidi');
  }
  state.style.originalAttribute = element.getAttribute('style');
  state.style.originalDirection = element.style.getPropertyValue('direction');
  state.style.originalDirectionPriority = element.style.getPropertyPriority('direction');
  state.style.originalUnicodeBidi = element.style.getPropertyValue('unicode-bidi');
  state.style.originalUnicodeBidiPriority = element.style.getPropertyPriority('unicode-bidi');
  delete state.style.appliedWithoutOwnedProperties;
  delete state.style.appliedDirection;
  delete state.style.appliedDirectionPriority;
  delete state.style.appliedUnicodeBidi;
  delete state.style.appliedUnicodeBidiPriority;
}

function rememberState(element: HTMLElement, attributes: readonly string[]): void {
  let state = originalStates.get(element);
  if (!state) {
    state = {
      attributes: new Map(),
      applied: new Map(),
      style: {
        originalAttribute: element.getAttribute('style'),
        originalDirection: element.style.getPropertyValue('direction'),
        originalDirectionPriority: element.style.getPropertyPriority('direction'),
        originalUnicodeBidi: element.style.getPropertyValue('unicode-bidi'),
        originalUnicodeBidiPriority: element.style.getPropertyPriority('unicode-bidi')
      }
    };
    originalStates.set(element, state);
  }
  reconcileStyleBeforeApply(element, state);
  for (const attribute of attributes) {
    if (state.applied.has(attribute)
      && element.getAttribute(attribute) !== state.applied.get(attribute)) {
      state.attributes.set(attribute, element.getAttribute(attribute));
      state.applied.delete(attribute);
    }
    if (!state.attributes.has(attribute)) state.attributes.set(attribute, element.getAttribute(attribute));
  }
}

function markApplied(element: HTMLElement, attributes: readonly string[]): void {
  const state = originalStates.get(element);
  if (!state) return;
  for (const attribute of attributes) {
    if (attribute === 'style') {
      state.style.appliedWithoutOwnedProperties = styleWithoutOwnedProperties(element);
      state.style.appliedDirection = element.style.getPropertyValue('direction');
      state.style.appliedDirectionPriority = element.style.getPropertyPriority('direction');
      state.style.appliedUnicodeBidi = element.style.getPropertyValue('unicode-bidi');
      state.style.appliedUnicodeBidiPriority = element.style.getPropertyPriority('unicode-bidi');
    } else state.applied.set(attribute, element.getAttribute(attribute));
  }
}

function restoreElementState(element: HTMLElement): boolean {
  const state = originalStates.get(element);
  if (!state) return false;
  for (const [attribute, value] of state.attributes) {
    const applied = state.applied.get(attribute);
    if (state.applied.has(attribute) && element.getAttribute(attribute) !== applied) continue;
    if (value === null) element.removeAttribute(attribute);
    else element.setAttribute(attribute, value);
  }
  if (state.style.appliedUnicodeBidi !== undefined) {
    const directionUnchanged = element.style.getPropertyValue('direction') === state.style.appliedDirection
      && element.style.getPropertyPriority('direction') === state.style.appliedDirectionPriority;
    const unicodeBidiUnchanged = element.style.getPropertyValue('unicode-bidi') === state.style.appliedUnicodeBidi
      && element.style.getPropertyPriority('unicode-bidi') === state.style.appliedUnicodeBidiPriority;
    const otherStyleUnchanged = styleWithoutOwnedProperties(element) === state.style.appliedWithoutOwnedProperties;
    if (directionUnchanged && unicodeBidiUnchanged && otherStyleUnchanged) {
      if (state.style.originalAttribute === null) element.removeAttribute('style');
      else element.setAttribute('style', state.style.originalAttribute);
    } else {
      if (directionUnchanged) {
        if (state.style.originalDirection) {
          element.style.setProperty(
            'direction',
            state.style.originalDirection,
            state.style.originalDirectionPriority
          );
        } else element.style.removeProperty('direction');
      }
      if (unicodeBidiUnchanged) {
        if (state.style.originalUnicodeBidi) {
          element.style.setProperty(
            'unicode-bidi',
            state.style.originalUnicodeBidi,
            state.style.originalUnicodeBidiPriority
          );
        } else element.style.removeProperty('unicode-bidi');
      }
    }
  }
  originalStates.delete(element);
  originalDirections.delete(element);
  return true;
}

function isHTMLElement(value: Element): value is HTMLElement {
  const constructor = value.ownerDocument.defaultView?.HTMLElement;
  return constructor ? value instanceof constructor : value.nodeType === 1;
}

function inheritedDirection(element: HTMLElement): ResolvedDirection {
  let current: HTMLElement | null = element;
  while (current) {
    const state = originalStates.get(current);
    const authoredDir = state?.attributes.has('dir')
      ? state.attributes.get('dir')
      : current.getAttribute('dir');
    if (authoredDir?.toLowerCase() === 'rtl') return 'rtl';
    if (authoredDir?.toLowerCase() === 'ltr') return 'ltr';
    if (authoredDir?.toLowerCase() === 'auto') {
      const parentDirection = current.parentElement ? inheritedDirection(current.parentElement) : 'ltr';
      const auto = detectDirection(current.textContent ?? '', {
        strategy: 'first-strong',
        fallback: parentDirection
      });
      return auto === 'rtl' ? 'rtl' : 'ltr';
    }
    current = current.parentElement;
  }

  const original = originalDirections.get(element);
  if (original) {
    if (!original.ownCssDirection) {
      return element.parentElement ? inheritedDirection(element.parentElement) : 'ltr';
    }
    const state = originalStates.get(element);
    if (state?.style.appliedDirection !== undefined
      && (element.style.getPropertyValue('direction') !== state.style.appliedDirection
        || element.style.getPropertyPriority('direction') !== state.style.appliedDirectionPriority)) {
      const authored = element.style.getPropertyValue('direction');
      if (authored === 'rtl' || authored === 'ltr') return authored;
      return element.parentElement ? inheritedDirection(element.parentElement) : 'ltr';
    }
    if (state?.style.originalDirection === 'rtl' || state?.style.originalDirection === 'ltr') {
      return state.style.originalDirection;
    }
    return original.resolved;
  }
  const view = element.ownerDocument.defaultView;
  return view?.getComputedStyle(element).direction === 'rtl' ? 'rtl' : 'ltr';
}

function rememberOriginalDirection(element: HTMLElement, direction: ResolvedDirection): void {
  if (originalDirections.has(element)) return;
  const parentDirection = element.parentElement ? inheritedDirection(element.parentElement) : 'ltr';
  originalDirections.set(element, {
    ownCssDirection: direction !== parentDirection,
    resolved: direction
  });
}

function textForDirection(element: HTMLElement, codeSelector: string): string {
  if (element.matches(codeSelector)) return element.textContent ?? '';
  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(codeSelector).forEach((node) => node.remove());
  return clone.textContent ?? element.textContent ?? '';
}

function annotateCode(element: HTMLElement, hostDirection = inheritedDirection(element)): void {
  rememberOriginalDirection(element, hostDirection);
  rememberState(element, ['dir', 'data-bidilens-code']);
  element.dir = 'ltr';
  element.dataset.bidilensCode = '';
  element.style.direction = 'ltr';
  element.style.unicodeBidi = 'isolate';
  markApplied(element, ['dir', 'data-bidilens-code', 'style']);
}

function restoreOwnedSubtree(root: HTMLElement): number {
  const generated = [...root.querySelectorAll<HTMLElement>('[data-bidilens-dom-generated]')];
  for (const isolate of generated) {
    isolate.replaceWith(isolate.ownerDocument.createTextNode(isolate.textContent ?? ''));
  }
  const elements = [root, ...root.querySelectorAll<HTMLElement>('*')];
  let restored = 0;
  for (const element of elements) {
    if (restoreElementState(element)) restored += 1;
  }
  if (generated.length > 0 || restored > 0) root.normalize();
  return restored;
}

function isolateInlineText(
  element: HTMLElement,
  direction: 'ltr' | 'rtl',
  blockSelector: string,
  codeSelector: string,
  intervention: BidiInterventionMode | undefined
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
    const plans = planInlineIsolation(source, direction, { intervention });
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

  const result: ApplyBidiResult = { scanned: 0, annotated: 0, rtl: 0, ltr: 0, neutral: 0, isolated: 0 };
  const candidateSet = new Set(candidates);

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
    const directionalText = textForDirection(candidate, codeSelector);
    const direction = detectDirection(directionalText, detection);
    const hostDirection = options.inheritedDirection ?? inheritedDirection(candidate);
    const shouldIntervene = direction === 'rtl' || needsBidiIntervention(candidate.textContent ?? '', {
      intervention: options.intervention,
      inheritedDirection: hostDirection
    });
    if (!shouldIntervene) {
      restoreOwnedSubtree(candidate);
      continue;
    }

    rememberOriginalDirection(candidate, hostDirection);
    candidate.querySelectorAll(codeSelector).forEach((node) => {
      if (isHTMLElement(node)) annotateCode(node, hostDirection);
    });

    rememberState(candidate, ['dir', markAttribute]);
    candidate.setAttribute(markAttribute, '');
    if (direction === 'neutral') {
      candidate.removeAttribute('dir');
      result.neutral += 1;
    } else {
      candidate.dir = direction;
      candidate.style.direction = direction;
      // `unicode-bidi: plaintext` re-runs first-strong detection in the
      // browser and can override the content-majority decision above.
      // Explicit `dir` is the block base direction; isolate inline runs.
      candidate.style.unicodeBidi = '';
      if (direction === 'rtl') result.rtl += 1;
      else result.ltr += 1;
      if (options.isolateInline ?? true) {
        result.isolated += isolateInlineText(candidate, direction, blockSelector, codeSelector, options.intervention);
      }
    }
    markApplied(candidate, ['dir', markAttribute, 'style']);
    result.annotated += 1;
    options.onAnnotated?.(candidate, direction);
  }

  root.querySelectorAll(codeSelector).forEach((node) => {
    if (!isHTMLElement(node)) return;
    const owner = node.closest(blockSelector);
    if (owner && candidateSet.has(owner)) return;
    const hostDirection = options.inheritedDirection ?? inheritedDirection(node);
    if (needsBidiIntervention(node.textContent ?? '', {
      intervention: options.intervention,
      inheritedDirection: hostDirection
    })) annotateCode(node, hostDirection);
    else restoreOwnedSubtree(node);
  });

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
    if (restoreElementState(element)) restored += 1;
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
