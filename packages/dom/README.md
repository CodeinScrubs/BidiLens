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
Installed default alignment rules use `:where(...)` and therefore zero
specificity: an authored class or inline `text-align: left`, `right`, or
`center` wins without disabling BidiLens direction/isolation.
`restoreBidi` restores the original direction attributes and inline
`unicode-bidi` values remembered in the current JavaScript session. Reapplying
after dynamic content becomes ordinary LTR removes BidiLens-owned presentation,
and unrelated LTR siblings remain untouched. Selectors and detection policy
are configurable. Run the Node/JSDOM example after
building with `pnpm --filter @bidilens/dom example`; consumers running that
Node example also install its host harness with `npm install --save-dev jsdom`.

In the next release (after `0.3.3`), `skipSelector` also excludes an entire
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
