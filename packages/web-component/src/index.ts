import { analyzeText, planInlineIsolation } from '@bidilens/core';

function escapeHTML(text: string): string {
  return text.replace(/[&<>"']/gu, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character] ?? character));
}

export class BidiMessageElement extends HTMLElement {
  static observedAttributes = ['text'];

  connectedCallback(): void {
    this.render();
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.render();
  }

  get text(): string {
    return this.getAttribute('text') ?? this.textContent ?? '';
  }

  set text(value: string) {
    this.setAttribute('text', value);
  }

  render(): void {
    const source = this.text;
    const analysis = analyzeText(source, { fallback: 'ltr' });
    const direction = analysis.direction === 'neutral' ? 'ltr' : analysis.direction;
    const isolations = planInlineIsolation(source, direction);
    let html = '';
    let cursor = 0;
    for (const isolation of isolations) {
      html += escapeHTML(source.slice(cursor, isolation.start));
      const tag = isolation.kind === 'code' ? 'code' : 'bdi';
      html += `<${tag} dir="${isolation.direction}" data-bidilens-isolate="">${escapeHTML(isolation.text)}</${tag}>`;
      cursor = isolation.end;
    }
    html += escapeHTML(source.slice(cursor));
    this.dir = direction;
    this.dataset.bidilensBlock = '';
    this.style.unicodeBidi = 'plaintext';
    this.innerHTML = html;
  }
}

export function defineBidiMessageElement(registry: CustomElementRegistry = globalThis.customElements): void {
  if (!registry || registry.get('bidi-message')) return;
  registry.define('bidi-message', BidiMessageElement);
}

if (typeof globalThis.customElements !== 'undefined') defineBidiMessageElement();
