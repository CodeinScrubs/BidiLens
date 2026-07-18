// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { applyBidi, installBidiStyles } from './index.js';

describe('DOM adapter', () => {
  it('assigns RTL to Persian-majority prose that starts with React', () => {
    document.body.innerHTML = '<p id="flagship">React یک کتابخانه جاوااسکریپت بسیار محبوب است.</p>';
    const paragraph = document.querySelector<HTMLElement>('#flagship')!;
    applyBidi(paragraph.parentElement!);
    expect(paragraph.dir).toBe('rtl');
  });

  it('annotates prose and isolates code', () => {
    document.body.innerHTML = `
      <article id="message">
        <p>فایل <code>src/index.ts</code> را باز کن.</p>
        <p>Hello world</p>
      </article>
    `;
    const root = document.querySelector<HTMLElement>('#message')!;
    const result = applyBidi(root);
    const paragraphs = root.querySelectorAll('p');
    const code = root.querySelector('code')!;

    expect(result.annotated).toBe(2);
    expect(paragraphs[0]?.getAttribute('dir')).toBe('rtl');
    expect(paragraphs[1]?.getAttribute('dir')).toBe('ltr');
    expect(code.getAttribute('dir')).toBe('ltr');
    expect(code.hasAttribute('data-bidilens-code')).toBe(true);
  });

  it('installs styles only once', () => {
    document.head.innerHTML = '';
    const first = installBidiStyles(document);
    const second = installBidiStyles(document);
    expect(first).toBe(second);
    expect(document.querySelectorAll('style[data-bidilens-styles]')).toHaveLength(1);
  });
});
