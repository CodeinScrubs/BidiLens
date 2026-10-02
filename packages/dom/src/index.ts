import {
  detectDirection,
  needsBidiIntervention,
  type BidiInterventionMode,
  type DetectionOptions,
  type Direction,
  type ResolvedDirection
} from '@bidilens/core';
import { isolateInlineForest } from './inline.js';
import { preserveSelection } from './selection.js';
import { isInUnrenderedSubtree, renderedText } from './rendered.js';

export const BIDILENS_CSS = `
[data-bidilens-isolate],
bdi {
  unicode-bidi: isolate;
}
[data-bidilens-code] {
  direction: ltr;
  unicode-bidi: isolate;
}
[data-bidilens-block] table {
  direction: inherit;
}
`;

/** Default CSS selector for block-level elements scanned by BidiLens. */
export const DEFAULT_BLOCK_SELECTOR = [
  'p', 'li', 'blockquote', 'dd', 'dt', 'figcaption',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'td', 'th', '[data-bidilens-candidate]'
].join(',');

/** Default CSS selector for inline and block code elements isolated by BidiLens. */
export const DEFAULT_CODE_SELECTOR = 'pre, code, kbd, samp, var, [data-bidilens-code]';

export interface ApplyBidiOptions extends DetectionOptions {
  blockSelector?: string;
  codeSelector?: string;
  fallback?: Direction;
  includeRoot?: boolean;
  markAttribute?: string;
  /** Exclude matching regions and whole blocks/code containing a match. */
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
// Markup can be cloned or supplied by a host. Attributes alone are not proof
// that this adapter instance owns a node and may replace or unwrap it.
const generatedIsolates = new WeakSet<HTMLElement>();

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

function restoreOriginalInlineStyle(element: HTMLElement): void {
  const state = originalStates.get(element);
  if (!state) return;
  if (state.style.originalAttribute === null) element.removeAttribute('style');
  else element.setAttribute('style', state.style.originalAttribute);
}

function restoreOriginalAttribute(element: HTMLElement, attribute: string): void {
  const state = originalStates.get(element);
  if (!state?.attributes.has(attribute)) return;
  const value = state.attributes.get(attribute);
  if (value === null || value === undefined) element.removeAttribute(attribute);
  else element.setAttribute(attribute, value);
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
  const state = originalStates.get(element);
  if (state?.applied.has('dir') && element.getAttribute('dir') !== state.applied.get('dir')) {
    // An observable author handoff ends the old ownership session. Restore
    // only still-owned properties before reading the actual CSS cascade;
    // otherwise our inline direction can hide the author's replacement dir.
    restoreElementState(element);
    return inheritedDirection(element);
  }
  const authoredDir = (state?.applied.has('dir') && element.getAttribute('dir') === state.applied.get('dir')
    ? state.attributes.get('dir') : element.getAttribute('dir'))?.toLowerCase();
  const parent = (): ResolvedDirection => element.parentElement ? inheritedDirection(element.parentElement) : 'ltr';
  // Probe the actual selector context with still-owned direction properties
  // temporarily restored, including owned ancestors. A clone or cached value
  // misses author class/stylesheet changes and ancestor-dependent selectors.
  const snapshots: Array<{ element: HTMLElement; dir: string | null; style: string | null }> = [];
  let computed: string | undefined;
  try {
    for (let current: HTMLElement | null = element; current; current = current.parentElement) {
      const original = originalStates.get(current);
      if (!original) continue;
      reconcileStyleBeforeApply(current, original);
      snapshots.push({ element: current, dir: current.getAttribute('dir'), style: current.getAttribute('style') });
      if (original.applied.has('dir') && current.getAttribute('dir') === original.applied.get('dir')) restoreOriginalAttribute(current, 'dir');
      if (original.style.appliedDirection !== undefined && current.style.getPropertyValue('direction') === original.style.appliedDirection
        && current.style.getPropertyPriority('direction') === original.style.appliedDirectionPriority) {
        if (original.style.originalDirection) current.style.setProperty('direction', original.style.originalDirection, original.style.originalDirectionPriority);
        else current.style.removeProperty('direction');
      }
    }
    computed = element.ownerDocument.defaultView?.getComputedStyle(element).direction;
  } finally {
    for (const snapshot of snapshots.reverse()) {
      if (snapshot.dir === null) snapshot.element.removeAttribute('dir');
      else snapshot.element.setAttribute('dir', snapshot.dir);
      if (snapshot.style === null) snapshot.element.removeAttribute('style');
      else snapshot.element.setAttribute('style', snapshot.style);
    }
  }
  if (computed === 'rtl' || computed === 'ltr') return computed;
  if (authoredDir === 'rtl') return 'rtl';
  if (authoredDir === 'ltr') return 'ltr';
  if (authoredDir === 'auto') {
    return detectDirection(element.textContent ?? '', { strategy: 'first-strong', fallback: parent() }) === 'rtl'
      ? 'rtl' : 'ltr';
  }
  return parent();
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
  return renderedText(element, element.matches(codeSelector) ? undefined : codeSelector);
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

function unwrapGeneratedIsolate(isolate: HTMLElement): void {
  // A host may enrich an owned wrapper after application. Unwrap the wrapper,
  // preserving the actual child nodes, their attributes, and event handlers.
  const fragment = isolate.ownerDocument.createDocumentFragment();
  while (isolate.firstChild) fragment.appendChild(isolate.firstChild);
  isolate.replaceWith(fragment);
  generatedIsolates.delete(isolate);
}

function ownedIsolates(root: ParentNode): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>('bdi')]
    .filter((isolate) => generatedIsolates.has(isolate));
}

