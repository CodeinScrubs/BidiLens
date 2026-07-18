import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { BidiIsolate, BidiMessage, useBidiDirection } from './index.js';

describe('Vue adapter', () => {
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
});
