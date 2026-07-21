// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { escapeHtml, renderBidiHtml, renderInlineBidiHtml } from './index.js';

describe('semantic HTML serializer', () => {
  it('adds no BidiLens markup to ordinary LTR-only input by default', () => {
    const source = 'React is a very popular JavaScript library.';
    const result = renderBidiHtml(source);
    expect(result.source).toBe(source);
    expect(result.html).toBe(`<p>${source}</p>`);
    expect(result.html).not.toContain('dir=');
    expect(result.html).not.toContain('data-bidilens');
    expect(result.blocks[0]?.direction).toBe('ltr');
  });

  it('retains annotations on request and for LTR text in an RTL parent', () => {
    expect(renderBidiHtml('Hello world', { intervention: 'always' }).html)
      .toContain('<p dir="ltr" data-bidilens-block="">');
    expect(renderBidiHtml('Hello world', { inheritedDirection: 'rtl' }).html)
      .toContain('<p dir="ltr" data-bidilens-block="">');
  });

  it('does not let the no-op gate override explicit RTL policies', () => {
    expect(renderBidiHtml('Hello world', { strategy: 'rtl' }).html)
      .toContain('<p dir="rtl" data-bidilens-block="">');
    expect(renderBidiHtml('---', { fallback: 'rtl' }).html)
      .toContain('<p dir="rtl" data-bidilens-block="">');
  });

  it('renders and isolates the flagship source without changing logical text', () => {
    const source = 'React یک کتابخانه جاوااسکریپت بسیار محبوب است.';
    const result = renderBidiHtml(source);
    expect(result.source).toBe(source);
    expect(result.analysis.direction).toBe('rtl');
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0]?.direction).toBe('rtl');
    expect(result.html).toContain('<p dir="rtl"');
    expect(result.html).toContain('<bdi dir="ltr"');
    expect(result.html).toContain('data-bidilens-kind="identifier"');
    expect(result.html).toContain('>React</bdi>');
    const host = document.createElement('div');
    host.innerHTML = result.html;
    expect(host.textContent).toBe(source);
  });

  it('escapes hostile HTML and attribute characters', () => {
    const source = '<img src=x onerror="alert(1)"> & \'quoted\'';
    const result = renderBidiHtml(source, { blockClassName: 'x" onclick="evil', intervention: 'always' });
    expect(result.html).not.toContain('<img');
    expect(result.html).not.toContain(' onclick="evil"');
    expect(result.html).toContain('&lt;img');
    expect(result.html).toContain('&quot;alert(1)&quot;');
    expect(result.html).toContain('&amp;');
    expect(result.html).toContain('&#39;quoted&#39;');
    expect(result.html).toContain('class="x&quot; onclick=&quot;evil"');
    expect(escapeHtml('<>&"\'')).toBe('&lt;&gt;&amp;&quot;&#39;');
  });

  it('renders independent paragraph directions and preserves LF source separators', () => {
    const source = 'سلام دنیا\nHello world';
    const result = renderBidiHtml(source);
    expect(result.blocks.map((block) => block.direction)).toEqual(['rtl', 'ltr']);
    expect(result.blocks.map((block) => block.text)).toEqual(['سلام دنیا', 'Hello world']);
    expect(result.html).toContain('<div data-bidilens-document="">');
    expect(result.html).toContain('<p dir="rtl"');
    expect(result.html).toContain('</p>\n<p dir="ltr"');
    const host = document.createElement('div');
    host.innerHTML = result.html;
    expect(host.textContent).toBe(source);
    expect(host.querySelectorAll('[data-bidilens-block]')).toHaveLength(2);
  });

  it('isolates English and Persian runs symmetrically', () => {
    const english = renderInlineBidiHtml('The Persian word کتاب means book.', 'ltr');
    expect(english).toContain('<bdi dir="rtl"');
    expect(english).toContain('>کتاب</bdi>');
    const persian = renderInlineBidiHtml('React یک کتابخانه است.', 'rtl');
    expect(persian).toContain('<bdi dir="ltr"');
    expect(persian).toContain('>React</bdi>');
    expect(persian).not.toContain('\u2066');
    expect(persian).not.toContain('\u2069');
  });

  it('supports safe presentation options without losing semantic direction', () => {
    const result = renderBidiHtml('سلام', {
      blockTag: 'article',
      containerTag: 'section',
      blockClassName: 'message',
      containerClassName: 'transcript',
      includeDataAttributes: false
    });
    expect(result.html).toBe('<section class="transcript"><article dir="rtl" class="message">سلام</article></section>');
    expect(result.html).not.toContain('data-bidilens');
    expect(result.blocks[0]?.start).toBe(0);
    expect(result.blocks[0]?.end).toBe('سلام'.length);
    expect(result.analysis.text).toBe('سلام');
  });

  it('rejects tag-name injection', () => {
    expect(() => renderBidiHtml('safe', { blockTag: 'p onclick=evil' })).toThrow('blockTag');
    expect(() => renderBidiHtml('safe\ntext', { containerTag: 'div><script' })).toThrow('containerTag');
    expect(() => renderBidiHtml('safe', { blockTag: 'H2' }).html).not.toThrow();
    expect(renderBidiHtml('safe', { blockTag: 'H2' }).html).toBe('<h2>safe</h2>');
  });

  it('rejects executable, raw-text, embedded, foreign, and void element names', () => {
    const unsafe = [
      'script', 'style', 'template', 'iframe', 'object', 'embed', 'svg', 'math',
      'textarea', 'title', 'img', 'input', 'link', 'meta', 'base'
    ];
    for (const tag of unsafe) {
      expect(() => renderBidiHtml('alert(1)', { blockTag: tag })).toThrow('blockTag');
      expect(() => renderBidiHtml('safe\ntext', { containerTag: tag })).toThrow('containerTag');
    }
    expect(renderBidiHtml('safe', { blockTag: 'article', containerTag: 'main', intervention: 'always' }).html)
      .toBe('<main data-bidilens-document=""><article dir="ltr" data-bidilens-block="">safe</article></main>');
  });
});
