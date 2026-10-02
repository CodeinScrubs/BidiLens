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

  it('preserves every dense sibling replacement and opaque boundary', () => {
    const count = 20_000;
    const children: InlineNode<never>[] = Array.from({ length: count }, () =>
      [{ text: 'React' }, { opaque: true }] as InlineNode<never>[]).flat();
    const result = isolateForest(children, 'rtl', { intervention: 'always' });
    expect(result).toHaveLength(count * 2);
    expect(result.filter((node) => node.isolation)).toHaveLength(count);
    expect(result.filter((node) => node.opaque)).toHaveLength(count);
  });

  it.each([64, 512])('bounds child-array reads linearly for %i sibling groups', (count) => {
    let childReads = 0;
    const children = new Proxy(Array.from({ length: count }, () =>
      [{ text: 'React' }, { opaque: true }] as InlineNode<never>[]).flat(), {
      get(target, property, receiver) {
        if (typeof property === 'string' && /^\d+$/u.test(property)) childReads += 1;
        return Reflect.get(target, property, receiver);
      }
    });
    const result = isolateForest(children, 'rtl', { intervention: 'always' });
    // Array reads measure the repeated-indexOf regression directly, independent
    // of worker scheduling, CPU speed, or V8 coverage. The current indexed
    // projection uses six reads per group; allow bounded implementation slack.
    expect(childReads).toBeLessThanOrEqual(count * 12);
    expect(result.filter((node) => node.isolation)).toHaveLength(count);
  });
});
