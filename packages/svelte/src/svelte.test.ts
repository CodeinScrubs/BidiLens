import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { createBidiMessage, createStreamingBidiMessage } from './index.js';

describe('Svelte adapter', () => {
  it('creates a reactive analysis store', () => {
    const store = createBidiMessage('React یک کتابخانه است.');
    expect(get(store).direction).toBe('rtl');
    expect(store.getText()).toBe('React یک کتابخانه است.');
  });

  it('updates direction without mutating source text', () => {
    const store = createBidiMessage('Hello world');
    expect(get(store).direction).toBe('ltr');
    store.setText('The word کتاب is Persian.');
    expect(get(store).direction).toBe('ltr');
    expect(store.getText()).toBe('The word کتاب is Persian.');
  });

  it('notifies subscribers on every update', () => {
    const store = createBidiMessage('Hello');
    const values: string[] = [];
    const unsubscribe = store.subscribe((value) => values.push(value.direction));
    store.setText('سلام');
    unsubscribe();
    store.setText('World');
    expect(values).toEqual(['ltr', 'rtl']);
    expect(values.length).toBe(2);
  });

  it('supports fallback policies for neutral content', () => {
    expect(get(createBidiMessage('---', { fallback: 'neutral' })).direction).toBe('neutral');
    expect(get(createBidiMessage('---', { fallback: 'ltr' })).direction).toBe('ltr');
    expect(get(createBidiMessage('---', { fallback: 'rtl' })).direction).toBe('rtl');
  });

  it('handles the flagship sentence and technical-only content', () => {
    const flagship = createBidiMessage('React یک کتابخانه جاوااسکریپت بسیار محبوب است.');
    expect(get(flagship).direction).toBe('rtl');
    expect(get(flagship).text).toBe(flagship.getText());
    expect(get(createBidiMessage('https://example.com', { fallback: 'neutral' })).direction).toBe('neutral');
    expect(get(flagship).isolations).toContainEqual(expect.objectContaining({ text: 'React', direction: 'ltr' }));
  });

  it('exposes a Svelte-compatible readable store contract', () => {
    const store = createBidiMessage('Hello world');
    const snapshots: string[] = [];
    const unsubscribe = store.subscribe((snapshot) => snapshots.push(snapshot.text));
    expect(typeof store.subscribe).toBe('function');
    expect(typeof store.setText).toBe('function');
    expect(typeof store.getText).toBe('function');
    expect(snapshots).toEqual(['Hello world']);
    expect(get(store).direction).toBe('ltr');
    expect(get(store).text).toBe('Hello world');
    store.setText('سلام دنیا');
    expect(snapshots).toEqual(['Hello world', 'سلام دنیا']);
    expect(get(store).direction).toBe('rtl');
    expect(get(store).text).toBe('سلام دنیا');
    expect(store.getText()).toBe('سلام دنیا');
    unsubscribe();
    store.setText('---');
    expect(snapshots).toHaveLength(2);
    expect(get(store).direction).toBe('neutral');
  });

  it('provides an idiomatic streaming store with push, finish, and reset', () => {
    const stream = createStreamingBidiMessage();
    const seen: string[] = [];
    const unsubscribe = stream.subscribe((snapshot) => seen.push(snapshot.text));
    expect(stream.push('React ').text).toBe('React ');
    const settled = stream.push('یک کتابخانه جاوااسکریپت بسیار محبوب است.');
    expect(settled.direction).toBe('rtl');
    expect(settled.text).toBe(stream.getText());
    expect(stream.finish().finished).toBe(true);
    expect(seen.at(-1)).toBe(stream.getText());
    expect(stream.reset().text).toBe('');
    expect(stream.getText()).toBe('');
    unsubscribe();
  });

  it('replaces non-prefix streaming text without retaining stale source', () => {
    const stream = createStreamingBidiMessage();
    stream.setText('Hello world');
    const replaced = stream.setText('سلام دنیا');
    expect(replaced.text).toBe('سلام دنیا');
    expect(replaced.direction).toBe('rtl');
    expect(stream.getText()).toBe('سلام دنیا');
  });
});
