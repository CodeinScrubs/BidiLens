import { describe, expect, it } from 'vitest';
import { createSSRApp, h, ref } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { BidiIsolate, BidiMessage, useBidiDirection, useBidiStream } from './index.js';

describe('Vue adapter', () => {
  it('passes ordinary LTR content through without BidiLens markup', async () => {
    const source = 'React is a very popular JavaScript library.';
    const app = createSSRApp({ render: () => h(BidiMessage, { text: source }) });
    const html = await renderToString(app);
    expect(html).toBe(`<p>${source}</p>`);
    expect(html).not.toContain('dir=');
    expect(html).not.toContain('data-bidilens');
    expect(html).not.toContain('style=');

    const styled = createSSRApp({ render: () => h(BidiMessage, { text: source, className: 'message' }) });
    expect(await renderToString(styled)).toBe(`<p class="message">${source}</p>`);
  });

  it('supports explicit annotation for stable integration markers', async () => {
    const app = createSSRApp({ render: () => h(BidiMessage, { text: 'Hello world', intervention: 'always' }) });
    const html = await renderToString(app);
    expect(html).toContain('dir="ltr"');
    expect(html).toContain('data-bidilens-block');
    expect(html).toContain('text-align:start');
  });

  it('exports real Vue component definitions', () => {
    expect(BidiMessage.name).toBe('BidiMessage');
    expect(BidiIsolate.name).toBe('BidiIsolate');
    expect(BidiMessage.props).toHaveProperty('text');
  });

  it('detects the flagship sentence through a reactive ref', () => {
    const source = ref('React یک کتابخانه جاوااسکریپت بسیار محبوب است.');
    expect(useBidiDirection(source).value).toBe('rtl');
  });

  it('supports getter sources and explicit English direction', () => {
    expect(useBidiDirection(() => 'The word کتاب is Persian.').value).toBe('ltr');
    expect(useBidiDirection('سلام').value).toBe('rtl');
  });

  it('reacts when the source ref changes', () => {
    const source = ref('Hello world');
    const direction = useBidiDirection(source);
    expect(direction.value).toBe('ltr');
    source.value = 'سلام دنیا';
    expect(direction.value).toBe('rtl');
    expect(source.value).toBe('سلام دنیا');
  });

  it('supports explicit neutral fallback for symbols', () => {
    expect(useBidiDirection('---', { fallback: 'neutral' }).value).toBe('neutral');
    expect(useBidiDirection('---', { fallback: 'ltr' }).value).toBe('ltr');
    expect(useBidiDirection('---', { fallback: 'rtl' }).value).toBe('rtl');
  });

  it('keeps English-majority mixed content LTR', () => {
    const direction = useBidiDirection('The word کتاب means book.');
    expect(direction.value).toBe('ltr');
    expect(typeof direction.value).toBe('string');
  });

  it('does not classify technical-only content as RTL', () => {
    expect(useBidiDirection('https://example.com', { fallback: 'neutral' }).value).toBe('neutral');
    expect(useBidiDirection('npm install', { fallback: 'ltr' }).value).toBe('ltr');
  });

  it('preserves the Vue component prop surface and updates computed output', () => {
    expect(BidiMessage.props).toHaveProperty('as');
    expect(BidiMessage.props).toHaveProperty('className');
    expect(BidiMessage.props).toHaveProperty('fallback');
    expect(BidiIsolate.props).toHaveProperty('direction');
    expect(BidiIsolate.name).toBe('BidiIsolate');
    const source = ref('---');
    const direction = useBidiDirection(source, { fallback: 'neutral' });
    expect(direction.value).toBe('neutral');
    source.value = 'The API is ready.';
    expect(direction.value).toBe('ltr');
    source.value = 'API در دسترس است.';
    expect(direction.value).toBe('rtl');
    expect(typeof direction.value).toBe('string');
  });

  it('streams appended refs without duplicating the initial source', () => {
    const source = ref('React ');
    const stream = useBidiStream(source);
    expect(stream.snapshot.value.text).toBe('React ');
    expect(stream.snapshot.value.direction).toBe('ltr');
    source.value += 'یک کتابخانه جاوااسکریپت بسیار محبوب است.';
    expect(stream.snapshot.value.text).toBe(source.value);
    expect(stream.snapshot.value.direction).toBe('rtl');
    expect(stream.snapshot.value.locked).toBe(true);
    const final = stream.finish();
    expect(final.finished).toBe(true);
    expect(final.direction).toBe('rtl');
  });

  it('resets a stream when a reactive source is replaced', () => {
    const source = ref('Hello world');
    const stream = useBidiStream(source);
    source.value = 'سلام دنیا';
    expect(stream.snapshot.value.text).toBe('سلام دنیا');
    expect(stream.snapshot.value.direction).toBe('rtl');
    const reset = stream.reset();
    expect(reset.text).toBe('');
    expect(reset.finished).toBe(false);
  });

  it('SSR-renders the flagship with semantic block and inline directions', async () => {
    const source = 'React یک کتابخانه جاوااسکریپت بسیار محبوب است.';
    const app = createSSRApp({ render: () => h(BidiMessage, { text: source, as: 'article', className: 'message' }) });
    const html = await renderToString(app);
    expect(html).toContain('<article dir="rtl" class="message" data-bidilens-block');
    expect(html).toContain('<bdi dir="ltr" data-bidilens-isolate');
    expect(html).toContain('data-bidilens-kind="identifier"');
    expect(html).toContain('>React</bdi>');
    expect(html).toContain('text-align:start');
  });

  it('uses inherited direction for a neutral SSR block and renders isolate slots', async () => {
    const app = createSSRApp({
      render: () => h('section', [
        h(BidiMessage, { text: '---', fallback: 'neutral', inheritedDirection: 'rtl' }),
        h(BidiIsolate, { direction: 'ltr' }, { default: () => 'v2.1.0' })
      ])
    });
    const html = await renderToString(app);
    expect(html).toContain('<p dir="rtl"');
    expect(html).not.toContain('dir="neutral"');
    expect(html).toContain('<bdi dir="ltr">v2.1.0</bdi>');
    expect(html).toContain('data-bidilens-block');
  });
});
