// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { applyBidi, installBidiStyles, observeBidi, restoreBidi } from './index.js';

describe('DOM adapter', () => {
  it('does not mutate an LTR-only scope', () => {
    document.body.innerHTML = '<main id="root"><p class="message">React is popular.</p><pre><code>npm test</code></pre></main>';
    const root = document.querySelector<HTMLElement>('#root')!;
    const before = root.innerHTML;
    const result = applyBidi(root);
    expect(result.scanned).toBe(1);
    expect(result.annotated).toBe(0);
    expect(result.isolated).toBe(0);
    expect(root.innerHTML).toBe(before);
    expect(root.querySelector('[dir]')).toBeNull();
    expect(root.querySelector('[data-bidilens-block]')).toBeNull();
    expect(root.querySelector('[data-bidilens-code]')).toBeNull();
  });

  it('can annotate LTR-only scopes explicitly and respects an RTL inherited context', () => {
    document.body.innerHTML = '<section dir="rtl"><div id="root"><p>Hello world</p></div></section>';
    const root = document.querySelector<HTMLElement>('#root')!;
    expect(applyBidi(root).annotated).toBe(1);
    expect(root.querySelector('p')?.getAttribute('dir')).toBe('ltr');

    document.body.innerHTML = '<div id="explicit"><p>Hello world</p></div>';
    const explicit = document.querySelector<HTMLElement>('#explicit')!;
    expect(applyBidi(explicit, { intervention: 'always' }).annotated).toBe(1);
    expect(explicit.querySelector('p')?.getAttribute('dir')).toBe('ltr');

    document.body.innerHTML = '<section style="direction: rtl"><div id="styled"><p>Hello CSS</p></div></section>';
    const styled = document.querySelector<HTMLElement>('#styled')!;
    expect(applyBidi(styled).annotated).toBe(1);
    expect(styled.querySelector('p')?.getAttribute('dir')).toBe('ltr');
  });

  it('assigns RTL to Persian-majority prose that starts with React', () => {
    document.body.innerHTML = '<p id="flagship">React یک کتابخانه جاوااسکریپت بسیار محبوب است.</p>';
    const paragraph = document.querySelector<HTMLElement>('#flagship')!;
    applyBidi(paragraph.parentElement!);
    expect(paragraph.dir).toBe('rtl');
    expect(paragraph.getAttribute('dir')).toBe('rtl');
    expect(paragraph.hasAttribute('data-bidilens-block')).toBe(true);
    expect(paragraph.style.unicodeBidi).toBe('');
    expect(paragraph.querySelector('bdi')?.textContent).toBe('React');
    expect(paragraph.querySelector('bdi')?.dir).toBe('ltr');
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

    expect(result.annotated).toBe(1);
    expect(paragraphs[0]?.getAttribute('dir')).toBe('rtl');
    expect(paragraphs[1]?.hasAttribute('dir')).toBe(false);
    expect(code.getAttribute('dir')).toBe('ltr');
    expect(code.hasAttribute('data-bidilens-code')).toBe(true);
    expect(result.scanned).toBe(2);
    expect(result.rtl).toBe(1);
    expect(result.ltr).toBe(0);
    expect(code.style.unicodeBidi).toBe('isolate');
  });

  it('installs styles only once', () => {
    document.head.innerHTML = '';
    const first = installBidiStyles(document);
    const second = installBidiStyles(document);
    expect(first).toBe(second);
    expect(document.querySelectorAll('style[data-bidilens-styles]')).toHaveLength(1);
    expect(first.textContent).not.toContain('unicode-bidi: plaintext');
    expect(first.textContent).toContain('unicode-bidi: isolate');
    expect(first.textContent).toContain('[data-bidilens-code]');
  });

  it('supports skipped blocks, neutral fallback, and annotation callbacks', () => {
    document.body.innerHTML = '<section id="root"><p id="skip">سلام</p><p id="neutral">---</p></section>';
    const root = document.querySelector<HTMLElement>('#root')!;
    const seen: string[] = [];
    const result = applyBidi(root, {
      fallback: 'neutral',
      intervention: 'always',
      skipSelector: '#skip',
      onAnnotated: (element, direction) => seen.push(`${element.id}:${direction}`)
    });
    const skipped = document.querySelector<HTMLElement>('#skip')!;
    const neutral = document.querySelector<HTMLElement>('#neutral')!;
    expect(result.scanned).toBe(1);
    expect(result.annotated).toBe(1);
    expect(result.neutral).toBe(1);
    expect(seen).toEqual(['neutral:neutral']);
    expect(skipped.hasAttribute('data-bidilens-block')).toBe(false);
    expect(neutral.hasAttribute('dir')).toBe(false);
  });

  it('keeps unrelated LTR siblings and code untouched when another subtree is RTL', () => {
    document.body.innerHTML = '<main id="root"><section dir="rtl"><p id="protected">Hello RTL parent</p></section><p id="plain">Hello LTR page</p><code id="plain-code">npm test</code></main>';
    const root = document.querySelector<HTMLElement>('#root')!;
    const plain = document.querySelector<HTMLElement>('#plain')!;
    const plainCode = document.querySelector<HTMLElement>('#plain-code')!;
    applyBidi(root);
    expect(document.querySelector('#protected')?.getAttribute('dir')).toBe('ltr');
    expect(plain.hasAttribute('dir')).toBe(false);
    expect(plain.hasAttribute('data-bidilens-block')).toBe(false);
    expect(plainCode.hasAttribute('dir')).toBe(false);
    expect(plainCode.hasAttribute('data-bidilens-code')).toBe(false);
  });

  it('returns a previously annotated dynamic message to the exact no-op state', () => {
    document.body.innerHTML = '<main id="root"><p id="message">سلام دنیا</p></main>';
    const root = document.querySelector<HTMLElement>('#root')!;
    const message = document.querySelector<HTMLElement>('#message')!;
    applyBidi(root);
    expect(message.dir).toBe('rtl');
    message.textContent = 'Hello world.';
    const result = applyBidi(root);
    expect(result.annotated).toBe(0);
    expect(message.outerHTML).toBe('<p id="message">Hello world.</p>');
  });

  it('re-evaluates a dynamic host direction without trusting its own generated dir', () => {
    document.body.innerHTML = '<main id="root" style="direction:ltr"><p id="message">سلام دنیا</p></main>';
    const root = document.querySelector<HTMLElement>('#root')!;
    const message = document.querySelector<HTMLElement>('#message')!;
    applyBidi(root);
    root.style.direction = 'rtl';
    message.textContent = 'Hello world.';
    expect(applyBidi(root).annotated).toBe(1);
    expect(message.getAttribute('dir')).toBe('ltr');
    root.style.direction = 'ltr';
    expect(applyBidi(root).annotated).toBe(0);
    expect(message.outerHTML).toBe('<p id="message">Hello world.</p>');
  });

  it('removes only its owned code style while preserving author style updates', () => {
    document.body.innerHTML = '<main id="root"><code id="code">سلام</code></main>';
    const root = document.querySelector<HTMLElement>('#root')!;
    const code = document.querySelector<HTMLElement>('#code')!;
    applyBidi(root);
    expect(code.style.unicodeBidi).toBe('isolate');
    code.style.color = 'red';
    code.textContent = 'npm test';
    applyBidi(root);
    expect(code.style.color).toBe('red');
    expect(code.style.unicodeBidi).toBe('');
    expect(code.hasAttribute('dir')).toBe(false);
    expect(code.hasAttribute('data-bidilens-code')).toBe(false);

    code.textContent = 'سلام';
    applyBidi(root);
    code.style.backgroundColor = 'blue';
    restoreBidi(root);
    expect(code.style.color).toBe('red');
    expect(code.style.backgroundColor).toBe('blue');
    expect(code.style.unicodeBidi).toBe('');
  });

  it('overrides conflicting own-element CSS only while protection is required', () => {
    document.body.innerHTML = '<main id="root"><p id="message" style="direction:rtl">Hello world</p></main>';
    const root = document.querySelector<HTMLElement>('#root')!;
    const message = document.querySelector<HTMLElement>('#message')!;
    expect(applyBidi(root).annotated).toBe(1);
    expect(message.getAttribute('dir')).toBe('ltr');
    expect(getComputedStyle(message).direction).toBe('ltr');
    expect(applyBidi(root).annotated).toBe(1);
    message.style.setProperty('direction', 'ltr', 'important');
    expect(applyBidi(root).annotated).toBe(0);
    expect(message.hasAttribute('data-bidilens-block')).toBe(false);
    expect(message.style.direction).toBe('ltr');
    expect(message.style.getPropertyPriority('direction')).toBe('important');
  });

  it('restores authored dir=auto after text changes from RTL to LTR', () => {
    document.body.innerHTML = '<main id="root"><p id="message" dir="auto">سلام دنیا</p></main>';
    const root = document.querySelector<HTMLElement>('#root')!;
    const message = document.querySelector<HTMLElement>('#message')!;
    applyBidi(root);
    expect(message.getAttribute('dir')).toBe('rtl');
    message.textContent = 'Hello world';
    expect(applyBidi(root).annotated).toBe(0);
    expect(message.getAttribute('dir')).toBe('auto');
    expect(message.hasAttribute('data-bidilens-block')).toBe(false);
  });

  it('honors explicit RTL strategy and neutral fallback before using the fast path', () => {
    document.body.innerHTML = '<main id="root"><p id="forced">Hello</p><p id="neutral">---</p></main>';
    const root = document.querySelector<HTMLElement>('#root')!;
    expect(applyBidi(root, { strategy: 'rtl' }).annotated).toBe(2);
    expect(document.querySelector('#forced')?.getAttribute('dir')).toBe('rtl');
    restoreBidi(root);
    expect(applyBidi(root, { fallback: 'rtl' }).annotated).toBe(1);
    expect(document.querySelector('#forced')?.hasAttribute('dir')).toBe(false);
    expect(document.querySelector('#neutral')?.getAttribute('dir')).toBe('rtl');
  });

  it('supports custom selectors and explicit includeRoot', () => {
    document.body.innerHTML = '<div id="root">Hello <span class="candidate">سلام</span></div>';
    const root = document.querySelector<HTMLElement>('#root')!;
    const result = applyBidi(root, {
      blockSelector: '#root,.candidate',
      includeRoot: true,
      markAttribute: 'data-custom-bidi'
    });
    const candidate = root.querySelector<HTMLElement>('.candidate')!;
    expect(result.scanned).toBe(2);
    expect(result.annotated).toBe(2);
    expect(root.getAttribute('data-custom-bidi')).toBe('');
    expect(candidate.getAttribute('data-custom-bidi')).toBe('');
    expect(root.dir).toBe('ltr');
    expect(candidate.dir).toBe('rtl');
  });

  it('uses the caller code selector when excluding technical content from direction evidence', () => {
    document.body.innerHTML = '<p id="message">سلام دنیا <span class="machine">ThisIsAVeryLongTechnicalIdentifier</span></p>';
    const paragraph = document.querySelector<HTMLElement>('#message')!;
    applyBidi(document.body, { codeSelector: '.machine' });
    expect(paragraph.dir).toBe('rtl');
    expect(paragraph.querySelector<HTMLElement>('.machine')?.dir).toBe('ltr');
    expect(paragraph.querySelector<HTMLElement>('.machine')?.dataset.bidilensCode).toBe('');
  });

  it('propagates caller-specific identifiers through detection and DOM isolation', () => {
    const source = 'internalplatform \u062e\u0648\u0628 \u0627\u0633\u062a.';
    document.body.innerHTML = `<p id="message">${source}</p>`;
    applyBidi(document.body, { technicalIdentifiers: ['InternalPlatform'] });
    const paragraph = document.querySelector<HTMLElement>('#message')!;
    expect(paragraph.dir).toBe('rtl');
    expect(paragraph.querySelector('bdi')?.textContent).toBe('internalplatform');
    expect(paragraph.textContent).toBe(source);
  });

  it('isolates opposite natural-language runs without changing logical text and is idempotent', () => {
    const source = 'The Persian word کتاب means book.';
    document.body.innerHTML = `<p id="message">${source}</p>`;
    const first = applyBidi(document.body);
    const paragraph = document.querySelector<HTMLElement>('#message')!;
    expect(paragraph.dir).toBe('ltr');
    expect(paragraph.querySelector('bdi[dir="rtl"]')?.textContent).toBe('کتاب');
    expect(paragraph.textContent).toBe(source);
    expect(first.isolated).toBeGreaterThan(0);
    applyBidi(document.body);
    expect(paragraph.querySelectorAll('bdi')).toHaveLength(1);
    expect(paragraph.textContent).toBe(source);
  });

  it('restores original attributes, inline style, and logical text exactly', () => {
    const source = 'React یک کتابخانه جاوااسکریپت بسیار محبوب است.';
    document.body.innerHTML = `<p id="message" dir="ltr" data-custom="original" style="unicode-bidi:isolate">${source}</p>`;
    const paragraph = document.querySelector<HTMLElement>('#message')!;
    const originalMarkup = paragraph.outerHTML;
    applyBidi(document.body, { markAttribute: 'data-custom-marker' });
    expect(paragraph.dir).toBe('rtl');
    expect(paragraph.querySelector('[data-bidilens-dom-generated]')?.textContent).toBe('React');
    expect(paragraph.getAttribute('data-custom-marker')).toBe('');
    expect(restoreBidi(document.body)).toBe(1);
    expect(paragraph.textContent).toBe(source);
    expect(paragraph.dir).toBe('ltr');
    expect(paragraph.style.unicodeBidi).toBe('isolate');
    expect(paragraph.hasAttribute('data-custom-marker')).toBe(false);
    expect(paragraph.getAttribute('data-custom')).toBe('original');
    expect(paragraph.outerHTML).toBe(originalMarkup);
    expect(restoreBidi(document.body)).toBe(0);
  });

  it('observes streamed mutations, supports flush, and stops after disconnect', async () => {
    document.body.innerHTML = '<section id="root"></section>';
    const root = document.querySelector<HTMLElement>('#root')!;
    const controller = observeBidi(root, { debounceMs: 0 });
    root.insertAdjacentHTML('beforeend', '<p id="first">سلام دنیا</p>');
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(document.querySelector<HTMLElement>('#first')?.dir).toBe('rtl');

    root.insertAdjacentHTML('beforeend', '<p id="second">Hello world</p>');
    const flushed = controller.flush();
    expect(flushed.annotated).toBe(1);
    expect(document.querySelector<HTMLElement>('#second')?.hasAttribute('dir')).toBe(false);

    controller.disconnect();
    root.insertAdjacentHTML('beforeend', '<p id="third">مرحبا بالعالم</p>');
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(document.querySelector<HTMLElement>('#third')?.hasAttribute('data-bidilens-block')).toBe(false);
  });

  it('supports elements from a detached document without relying on global constructors', () => {
    const detached = document.implementation.createHTMLDocument('detached');
    detached.body.innerHTML = '<p id="message">React یک کتابخانه محبوب است.</p>';
    const paragraph = detached.querySelector<HTMLElement>('#message')!;
    const result = applyBidi(detached.body);
    expect(result.annotated).toBe(1);
    expect(paragraph.dir).toBe('rtl');
    expect(paragraph.textContent).toBe('React یک کتابخانه محبوب است.');
    expect(paragraph.querySelector('bdi')?.textContent).toBe('React');
  });
});
