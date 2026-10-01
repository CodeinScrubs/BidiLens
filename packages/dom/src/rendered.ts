/** Omit content that has no current display surface, without changing source. */
export function isUnrenderedElement(element: Element): boolean {
  if (/^(?:script|style|template)$/u.test(element.localName)) return true;
  const style = element.ownerDocument.defaultView?.getComputedStyle(element);
  if (style?.display === 'none') return true;
  // content-visibility only skips contents when layout containment applies.
  // Non-atomic inline/ruby and internal table boxes (except cells) ignore it;
  // display:contents has no containment box. Do not drop their visible prose.
  const display = style?.display ?? '';
  // A live, scripting-enabled document may suppress noscript without exposing
  // display:none in CSSOM. Parent-driven adapters can also target scripting-
  // disabled frames, where fallback is genuinely visible. Probe the own box
  // only when layout is available; display:contents can expose its children.
  if (element.localName === 'noscript' && element.namespaceURI === 'http://www.w3.org/1999/xhtml'
    && element.isConnected && style && display !== 'contents'
    && typeof element.checkVisibility === 'function' && !element.checkVisibility()) return true;
  const containmentIgnored = /^(?:inline(?: flow)?(?: list-item)?|contents|ruby(?:-base|-text|-base-container|-text-container)?|table-(?:row|row-group|header-group|footer-group|column|column-group))$/u.test(display);
  if (style?.contentVisibility === 'hidden' && !containmentIgnored) return true;
  // Authored CSS can make a Boolean-hidden element visible. Respect the
  // actual cascade when it is available rather than treating the attribute
  // as an unconditional display override. `until-found` keeps its contents
  // absent through content-visibility until the browser reveals it.
  return element.hasAttribute('hidden') && !style?.display;
}

export function isInUnrenderedSubtree(element: Element): boolean {
  for (let current: Element | null = element; current; current = current.parentElement) {
    if (isUnrenderedElement(current)) return true;
  }
  return false;
}

/** The displayed source projection; excluded subtrees retain their own DOM. */
export function renderedText(element: Element, excludedSelector?: string): string {
  const parts: string[] = [];
  const visit = (node: Node): void => {
    if (node.nodeType === 3) { parts.push((node as Text).data); return; }
    if (node.nodeType !== 1) return;
    const child = node as Element;
    if (isUnrenderedElement(child) || (excludedSelector && child.matches(excludedSelector))) return;
    for (const descendant of child.childNodes) visit(descendant);
  };
  visit(element);
  return parts.join('');
}
