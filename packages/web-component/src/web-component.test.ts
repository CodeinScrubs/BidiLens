// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { BidiMessageElement, defineBidiMessageElement } from './index.js';

describe('BidiMessageElement', () => {
  it('is a real HTMLElement with the expected observed attribute', () => {
    expect(BidiMessageElement.prototype).toBeInstanceOf(HTMLElement.prototype.constructor);
    expect(BidiMessageElement.observedAttributes).toEqual(['text', 'intervention']);
  });

  it('defines the custom element idempotently', () => {
    defineBidiMessageElement(customElements);
    defineBidiMessageElement(customElements);
    expect(customElements.get('bidi-message')).toBe(BidiMessageElement);
  });

  it('renders the flagship paragraph RTL', () => {
    const element = document.createElement('bidi-message') as BidiMessageElement;
    element.textContent = 'React یک کتابخانه جاوااسکریپت بسیار محبوب است.';
    document.body.append(element);
    expect(element.dir).toBe('rtl');
    expect(element.dataset.bidilensBlock).toBe('');
    expect(element.style.unicodeBidi).toBe('');
  });

  it('isolates the leading identifier and preserves textContent', () => {
    const element = document.createElement('bidi-message') as BidiMessageElement;
    const source = 'React یک کتابخانه است.';
    element.text = source;
    document.body.append(element);
    expect(element.querySelector('bdi')?.textContent).toBe('React');
    expect(element.querySelector('bdi')?.dir).toBe('ltr');
    expect((element.querySelector('bdi') as HTMLElement | null)?.dataset.bidilensKind).toBe('identifier');
    expect(element.textContent).toBe(source);
  });

  it('escapes markup instead of interpreting it', () => {
    const element = document.createElement('bidi-message') as BidiMessageElement;
    element.text = '<script>alert(1)</script>';
    document.body.append(element);
    expect(element.querySelector('script')).toBeNull();
    expect(element.textContent).toBe('<script>alert(1)</script>');
  });

  it('isolates URLs and keeps the paragraph RTL', () => {
    const element = document.createElement('bidi-message') as BidiMessageElement;
    element.text = 'برای مستندات https://example.com مراجعه کنید.';
    document.body.append(element);
    expect(element.dir).toBe('rtl');
    expect(element.querySelector('bdi')?.textContent).toBe('https://example.com');
    expect(element.querySelector('bdi')?.dir).toBe('ltr');
    expect((element.querySelector('bdi') as HTMLElement | null)?.dataset.bidilensKind).toBe('url');
    expect(element.textContent).toBe('برای مستندات https://example.com مراجعه کنید.');
  });

  it('updates when the text attribute changes', () => {
    const element = document.createElement('bidi-message') as BidiMessageElement;
    document.body.append(element);
    element.setAttribute('text', 'Hello world');
    expect(element.text).toBe('Hello world');
    expect(element.dir).toBe('');
    expect(element.hasAttribute('data-bidilens-block')).toBe(false);
    element.setAttribute('text', 'سلام دنیا');
    expect(element.text).toBe('سلام دنیا');
    expect(element.dir).toBe('rtl');
  });

  it('uses the explicit text property over fallback child content', () => {
    const element = document.createElement('bidi-message') as BidiMessageElement;
    element.textContent = 'old';
    element.text = 'سلام';
    document.body.append(element);
    expect(element.getAttribute('text')).toBe('سلام');
    expect(element.text).toBe('سلام');
    expect(element.dir).toBe('rtl');
    expect(element.tagName.toLowerCase()).toBe('bidi-message');
    expect(element.hasAttribute('data-bidilens-block')).toBe(true);
    expect(element.style.unicodeBidi).toBe('');
  });

  it('restores initial light-DOM source when the text attribute is removed', () => {
    const element = document.createElement('bidi-message') as BidiMessageElement;
    element.textContent = 'Hello original';
    document.body.append(element);
    element.text = 'سلام دنیا';
    expect(element.textContent).toBe('سلام دنیا');
    expect(element.dir).toBe('rtl');
    element.removeAttribute('text');
    expect(element.text).toBe('Hello original');
    expect(element.textContent).toBe('Hello original');
    expect(element.dir).toBe('');
    expect(element.hasAttribute('data-bidilens-block')).toBe(false);
  });

  it('passes LTR-only text through and restores author presentation attributes', () => {
    const element = document.createElement('bidi-message') as BidiMessageElement;
    element.setAttribute('dir', 'auto');
    element.setAttribute('data-bidilens-block', 'author');
    element.textContent = 'Hello world';
    document.body.append(element);
    expect(element.textContent).toBe('Hello world');
    expect(element.getAttribute('dir')).toBe('auto');
    expect(element.getAttribute('data-bidilens-block')).toBe('author');
    expect(element.querySelector('bdi')).toBeNull();
  });

  it('does not flatten author light-DOM markup on the no-op path', () => {
    const element = document.createElement('bidi-message') as BidiMessageElement;
    element.innerHTML = '<em data-owner="author">Hello</em> <strong>world</strong>';
    const before = element.innerHTML;
    document.body.append(element);
    expect(element.innerHTML).toBe(before);
    expect(element.querySelector('em')?.dataset.owner).toBe('author');
  });

  it('preserves author attribute updates when returning from intervention to LTR', () => {
    const element = document.createElement('bidi-message') as BidiMessageElement;
    element.innerHTML = '<em>Hello original</em>';
    document.body.append(element);
    element.text = 'سلام دنیا';
    expect(element.dir).toBe('rtl');
    element.setAttribute('dir', 'auto');
    element.setAttribute('data-bidilens-block', 'author-update');
    element.removeAttribute('text');
    expect(element.getAttribute('dir')).toBe('auto');
    expect(element.getAttribute('data-bidilens-block')).toBe('author-update');
    expect(element.innerHTML).toBe('<em>Hello original</em>');
  });

  it('can retain explicit LTR annotations for integrations that require them', () => {
    const element = document.createElement('bidi-message') as BidiMessageElement;
    element.setAttribute('intervention', 'always');
    element.textContent = 'Hello world';
    document.body.append(element);
    expect(element.dir).toBe('ltr');
    expect(element.dataset.bidilensBlock).toBe('');
  });

  it('protects LTR content inherited from a CSS-only RTL parent', () => {
    const parent = document.createElement('section');
    parent.style.direction = 'rtl';
    const element = document.createElement('bidi-message') as BidiMessageElement;
    element.textContent = 'Hello world';
    parent.append(element);
    document.body.append(parent);
    expect(element.dir).toBe('ltr');
    expect(element.dataset.bidilensBlock).toBe('');
  });
});
