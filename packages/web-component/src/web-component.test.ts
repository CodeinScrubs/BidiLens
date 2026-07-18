// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { BidiMessageElement, defineBidiMessageElement } from './index.js';

describe('BidiMessageElement', () => {
  it('is a real HTMLElement with the expected observed attribute', () => {
    expect(BidiMessageElement.prototype).toBeInstanceOf(HTMLElement.prototype.constructor);
    expect(BidiMessageElement.observedAttributes).toEqual(['text']);
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
    expect(element.textContent).toBe('برای مستندات https://example.com مراجعه کنید.');
  });

  it('updates when the text attribute changes', () => {
    const element = document.createElement('bidi-message') as BidiMessageElement;
    document.body.append(element);
    element.setAttribute('text', 'Hello world');
    expect(element.text).toBe('Hello world');
    expect(element.dir).toBe('ltr');
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
});
