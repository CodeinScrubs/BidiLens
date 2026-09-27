import { planInlineIsolation, type BidiInterventionMode, type InlineIsolation } from '@bidilens/core';
import { preserveSelection } from './selection.js';

interface Leaf { node: Text; start: number; end: number }
interface Group { text: string; leaves: Leaf[]; owned: Array<{ node: HTMLElement; start: number; end: number }> }

function leafAt(group: Group, offset: number, end: boolean): Leaf | undefined {
  let low = 0;
  let high = group.leaves.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (end ? group.leaves[middle]!.end < offset : group.leaves[middle]!.end <= offset) low = middle + 1;
    else high = middle;
  }
  const leaf = group.leaves[low];
  return leaf && (end ? leaf.start < offset : leaf.start <= offset) ? leaf : undefined;
}

/** Lift only complete ancestor edges; never clone a partially selected element. */
function commonContainer(first: Text, last: Text, owned?: WeakSet<HTMLElement>): Node {
  const ancestors = new Set<Node>();
  for (let node: Node | null = first.parentNode; node; node = node.parentNode) {
    if (node.nodeType !== 1 || !owned?.has(node as HTMLElement)) ancestors.add(node);
  }
  for (let node: Node | null = last.parentNode; node; node = node.parentNode) if (ancestors.has(node)) return node;
  throw new Error('Inline leaves are disconnected.');
}

function canLift(leaf: Text, offset: number, container: Node, end: boolean, owned?: WeakSet<HTMLElement>): boolean {
  let logicalParent = leaf.parentNode;
  while (logicalParent?.nodeType === 1 && owned?.has(logicalParent as HTMLElement)) logicalParent = logicalParent.parentNode;
  if (logicalParent === container) return true;
  if (offset !== (end ? leaf.length : 0)) return false;
  for (let node: Node = leaf; node.parentNode !== container;) {
    if ((end ? node.nextSibling : node.previousSibling) !== null || !node.parentNode) return false;
    node = node.parentNode;
  }
  return true;
}

function representable(group: Group, plan: InlineIsolation, owned: WeakSet<HTMLElement>): boolean {
  const first = leafAt(group, plan.start, false);
  const last = leafAt(group, plan.end, true);
  if (!first || !last) return false;
  const container = commonContainer(first.node, last.node, owned);
  return canLift(first.node, plan.start - first.start, container, false, owned)
    && canLift(last.node, plan.end - last.start, container, true, owned);
}

function wrap(group: Group, plan: InlineIsolation, owned: WeakSet<HTMLElement>): boolean {
  const first = leafAt(group, plan.start, false);
  const last = leafAt(group, plan.end, true);
  if (!first || !last) return false;
  const container = commonContainer(first.node, last.node);
  const startOffset = plan.start - first.start;
  const endOffset = plan.end - last.start;
  if (!canLift(first.node, startOffset, container, false) || !canLift(last.node, endOffset, container, true)) return false;
  let startNode: Node = first.node;
  let endNode: Node = last.node;
  if (endOffset < last.node.length) last.node.splitText(endOffset);
  if (startOffset > 0) {
    startNode = first.node.splitText(startOffset);
    if (first.node === last.node) endNode = startNode;
  }
  while (startNode.parentNode !== container) startNode = startNode.parentNode!;
  while (endNode.parentNode !== container) endNode = endNode.parentNode!;
  const after = endNode.nextSibling;
  const isolate = first.node.ownerDocument.createElement('bdi');
  isolate.dir = plan.direction;
  isolate.dataset.bidilensIsolate = '';
  isolate.dataset.bidilensKind = plan.kind;
  isolate.dataset.bidilensDomGenerated = '';
  owned.add(isolate);
  container.insertBefore(isolate, startNode);
  let current: Node | null = startNode;
  while (current && current !== after) {
    const next: Node | null = current.nextSibling;
    isolate.appendChild(current);
    current = next;
  }
  return true;
}

export function isolateInlineForest(
  element: HTMLElement,
  direction: 'ltr' | 'rtl',
  blockSelector: string,
  codeSelector: string,
  intervention: BidiInterventionMode | undefined,
  technicalIdentifiers: readonly string[] | undefined,
  owned: WeakSet<HTMLElement>,
  unwrap: (element: HTMLElement) => void
): number {
  const restoreSelection = preserveSelection(element);
  // A host may enrich a wrapper with a new authored boundary. Retire that
  // wrapper before projection; it must not control the newly authored scope.
  for (const wrapper of [...element.querySelectorAll<HTMLElement>('bdi')].filter((node) => owned.has(node))) {
    if ([...wrapper.querySelectorAll<HTMLElement>('*')].some((node) => !owned.has(node)
      && (node.matches(`${blockSelector},${codeSelector},bdi,br,script,style,textarea,[dir],[data-bidilens-isolate]`)
        || /^(?:isolate|isolate-override|embed|bidi-override|plaintext)$/u.test(node.ownerDocument.defaultView?.getComputedStyle(node).unicodeBidi ?? '')))) unwrap(wrapper);
  }
  const collect = (): Group[] => {
    const groups: Group[] = [];
    let group: Group = { text: '', leaves: [], owned: [] };
    const flush = (): void => {
      if (group.leaves.length) groups.push(group);
      group = { text: '', leaves: [], owned: [] };
    };
    const visit = (node: Node): void => {
      if (node.nodeType === 3) {
        const text = node as Text;
        const start = group.text.length;
        group.text += text.data;
        group.leaves.push({ node: text, start, end: group.text.length });
        return;
      }
      if (node.nodeType !== 1) return;
      const child = node as HTMLElement;
      const generated = owned.has(child);
      const bidi = child.ownerDocument.defaultView?.getComputedStyle(child).unicodeBidi;
      if (!generated && (child.matches(`${blockSelector},${codeSelector},bdi,br,script,style,textarea,[dir],[data-bidilens-isolate]`)
        || (bidi && bidi !== 'normal'))) { flush(); return; }
      const startGroup = group;
      const start = group.text.length;
      for (const descendant of [...child.childNodes]) visit(descendant);
      if (generated && startGroup === group) group.owned.push({ node: child, start, end: group.text.length });
    };
    for (const child of [...element.childNodes]) visit(child);
    flush();
    return groups;
  };
  const planned = collect().map((group) => ({ group, plans: planInlineIsolation(group.text, direction, { intervention, technicalIdentifiers })
    .filter((plan) => representable(group, plan, owned)) }));
  const matches = (group: Group, plans: InlineIsolation[]): boolean => {
    const existing = group.owned.sort((a, b) => a.start - b.start);
    return existing.length === plans.length && existing.every((value, index) => {
      const plan = plans[index]!;
      return value.start === plan.start && value.end === plan.end && value.node.dir === plan.direction && value.node.dataset.bidilensKind === plan.kind;
    });
  };
  let created = 0;
  for (const { group, plans } of planned) {
    if (matches(group, plans)) continue;
    for (const value of group.owned) unwrap(value.node);
    // Unwrapping moves original nodes; leaves and local source offsets remain valid.
    for (const plan of [...plans].reverse()) if (wrap(group, plan, owned)) created += 1;
  }
  restoreSelection();
  return created;
}
