# BidiLens

BidiLens is an offline, standards-first toolkit for mixed right-to-left and
left-to-right text in AI chat, Markdown, streaming interfaces, web
applications, terminal tools, and security pipelines.

It preserves source order. It does not reverse strings or replace the Unicode
Bidirectional Algorithm. Instead, it supplies the application layer that host
renderers often omit: per-block base direction, semantic inline isolation,
stable streaming state, and explicit bidi-control auditing.

## The failure this project fixes

```text
React یک کتابخانه جاوااسکریپت بسیار محبوب است.
```

This is Persian-majority prose, so its paragraph base is RTL even though its
first strong character is Latin. `dir="auto"` chooses LTR here. BidiLens's
default `content-majority` policy excludes the technical identifier `React`
from natural-language evidence, chooses RTL, and isolates `React` as an LTR
inline run. The logical source string remains unchanged.

The mirror case stays LTR:

```text
The Persian word کتاب means “book”.
```

## What is implemented

- generated, pinned Unicode 17.0.0 bidi-class and natural-letter lookup data;
- content-majority, first-strong, strict first-strong, explicit, inherited,
  and neutral-fallback direction policies;
- technical-token recognition for code, URLs, email, paths, packages, model
  names, versions, commands, hashes, addresses, dates, times, and numbers;
- UTF-16 and code-point evidence/range reporting;
- semantic inline-isolation plans without source mutation;
- chunk-invariant, paragraph-aware streaming with bounded re-analysis;
- audit/warn/strict security modes and SARIF-compatible diagnostics;
- safe HTML, DOM, unified/remark/rehype, markdown-it, React, Vue, Svelte, and
  Web Component adapters;
- a conservative terminal adapter and a scriptable CLI;
- 722 schema-validated direction fixtures plus property-based random chunking;
- Chromium, Firefox, and WebKit visual regression coverage.

## Packages

| Package | Purpose |
|---|---|
| `@bidilens/core` | Analysis, evidence, isolation, streaming, and security |
| `@bidilens/dom` | DOM annotation, restoration, CSS policy, and observation |
| `@bidilens/html` | XSS-safe semantic HTML serialization |
| `@bidilens/markdown` | unified/remark/rehype and markdown-it plugins |
| `@bidilens/react` | SSR-safe components and streaming hooks |
| `@bidilens/vue` | Vue 3 component and composables |
| `@bidilens/svelte` | Svelte analysis and streaming stores |
| `@bidilens/web-component` | Framework-independent `<bidi-message>` element |
| `@bidilens/terminal` | ANSI-aware plain-text formatting and diagnostics |
| `@bidilens/cli` | Inspect, render, corpus-test, audit, SARIF, and sanitize |

All public packages are ESM-only, require maintained Node.js 22.12 or newer for
server-side use, include declarations, a package README, license, and runnable example.
Browser packages target current standards-based browsers. The packages are
prepared but **not published from this checkout**.

## Consumer install

After the maintainer publishes and owns the `@bidilens` npm scope:

```bash
npm install @bidilens/core @bidilens/html
```

Framework and Markdown peers are installed by the consuming application. See
each package README for its exact command and supported peer range.

## Core usage

```ts
import { analyzeBlock, createBidiStream } from '@bidilens/core';

const source = 'React یک کتابخانه جاوااسکریپت بسیار محبوب است.';
const analysis = analyzeBlock(source);

console.log(analysis.direction); // rtl
console.log(analysis.isolations[0]?.text); // React

const stream = createBidiStream();
stream.push('React ');
stream.push('یک کتابخانه جاوااسکریپت بسیار محبوب است.');
console.log(stream.finish().direction); // rtl
```

## Safe HTML usage

```ts
import { renderBidiHtml } from '@bidilens/html';

const result = renderBidiHtml(userText);
// result.html contains escaped source plus semantic dir/bdi markup.
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

## CLI

```bash
npx @bidilens/cli inspect --text "سلام version 2"
npx @bidilens/cli render --text "React یک کتابخانه محبوب است."
npx @bidilens/cli audit src docs --fail-on high --sarif
npx @bidilens/cli sanitize suspicious.txt --output cleaned.txt
```

Sanitization is opt-in. The default security path reports hidden controls and
does not alter source.

## Reproduce the release evidence

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm run check
pnpm run test:visual
pnpm run packages:types
pnpm run deps:audit
pnpm run release:check
pnpm run sbom
pnpm run sbom:check
```

`release:check` builds and packs every public package, inspects tarball
contents, installs all tarballs into a temporary consumer, compiles with
`skipLibCheck: false`, and runs real imports/assertions. It requires a clean
worktree unless `--allow-dirty` is explicitly used during development.

## Honest scope

The implemented web/JavaScript packages are release-candidate quality, not a
guarantee about every proprietary renderer. Native Android, Flutter, React
Native, SwiftUI, Electron, VS Code, PDF, screen-reader laboratory validation,
and downstream product patches are not shipped in this repository. Registry
ownership, a public repository URL, private security contact, provenance, and
release credentials are also external prerequisites.

See [limitations](docs/LIMITATIONS.md), [architecture](docs/ARCHITECTURE.md),
[security](docs/SECURITY.md), [publishing](docs/PUBLISHING.md), the
[accessibility checklist](docs/ACCESSIBILITY.md), [migration guide](docs/MIGRATION.md),
[FAQ](docs/FAQ.md), [build report](docs/V1_BUILD_REPORT.md),
[sibling-project comparison](docs/PROJECT_COMPARISON.md), and
[roadmap](docs/ROADMAP.md).
