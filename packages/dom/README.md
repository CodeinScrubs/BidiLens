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
`restoreBidi` restores the original direction attributes and inline
`unicode-bidi` values remembered in the current JavaScript session. Selectors
and detection policy are configurable. Run the Node/JSDOM example after
building with `pnpm --filter @bidilens/dom example`; consumers running that
Node example also install its host harness with `npm install --save-dev jsdom`.
