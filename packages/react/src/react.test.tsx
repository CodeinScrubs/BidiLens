// @vitest-environment jsdom
import { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BidiCode, BidiIsolate, BidiMessage, BidiText, StreamingBidiMessage, useBidiStream } from './index.js';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('React adapter', () => {
  it('passes ordinary LTR content through without BidiLens attributes or styles', () => {
    const source = 'React is a very popular JavaScript library.';
    const html = renderToStaticMarkup(<BidiMessage text={source} className="message" />);
    expect(html).toBe(`<article class="message">${source}</article>`);
    expect(html).not.toContain('dir=');
    expect(html).not.toContain('data-bidilens');
    expect(html).not.toContain('style=');
  });

  it('honors an explicitly forced LTR base inside an author-owned RTL context', () => {
    const html = renderToStaticMarkup(
      <BidiMessage text="Hello world" forceDirection="ltr" dir="rtl" />
    );
    expect(html).toContain('dir="ltr"');
    expect(html).not.toContain('dir="rtl"');
  });

  it('preserves caller-owned direction, data attributes, and styles on pass-through', () => {
    const html = renderToStaticMarkup(
      <BidiMessage
        text="Hello"
        dir="rtl"
        data-bidilens-block="author"
        data-bidilens-owner="application"
        style={{ color: 'red' }}
      />
    );
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('data-bidilens-block="author"');
    expect(html).toContain('data-bidilens-owner="application"');
    expect(html).toContain('style="color:red"');
  });

  it('still establishes LTR when the inherited context is RTL or annotations are requested', () => {
    const inherited = renderToStaticMarkup(<BidiMessage text="Hello world" inheritedDirection="rtl" />);
    const explicit = renderToStaticMarkup(<BidiMessage text="Hello world" intervention="always" />);
    expect(inherited).toContain('dir="ltr"');
    expect(inherited).toContain('data-bidilens-block');
    expect(explicit).toContain('dir="ltr"');
    expect(explicit).toContain('text-align:start');
  });

  it('renders the flagship Persian-majority paragraph RTL', () => {
    const html = renderToStaticMarkup(
      <BidiMessage text="React یک کتابخانه جاوااسکریپت بسیار محبوب است.">
        React یک کتابخانه جاوااسکریپت بسیار محبوب است.
      </BidiMessage>
    );
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('<bdi');
    expect(html).toContain('>React</bdi>');
    expect(html).toContain('data-bidilens-kind="identifier"');
    expect(html).not.toContain('unicode-bidi:plaintext');
  });

  it('uses caller-specific identifiers for direction and isolation', () => {
    const html = renderToStaticMarkup(
      <BidiMessage
        text={'internalplatform \u062e\u0648\u0628 \u0627\u0633\u062a.'}
        technicalIdentifiers={['InternalPlatform']}
      />
    );
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('>internalplatform</bdi>');
    expect(renderToStaticMarkup(
      <BidiMessage text="internalplatform is healthy." technicalIdentifiers={['InternalPlatform']} />
    )).toBe('<article>internalplatform is healthy.</article>');
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

  it('does not append the initial streaming value twice on mount', async () => {
    const source = 'React یک کتابخانه جاوااسکریپت بسیار محبوب است.';
    const seen: string[] = [];
    function Probe() {
      const { snapshot } = useBidiStream(source);
      useEffect(() => {
        seen.push(snapshot.text);
      }, [snapshot]);
      return <output>{snapshot.text}</output>;
    }
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => root.render(<Probe />));
    expect(seen.at(-1)).toBe(source);
    expect(container.textContent).toBe(source);
    expect(seen.every((value) => value === source)).toBe(true);
    await act(async () => root.unmount());
  });

  it('finalizes completed streams during SSR and exposes an explicit finish action', async () => {
    const html = renderToStaticMarkup(<StreamingBidiMessage text={'\u0633\u0644\u0627\u0645'} completed />);
    expect(html).toContain('dir="rtl"');

    let finish: (() => void) | undefined;
    function Probe() {
      const result = useBidiStream('\u0633\u0644\u0627\u0645');
      finish = result.finish;
      return <output data-direction={result.snapshot.direction}>{result.snapshot.text}</output>;
    }
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => root.render(<Probe />));
    expect(container.querySelector('output')?.dataset.direction).toBe('ltr');
    await act(async () => finish?.());
    expect(container.querySelector('output')?.dataset.direction).toBe('rtl');
    await act(async () => root.unmount());
  });

  it('renders accumulated mixed-direction paragraphs as independent blocks', () => {
    const source = 'Hello world\n\u0633\u0644\u0627\u0645 \u062f\u0646\u06cc\u0627';
    const html = renderToStaticMarkup(
      <StreamingBidiMessage text={source} completed />
    );
    expect(html).toMatch(/^<article>/u);
    expect(html).toContain('<span dir="ltr"');
    expect(html).toContain('>Hello world</span>');
    expect(html).toContain('<span dir="rtl"');
    expect(html).toContain('>سلام دنیا</span>');
    expect(html).not.toMatch(/^<article dir=/u);
    const container = document.createElement('div');
    container.innerHTML = html;
    expect(container.textContent).toBe(source);
  });

  it('keeps an ordinary pure-LTR streaming message observably untouched', () => {
    expect(renderToStaticMarkup(<StreamingBidiMessage text="Hello world" />))
      .toBe('<article>Hello world</article>');
  });

  it('preserves consecutive streaming paragraph separators and empty paragraphs', () => {
    const source = 'Hello\n\n\u0633\u0644\u0627\u0645\u2029English';
    const html = renderToStaticMarkup(<StreamingBidiMessage text={source} completed />);
    const container = document.createElement('div');
    container.innerHTML = html;
    expect(container.textContent).toBe(source);
    expect(container.querySelectorAll('article > span')).toHaveLength(4);
  });
});
