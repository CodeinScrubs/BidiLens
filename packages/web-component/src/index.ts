import { analyzeText, planInlineIsolation } from '@bidilens/core';

// Keep importing the package safe in SSR/Node environments. Browser custom
// element registration still uses the real HTMLElement constructor below.
const HTMLElementBase: typeof HTMLElement = typeof globalThis.HTMLElement === 'undefined'
  ? class {} as unknown as typeof HTMLElement
  : globalThis.HTMLElement;

export class BidiMessageElement extends HTMLElementBase {
  static observedAttributes = ['text'];
  #initialContent: string | null = null;

  connectedCallback(): void {
    if (this.#initialContent === null) this.#initialContent = this.textContent ?? '';
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

  render(): void {
    const source = this.text;
    const analysis = analyzeText(source, { fallback: 'ltr' });
    const direction = analysis.direction === 'neutral' ? 'ltr' : analysis.direction;
    const isolations = planInlineIsolation(source, direction);
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
    this.dir = direction;
    this.dataset.bidilensBlock = '';
    this.style.unicodeBidi = '';
    this.replaceChildren(fragment);
  }
}

export function defineBidiMessageElement(registry: CustomElementRegistry = globalThis.customElements): void {
  if (!registry || registry.get('bidi-message')) return;
  registry.define('bidi-message', BidiMessageElement);
}

if (typeof globalThis.customElements !== 'undefined') defineBidiMessageElement();
