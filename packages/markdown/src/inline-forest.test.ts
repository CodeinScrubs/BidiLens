import { describe, expect, it } from 'vitest';
import { isolateForest, type InlineNode } from './inline-forest.js';

describe('inline projection index invariants', () => {
  it('preserves ordering across opaque groups and multiple splits in one leaf', () => {
    const barrier: InlineNode<never> = { opaque: true };
    const strong: InlineNode<never> = { children: [{ text: 'React' }] };
    const children: InlineNode<never>[] = [{ text: 'سلام React پایان Vue پایان' }, barrier, strong];
    const result = isolateForest(children, 'rtl', { intervention: 'always' });
    const text = (node: InlineNode<never>): string => node.text ?? node.children?.map(text).join('') ?? '|';
    expect(result.map(text).join('')).toBe('سلام React پایان Vue پایان|React');
    expect(result.filter((node) => node.isolation).map((node) => text(node))).toEqual(['React', 'Vue']);
    expect(result.at(-1)).toBe(strong);
    expect(strong.children?.[0]?.isolation?.text).toBe('React');
    expect(result).toContain(barrier);
  });

  it('bounds projection work for dense sibling groups', () => {
    const count = 20_000;
    const children: InlineNode<never>[] = Array.from({ length: count }, () =>
      [{ text: 'React' }, { opaque: true }] as InlineNode<never>[]).flat();
    const started = performance.now();
    const result = isolateForest(children, 'rtl', { intervention: 'always' });
    expect(result).toHaveLength(count * 2);
    expect(result.filter((node) => node.isolation)).toHaveLength(count);
    // Broad CI guard for fixed-size sibling replacements without repeated scans.
    expect(performance.now() - started).toBeLessThan(2_000);
  });
});
