import { analyzeText, needsBidiIntervention, planInlineIsolation } from '@bidilens/core';

// Keep importing the package safe in SSR/Node environments. Browser custom
// element registration still uses the real HTMLElement constructor below.
const HTMLElementBase: typeof HTMLElement = typeof globalThis.HTMLElement === 'undefined'
  ? class {} as unknown as typeof HTMLElement
  : globalThis.HTMLElement;

export class BidiMessageElement extends HTMLElementBase {
  static observedAttributes = ['text', 'intervention'];
  #initialContent: string | null = null;
  #initialChildren: Node[] | null = null;
  #contentOwned = false;
  #presentationOwned = false;
  #restoreDir: string | null = null;
  #restoreMarker: string | null = null;
  #lastAppliedDir: string | null = null;
  #lastAppliedMarker: string | null = null;

  connectedCallback(): void {
    if (this.#initialContent === null) {
      this.#initialContent = this.textContent ?? '';
      this.#initialChildren = [...this.childNodes].map((node) => node.cloneNode(true));
    }
    this.render();
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.render();
  }

  get text(): string {
    return this.getAttribute('text') ?? this.#initialContent ?? this.textContent ?? '';
  }

  set text(value: string) {
    this.setAttribute('text', value);
  }

  #reconcileAuthorPresentation(): void {
    if (!this.#presentationOwned) return;
    const currentDir = this.getAttribute('dir');
    const currentMarker = this.getAttribute('data-bidilens-block');
    if (currentDir !== this.#lastAppliedDir) this.#restoreDir = currentDir;
    if (currentMarker !== this.#lastAppliedMarker) this.#restoreMarker = currentMarker;
  }

  #claimPresentation(): void {
    if (this.#presentationOwned) {
      this.#reconcileAuthorPresentation();
      return;
    }
    this.#restoreDir = this.getAttribute('dir');
    this.#restoreMarker = this.getAttribute('data-bidilens-block');
    this.#presentationOwned = true;
  }

  #releasePresentation(): void {
    if (!this.#presentationOwned) return;
    this.#reconcileAuthorPresentation();
    if (this.#restoreDir === null) this.removeAttribute('dir');
    else this.setAttribute('dir', this.#restoreDir);
    if (this.#restoreMarker === null) this.removeAttribute('data-bidilens-block');
    else this.setAttribute('data-bidilens-block', this.#restoreMarker);
    this.#presentationOwned = false;
    this.#lastAppliedDir = null;
    this.#lastAppliedMarker = null;
  }

  #renderPassThrough(source: string): void {
    this.#releasePresentation();
    if (this.hasAttribute('text')) {
      this.replaceChildren(this.ownerDocument.createTextNode(source));
      this.#contentOwned = true;
    } else if (this.#contentOwned) {
      this.replaceChildren(...(this.#initialChildren ?? []).map((node) => node.cloneNode(true)));
      this.#contentOwned = false;
    }
  }

  render(): void {
    const source = this.text;
    const analysis = analyzeText(source, { fallback: 'ltr' });
    const direction = analysis.direction === 'neutral' ? 'ltr' : analysis.direction;
    const directionalParent = this.parentElement?.closest('[dir]');
    const parentDirection = directionalParent?.getAttribute('dir')?.toLowerCase() === 'rtl'
      || (this.parentElement && this.ownerDocument.defaultView
        ?.getComputedStyle(this.parentElement).direction === 'rtl')
      ? 'rtl'
      : 'ltr';
    const intervene = direction === 'rtl' || needsBidiIntervention(source, {
      intervention: this.getAttribute('intervention') === 'always' ? 'always' : 'auto',
      inheritedDirection: parentDirection
    });
    if (!intervene) {
      this.#renderPassThrough(source);
      return;
    }
    const isolations = planInlineIsolation(source, direction, {
      intervention: this.getAttribute('intervention') === 'always' ? 'always' : 'auto'
    });
    const fragment = this.ownerDocument.createDocumentFragment();
    let cursor = 0;
    for (const isolation of isolations) {
      fragment.append(this.ownerDocument.createTextNode(source.slice(cursor, isolation.start)));
      const tag = isolation.kind === 'code' ? 'code' : 'bdi';
      const element = this.ownerDocument.createElement(tag);
      element.dir = isolation.direction;
      element.dataset.bidilensIsolate = '';
      element.dataset.bidilensKind = isolation.kind;
      if (isolation.kind === 'code') element.dataset.bidilensCode = '';
      element.textContent = isolation.text;
      fragment.append(element);
      cursor = isolation.end;
    }
    fragment.append(this.ownerDocument.createTextNode(source.slice(cursor)));
    this.#claimPresentation();
    this.dir = direction;
    this.dataset.bidilensBlock = '';
    this.#lastAppliedDir = this.getAttribute('dir');
    this.#lastAppliedMarker = this.getAttribute('data-bidilens-block');
    this.replaceChildren(fragment);
    this.#contentOwned = true;
  }
}

export function defineBidiMessageElement(registry: CustomElementRegistry = globalThis.customElements): void {
  if (!registry || registry.get('bidi-message')) return;
  registry.define('bidi-message', BidiMessageElement);
}

if (typeof globalThis.customElements !== 'undefined') defineBidiMessageElement();
