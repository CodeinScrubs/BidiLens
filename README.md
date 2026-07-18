# BidiLens

BidiLens is a standards-first, open-source toolkit for mixed right-to-left and left-to-right text in AI chat interfaces, Markdown renderers, streaming responses, developer tools, and cross-platform web applications.

It does **not** reimplement the Unicode Bidirectional Algorithm. Browsers and native text engines already do that. BidiLens supplies the missing application layer around them:

- deterministic paragraph direction detection;
- safe isolation for untrusted or user-generated strings;
- stable direction during token streaming;
- Markdown AST and rendered HTML annotation;
- DOM post-processing and mutation observation;
- React primitives for chat/message UIs;
- Unicode bidi-control auditing for source and content security;
- a multilingual conformance corpus and regression tests.

## Packages

| Package | Purpose |
|---|---|
| `@bidilens/core` | Direction analysis, isolation, segmentation, streaming, security |
| `@bidilens/dom` | DOM annotation, CSS policy, MutationObserver integration |
| `@bidilens/markdown` | remark and rehype plugins |
| `@bidilens/react` | React components and hooks |
| `@bidilens/cli` | Audit, inspect, and sanitize files |

## Install

```bash
npm install @bidilens/core @bidilens/dom
```

For Markdown:

```bash
npm install @bidilens/markdown unified remark-parse remark-rehype rehype-stringify
```

For React:

```bash
npm install @bidilens/react react
```

## Core usage

```ts
import {
  analyzeText,
  createBidiStream,
  isolateText,
  findBidiControls
} from '@bidilens/core';

const analysis = analyzeText('نسخه v2.1 is ready');
// analysis.direction === 'rtl'

const isolated = isolateText('علی', 'auto');
const controls = findBidiControls(sourceCode);

const stream = createBidiStream({ strategy: 'first-strong', fallback: 'ltr' });
stream.push('...');
stream.push('سلام');
console.log(stream.snapshot().direction); // rtl
```

## Markdown usage

```ts
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { remarkBidi, rehypeBidi } from '@bidilens/markdown';

const html = String(await unified()
  .use(remarkParse)
  .use(remarkBidi)
  .use(remarkRehype, { allowDangerousHtml: false })
  .use(rehypeBidi)
  .use(rehypeStringify)
  .process(markdown));
```

## React usage

```tsx
import { BidiMessage, BidiIsolate } from '@bidilens/react';

export function Message({ text }: { text: string }) {
  return (
    <BidiMessage text={text}>
      {text} — <BidiIsolate>build/main.ts</BidiIsolate>
    </BidiMessage>
  );
}
```

## CLI

```bash
npx bidilens inspect --text "سلام version 2"
npx bidilens audit src docs --fail-on high
npx bidilens sanitize suspicious.txt --output cleaned.txt
```

## Design principles

1. **Standards first.** Use semantic `dir`, `<bdi>`, and CSS `unicode-bidi` isolation rather than visual hacks.
2. **Paragraph scope.** Direction is decided per semantic block, not globally for an entire chat transcript.
3. **Code remains LTR.** Code, paths, terminals, hashes, and machine identifiers are isolated from prose.
4. **Streaming is stable.** A message does not oscillate between directions as tokens arrive.
5. **Security is visible.** Hidden bidi controls can be detected, surfaced, or removed deliberately.
6. **Copy/paste remains clean.** DOM isolation is preferred over injecting invisible control characters into displayed content.

## Repository commands

```bash
npm install
npm run check
npm run demo
npm run benchmark
npm run corpus:check
```

See `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, and `docs/ROADMAP.md` for the complete v1 design.
