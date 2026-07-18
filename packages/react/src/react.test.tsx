import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BidiCode, BidiIsolate, BidiMessage, BidiText } from './index.js';

describe('React adapter', () => {
  it('renders the flagship Persian-majority paragraph RTL', () => {
    const html = renderToStaticMarkup(
      <BidiMessage text="React یک کتابخانه جاوااسکریپت بسیار محبوب است.">
        React یک کتابخانه جاوااسکریپت بسیار محبوب است.
      </BidiMessage>
    );
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('<bdi');
    expect(html).toContain('>React</bdi>');
    expect(html).not.toContain('unicode-bidi:plaintext');
  });

  it('renders RTL message semantics', () => {
    const html = renderToStaticMarkup(
      <BidiMessage text="سلام دنیا">سلام دنیا</BidiMessage>
    );
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('data-bidilens-block');
  });

  it('isolates code and identifiers', () => {
    const html = renderToStaticMarkup(
      <p dir="rtl">
        فایل <BidiCode>src/index.ts</BidiCode> نسخه{' '}
        <BidiIsolate direction="ltr">v2.1.0</BidiIsolate>
      </p>
    );
    expect(html).toContain('data-bidilens-code');
    expect(html).toContain('dir="ltr"');
    expect(html).toContain('data-bidilens-isolate');
    expect(html).toContain('src/index.ts');
    expect(html).toContain('v2.1.0');
  });

  it('supports custom elements, forced direction, and style merging', () => {
    const html = renderToStaticMarkup(
      <BidiText as="div" text="---" fallback="neutral" forceDirection="rtl" isolate style={{ color: 'red' }} />
    );
    expect(html).toContain('<div');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('data-bidilens-isolate');
    expect(html).not.toContain('data-bidilens-block');
    expect(html).toContain('color:red');
  });

  it('uses text prop, custom attributes, and explicit compatibility strategy', () => {
    const html = renderToStaticMarkup(
      <BidiMessage
        as="section"
        text="Hello سلام"
        strategy="first-strong"
        aria-label="mixed message"
        className="message"
      />
    );
    expect(html).toContain('<section');
    expect(html).toContain('dir="ltr"');
    expect(html).toContain('aria-label="mixed message"');
    expect(html).toContain('class="message"');
    expect(html).toContain('data-bidilens-block');
  });

  it('renders isolate and code primitives with caller styles', () => {
    const html = renderToStaticMarkup(
      <>
        <BidiIsolate as="span" direction="rtl" style={{ color: 'blue' }}>سلام</BidiIsolate>
        <BidiCode as="pre" style={{ backgroundColor: 'black' }}>npm run test</BidiCode>
      </>
    );
    expect(html).toContain('<span');
    expect(html).toContain('<pre');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('data-bidilens-isolate');
    expect(html).toContain('data-bidilens-code');
    expect(html).toContain('background-color:black');
    expect(html).toContain('direction:ltr');
  });
});