function restoreOwnedSubtree(root: HTMLElement): number {
  const restoreSelection = preserveSelection(root);
  const generated = ownedIsolates(root);
  for (const isolate of generated) {
    unwrapGeneratedIsolate(isolate);
  }
  const elements = [root, ...root.querySelectorAll<HTMLElement>('*')];
  let restored = 0;
  for (const element of elements) {
    if (restoreElementState(element)) restored += 1;
  }
  restoreSelection();
  return restored;
}

function isolateInlineText(
  element: HTMLElement,
  direction: 'ltr' | 'rtl',
  blockSelector: string,
  codeSelector: string,
  intervention: BidiInterventionMode | undefined,
  technicalIdentifiers: readonly string[] | undefined
): number {
  return isolateInlineForest(element, direction, blockSelector, codeSelector, intervention, technicalIdentifiers, generatedIsolates, unwrapGeneratedIsolate);
}

export function applyBidi(root: ParentNode, options: ApplyBidiOptions = {}): ApplyBidiResult {
  const blockSelector = options.blockSelector ?? DEFAULT_BLOCK_SELECTOR;
  const codeSelector = options.codeSelector ?? DEFAULT_CODE_SELECTOR;
  const markAttribute = options.markAttribute ?? 'data-bidilens-block';
  const candidates = [...root.querySelectorAll(blockSelector)];
  const isSkipped = (element: HTMLElement): boolean => Boolean(options.skipSelector
    && (element.closest(options.skipSelector) || element.querySelector(options.skipSelector)));

  if (options.includeRoot && root.nodeType === 1) {
    const element = root as Element;
    if (isHTMLElement(element) && element.matches(blockSelector)) candidates.unshift(element);
  }

  const result: ApplyBidiResult = { scanned: 0, annotated: 0, rtl: 0, ltr: 0, neutral: 0, isolated: 0 };
  const candidateSet = new Set(candidates);

  for (const candidate of candidates) {
    if (!isHTMLElement(candidate)) continue;
    // Do not change an ancestor's direction or walk through its inline text
    // when it contains a region whose DOM belongs to the host/editor.
    if (isSkipped(candidate)) continue;
    if (isInUnrenderedSubtree(candidate)) continue;
    if (candidate.matches(codeSelector)) continue;

    result.scanned += 1;
    const hostDirection = options.inheritedDirection ?? inheritedDirection(candidate);
    const detection: DetectionOptions = {
      fallback: options.fallback ?? hostDirection,
      inheritedDirection: hostDirection
    };
    if (options.strategy !== undefined) detection.strategy = options.strategy;
    if (options.minimumStrongCharacters !== undefined) detection.minimumStrongCharacters = options.minimumStrongCharacters;
    if (options.majorityThreshold !== undefined) detection.majorityThreshold = options.majorityThreshold;
    if (options.excludeTechnicalTokens !== undefined) detection.excludeTechnicalTokens = options.excludeTechnicalTokens;
    if (options.technicalIdentifiers !== undefined) detection.technicalIdentifiers = options.technicalIdentifiers;
    const directionalText = textForDirection(candidate, codeSelector);
    const direction = detectDirection(directionalText, detection);
    const shouldIntervene = direction === 'rtl' || needsBidiIntervention(renderedText(candidate), {
      intervention: options.intervention,
      inheritedDirection: hostDirection
    });
    if (!shouldIntervene) {
      restoreOwnedSubtree(candidate);
      continue;
    }

    rememberOriginalDirection(candidate, hostDirection);
    candidate.querySelectorAll(codeSelector).forEach((node) => {
      if (isHTMLElement(node) && !isInUnrenderedSubtree(node)) annotateCode(node, hostDirection);
    });

    rememberState(candidate, ['dir', markAttribute]);
    candidate.setAttribute(markAttribute, '');
    if (direction === 'neutral') {
      restoreOriginalAttribute(candidate, 'dir');
      // A previous application may have supplied an inline base direction.
      // Neutral content should inherit its host again without discarding
      // authored styles that were reconciled by rememberState().
      restoreOriginalInlineStyle(candidate);
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
        result.isolated += isolateInlineText(
          candidate,
          direction,
          blockSelector,
          codeSelector,
          options.intervention,
          options.technicalIdentifiers
        );
      }
    }
    markApplied(candidate, ['dir', markAttribute, 'style']);
    result.annotated += 1;
    options.onAnnotated?.(candidate, direction);
  }

  root.querySelectorAll(codeSelector).forEach((node) => {
    if (!isHTMLElement(node)) return;
    if (isSkipped(node)) return;
    if (isInUnrenderedSubtree(node)) return;
    const owner = node.closest(blockSelector);
    if (owner && candidateSet.has(owner)) return;
    const hostDirection = options.inheritedDirection ?? inheritedDirection(node);
    if (needsBidiIntervention(renderedText(node), {
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
  const restoreSelection = preserveSelection(root);
  const generated = ownedIsolates(root);
  for (const isolate of generated) unwrapGeneratedIsolate(isolate);

  const elements: HTMLElement[] = [...root.querySelectorAll('*')].filter(isHTMLElement);
  if (options.includeRoot && root.nodeType === 1 && isHTMLElement(root as Element)) elements.unshift(root as HTMLElement);
  let restored = 0;
  for (const element of elements) {
    if (restoreElementState(element)) restored += 1;
  }
  // Do not normalize the root: adjacent/empty text nodes in an untouched host
  // subtree may be selection anchors or framework/editor-owned references.
  restoreSelection();
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
