import { planInlineIsolation, type BidiInterventionMode, type InlineIsolation } from '@bidilens/core';

/** Rendering projection only. Original formatting nodes/tokens are never cloned. */
export interface InlineNode<Value> {
  value?: Value;
  text?: string;
  children?: InlineNode<Value>[];
  opaque?: boolean;
  isolation?: InlineIsolation;
}
interface Container<Value> { children: InlineNode<Value>[] }
interface Leaf<Value> { node: InlineNode<Value>; parents: Container<Value>[]; start: number; end: number }

export function isolateForest<Value>(children: InlineNode<Value>[], direction: 'ltr' | 'rtl', options: {
  intervention?: BidiInterventionMode | undefined;
  technicalIdentifiers?: readonly string[] | undefined;
}): InlineNode<Value>[] {
  const root: Container<Value> = { children };
  const groups: Array<{ text: string; leaves: Leaf<Value>[] }> = [];
  let group = { text: '', leaves: [] as Leaf<Value>[] };
  const flush = (): void => {
    if (group.leaves.length) groups.push(group);
    group = { text: '', leaves: [] };
  };
  const visit = (node: InlineNode<Value>, parents: Container<Value>[]): void => {
    if (node.opaque) { flush(); return; }
    if (node.text !== undefined) {
      const start = group.text.length;
      group.text += node.text;
      group.leaves.push({ node, parents, start, end: group.text.length });
    } else if (node.children) {
      for (const child of node.children) visit(child, [...parents, node as Container<Value>]);
    } else flush();
  };
  for (const node of children) visit(node, [root]);
  flush();
  const indices = new Map<Container<Value>, Map<InlineNode<Value>, number>>();
  const childIndex = (container: Container<Value>, node: InlineNode<Value>): number => {
    let positions = indices.get(container);
    if (!positions) {
      positions = new Map(container.children.map((child, index) => [child, index]));
      indices.set(container, positions);
    }
    return positions.get(node)!;
  };
  // Process every group and plan right-to-left. Only a suffix is edited, so
  // cached indices of the untouched prefix remain valid. Repeated indexOf()
  // scans otherwise become quadratic for densely formatted sibling lists.
  for (const { text, leaves } of [...groups].reverse()) {
    const plans = planInlineIsolation(text, direction, options);
    const leafAt = (offset: number, end: boolean): Leaf<Value> | undefined => {
      let low = 0;
      let high = leaves.length;
      while (low < high) {
        const middle = (low + high) >>> 1;
        if (end ? leaves[middle]!.end < offset : leaves[middle]!.end <= offset) low = middle + 1;
        else high = middle;
      }
      const leaf = leaves[low];
      return leaf && (end ? leaf.start < offset : leaf.start <= offset) ? leaf : undefined;
    };
    for (const plan of [...plans].reverse()) {
      const first = leafAt(plan.start, false);
      const last = leafAt(plan.end, true);
      if (!first || !last) continue;
      let common = 0;
      while (first.parents[common + 1] && first.parents[common + 1] === last.parents[common + 1]) common += 1;
      const container = first.parents[common]!;
      const canLift = (leaf: Leaf<Value>, offset: number, end: boolean): boolean => {
        if (leaf.parents.at(-1) === container) return true;
        if (offset !== (end ? leaf.node.text!.length : 0)) return false;
        let current = leaf.node;
        for (let index = leaf.parents.length - 1; index > common; index -= 1) {
          const parent = leaf.parents[index]!;
          if (parent.children[end ? parent.children.length - 1 : 0] !== current) return false;
          current = parent as InlineNode<Value>;
        }
        return true;
      };
      const startOffset = plan.start - first.start;
      const endOffset = plan.end - last.start;
      if (!canLift(first, startOffset, false) || !canLift(last, endOffset, true)) continue;
      const firstChild = first.parents.length - 1 > common
        ? first.parents[common + 1] as InlineNode<Value> : first.node;
      const lastChild = last.parents.length - 1 > common
        ? last.parents[common + 1] as InlineNode<Value> : last.node;
      let firstIndex = childIndex(container, firstChild);
      let lastIndex = childIndex(container, lastChild);
      const split = (leaf: Leaf<Value>, offset: number): InlineNode<Value> => {
        const node = leaf.node;
        const after = { ...node, text: node.text!.slice(offset) };
        node.text = node.text!.slice(0, offset);
        const parent = leaf.parents.at(-1)!;
        const position = childIndex(parent, node) + 1;
        parent.children.splice(position, 0, after);
        indices.get(parent)!.set(after, position);
        return after;
      };
      if (endOffset < last.node.text!.length) split(last, endOffset);
      if (startOffset > 0) {
        split(first, startOffset);
        // This insertion is inside the current selection's prefix. Its right
        // endpoint shifts once, unlike endpoints of future (earlier) plans.
        firstIndex += 1;
        lastIndex += 1;
      }
      const selected = container.children.slice(firstIndex, lastIndex + 1);
      container.children.splice(firstIndex, selected.length, { children: selected, isolation: plan });
    }
  }
  return root.children;
}
