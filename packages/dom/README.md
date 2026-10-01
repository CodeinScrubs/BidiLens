# @bidilens/dom

Annotate existing HTML blocks with semantic `dir` attributes, isolate mixed
inline runs with `<bdi>`, and observe streamed DOM mutations.

```bash
npm install @bidilens/dom
```

```ts
import { applyBidi, installBidiStyles, observeBidi, restoreBidi } from '@bidilens/dom';

installBidiStyles(document);
applyBidi(document.querySelector('#messages')!);
const watcher = observeBidi(document.querySelector('#messages')!);
// watcher.disconnect() when the view is destroyed.
// restoreBidi(document.querySelector('#messages')!) removes generated bdi
// nodes and restores attributes/styles changed by applyBidi in this session.
```

`applyBidi` preserves `textContent`; generated isolation nodes are idempotent.
Its default `auto` gate performs no DOM mutation at all for an LTR-only scope
in an LTR context, including code elements. RTL ancestors are detected. Set
`intervention: 'always'` only when every block must receive stable markers.
In the unreleased source, the optional helper stylesheet supplies isolation
and code direction without setting alignment. Authored class, inline, and
inherited `text-align: left`, `right`, or `center` remain effective. Choose
`text-align: start` in the host stylesheet when content-relative alignment is
desired. Published `0.4.0` helper styles still set block/cell alignment to
`start`; override that on managed blocks or omit the helper when physical
alignment is inherited.
`restoreBidi` restores the original direction attributes and inline
`unicode-bidi` values remembered in the current JavaScript session. Reapplying
after dynamic content becomes ordinary LTR removes BidiLens-owned presentation,
and unrelated LTR siblings remain untouched. Selectors and detection policy
are configurable. Run the Node/JSDOM example after
building with `pnpm --filter @bidilens/dom example`; consumers running that
Node example also install its host harness with `npm install --save-dev jsdom`.

Starting in `0.4.0`, `skipSelector` also excludes an entire
block/code element containing a matching descendant, and covers standalone
code. This conservative boundary prevents inline traversal and ancestor
direction changes from interfering with a protected region. The surrounding
prose in that same block is deliberately not annotated. Do not use the DOM
adapter inside an editor; the [starter recipe](../../docs/GETTING_STARTED.md)
rejects editor-containing containers even with the older published adapter.
For a dynamic ownership handoff, disconnect and restore before making the
region editable or adding an exclusion; a later skip does not undo prior work.

Ownership is compared against actual attribute/property changes. If application
code intentionally takes ownership of an inline property by assigning exactly
the value BidiLens already owns, that same-value assignment is not observable
through the DOM. Call `restoreBidi(root)` before that handoff; subsequent author
styles are then entirely outside BidiLens ownership.

## Cleanup boundaries (unreleased)

Direction evidence and isolation omit `script`, `style`, `template`, and
currently unrendered subtrees (`display: none`, including normal `hidden`
elements, and `content-visibility: hidden` where layout containment applies).
Non-atomic inline and other containment-ineligible content stays in the
projection because the browser does not hide it. Their source and nodes remain intact. Authored CSS that makes a
hidden element visible is respected. BidiLens does not exclude content solely
because of `aria-hidden` or `visibility: hidden`.
Live `noscript` fallback uses available box-visibility evidence, rather than
assuming every target document enables scripts; visible fallback in a
scripting-disabled frame remains evidence. Without that browser API/layout,
the adapter does not guess the target's scripting state.

The observer watches text and child mutations. After changing visibility,
classes, or styles without a text/child mutation, call `watcher.flush()` or
`applyBidi(root)` to refresh the projection. This is a display adapter, not a
general rendering engine; CSS-generated text and shadow-tree content are not
part of its light-DOM source projection.

`restoreBidi` and automatic RTL-to-LTR cleanup do not normalize the root's
text nodes. Unrelated adjacent or empty text nodes remain intact, including
selection anchors inside excluded editors. Removing generated wrappers may
leave adjacent text nodes in the restored display content; logical text and
rendering are unchanged. BidiLens does not promise to reconstruct the exact
text-node objects it split while first isolating a managed message.

Generated wrappers are owned by node identity in the current adapter instance,
not by `data-bidilens-*` attributes alone. Author-supplied markup or clones from
another instance are not automatically adopted or unwrapped. Use the same
adapter instance for application and restoration, and disconnect an observer
before final cleanup so it does not reapply direction to the restored content.

## Extending selectors (unreleased)

`DEFAULT_BLOCK_SELECTOR` and `DEFAULT_CODE_SELECTOR` expose the adapter's
default selector strings. Extend them per call without changing global state:

```ts
import { applyBidi, DEFAULT_BLOCK_SELECTOR } from '@bidilens/dom';

applyBidi(document.querySelector('#messages')!, {
  blockSelector: `${DEFAULT_BLOCK_SELECTOR},[data-chat-message]`
});
```

Keep the scope restricted to display content. Additional selectors do not make
the DOM adapter safe to run inside a rich-text editor.
