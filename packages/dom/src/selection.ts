/** Retain an existing in-scope selection; never create a selection or move focus. */
export function preserveSelection(root: ParentNode): () => void {
  const document = root.nodeType === 9 ? root as Document : root.ownerDocument;
  const selection = document?.defaultView?.getSelection();
  const anchor = selection?.anchorNode;
  const focus = selection?.focusNode;
  if (!selection || !anchor || !focus || !root.contains(anchor) || !root.contains(focus)) return () => {};
  const anchorOffset = selection.anchorOffset;
  const focusOffset = selection.focusOffset;
  const position = (node: Node, offset: number): number => {
    const range = document!.createRange();
    range.selectNodeContents(root);
    range.setEnd(node, offset);
    return range.toString().length;
  };
  const wanted = [position(anchor, anchorOffset), position(focus, focusOffset)];
  return () => {
    if (selection.anchorNode === anchor && selection.focusNode === focus
      && selection.anchorOffset === anchorOffset && selection.focusOffset === focusOffset) return;
    const walker = document!.createTreeWalker(root, 4);
    const points: Array<{ node: Node; offset: number } | undefined> = [undefined, undefined];
    let offset = 0;
    let current: Node | null;
    while ((current = walker.nextNode()) !== null) {
      const length = current.textContent?.length ?? 0;
      for (let index = 0; index < wanted.length; index += 1) {
        if (!points[index] && wanted[index]! >= offset && wanted[index]! <= offset + length) {
          points[index] = { node: current, offset: wanted[index]! - offset };
        }
      }
      offset += length;
      if (points.every(Boolean)) break;
    }
    if (points[0] && points[1]) selection.setBaseAndExtent(points[0].node, points[0].offset, points[1].node, points[1].offset);
  };
}
