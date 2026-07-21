# @bidilens/html

Serialize untrusted plain text to escaped semantic HTML with per-paragraph
direction and `<bdi>` isolation. Source text is never reversed or interpreted
as raw HTML.

```bash
npm install @bidilens/html
```

```ts
import { renderBidiHtml } from '@bidilens/html';

const { html } = renderBidiHtml(
  'React یک کتابخانه جاوااسکریپت بسیار محبوب است.'
);
// <p dir="rtl"> with React in <bdi dir="ltr">
```

LTR-only input in an LTR context is serialized without BidiLens direction,
data attributes, or isolation wrappers; caller-supplied classes are preserved. Pass
`{ inheritedDirection: 'rtl' }` when embedding it under RTL, or
`{ intervention: 'always' }` for the former always-annotated output.

`blockTag` and `containerTag` accept a conservative allowlist of ordinary
semantic container elements. Executable, raw-text, embedded, foreign-content,
and void tags are rejected even when their names are syntactically valid.

After building the repository, run the packaged example with
`pnpm --filter @bidilens/html example`.
