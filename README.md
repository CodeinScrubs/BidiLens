<p align="center">
  <img src="docs/assets/bidilens-social.png" width="760" alt="BidiLens — mixed-direction text, structurally correct">
</p>

# BidiLens

**Standards-first mixed RTL/LTR infrastructure for AI interfaces.**

[![CI](https://github.com/CodeinScrubs/BidiLens/actions/workflows/ci.yml/badge.svg)](https://github.com/CodeinScrubs/BidiLens/actions/workflows/ci.yml)
[![MIT License](https://img.shields.io/badge/license-MIT-22c55e.svg)](LICENSE)
[![Unicode 17.0](https://img.shields.io/badge/Unicode-17.0-8b5cf6.svg)](unicode/README.md)
[![Node 22.12+](https://img.shields.io/badge/Node-22.12%2B-22d3ee.svg)](package.json)

[Persian README / راهنمای فارسی](README.fa.md) ·
[Quick start](#consumer-install) ·
[Security](SECURITY.md) ·
[Contributing](CONTRIBUTING.md) ·
[Project status](docs/V1_BUILD_REPORT.md)

> [!IMPORTANT]
> The JavaScript/web surface is a tested release candidate. Source is public,
> but npm packages are not published yet, and native/desktop platforms remain
> explicit roadmap work rather than claimed support.

BidiLens is an offline, standards-first toolkit for mixed right-to-left and
left-to-right text in AI chat, Markdown, streaming interfaces, web
applications, terminal tools, and security pipelines.

It preserves source order. It does not reverse strings or replace the Unicode
Bidirectional Algorithm. Instead, it supplies the application layer that host
renderers often omit: per-block base direction, semantic inline isolation,
stable streaming state, and explicit bidi-control auditing.

It is also non-interfering by default. If a scanned/rendered scope contains no
RTL strong character or bidi formatting control and inherits LTR direction,
BidiLens emits no `dir`, `<bdi>`, `data-bidilens-*`, or inline-style changes.
English inside an RTL parent is still protected, and integrations that require
stable annotations can opt into `intervention: 'always'`.

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

## Visual proof

The first-strong behavior behind `dir="auto"` chooses the wrong paragraph base
for the flagship sentence. BidiLens analyzes natural-language evidence, keeps
the immutable logical source, and isolates the technical identifier.

| `dir="auto"` — wrong base | BidiLens — content-majority + isolation |
|---|---|
| ![The flagship sentence rendered with the incorrect automatic LTR base](tests/visual/__screenshots__/chromium/flagship-auto.png) | ![The same logical sentence rendered with the correct RTL base and isolated React token](tests/visual/__screenshots__/chromium/flagship-toolkit.png) |

## Why this is more than an RTL stylesheet

| Common approach | Limitation | BidiLens behavior |
|---|---|---|
| Global `direction: rtl` | Breaks English-majority messages and applies one direction to every block | Resolves each paragraph, heading, list item, quote, and table cell independently |
| `dir="auto"` | Uses the first strong character, so leading `React` makes Persian-majority prose LTR | Defaults to natural-language content majority after excluding technical tokens |
| Reverse the string | Corrupts copy, search, logs, prompts, diffs, punctuation, and accessibility order | Never reverses or mutates the stored source |
| Add Unicode controls | Invisible state can leak into source and create Trojan-Source-class risk | Uses semantic markup and separately audits hidden controls |
| Language detection | Adds model/runtime dependencies and can still miss code-heavy prose | Uses deterministic Unicode evidence; no LLM or network is required at runtime |

The project combines direction policy, semantic isolation, streaming stability,
security diagnostics, a conformance corpus, framework adapters, and downstream
testing tools. Existing browser/Unicode rendering engines still perform glyph
reordering and shaping; BidiLens supplies the application structure they need.

## Intended users

- AI chat and assistant interfaces rendering multilingual model output;
- Markdown/documentation renderers with mixed prose, code, links, and tables;
- design-system and framework teams needing reusable React, Vue, Svelte, DOM,
  HTML, or Web Component boundaries;
- security and developer-tool teams auditing invisible bidi controls;
- maintainers building regression evidence for upstream RTL fixes.

## What is implemented

- generated, pinned Unicode 17.0.0 bidi-class and natural-letter lookup data;
- content-majority, first-strong, strict first-strong, explicit, inherited,
  and neutral-fallback direction policies;
- technical-token recognition for code, URLs, email, paths, packages, model
  names, versions, commands, hashes, addresses, dates, times, and numbers,
  plus caller-supplied private identifiers;
- UTF-16 and code-point evidence/range reporting;
- semantic inline-isolation plans without source mutation;
- paragraph-aware streaming with bounded re-analysis and chunk-invariant final
  snapshots across tested source and technical-token boundaries;
- audit/warn/strict security modes and SARIF-compatible diagnostics;
- versioned language-neutral schemas for analysis, security, and stream data;
- safe HTML, DOM, unified/remark/rehype, markdown-it, React, Vue, Svelte, and
  Web Component adapters;
- a conservative terminal adapter and a scriptable CLI;
- 918 schema-validated direction fixtures plus property-based random chunking;
- Chromium, Firefox, and WebKit visual regression coverage;
- bundled GitHub Action for downstream security audits and corpus conformance.

## Packages

| Package | Purpose |
|---|---|
| `@bidilens/core` | Analysis, evidence, isolation, streaming, and security |
| `@bidilens/dom` | DOM annotation, restoration, CSS policy, and observation |
| `@bidilens/html` | XSS-safe semantic HTML serialization |
| `@bidilens/markdown` | unified/remark/rehype and markdown-it plugins |
| `@bidilens/playwright` | Rendering, isolation, selection, clipboard, and geometry assertions |
| `@bidilens/react` | SSR-safe components and streaming hooks |
| `@bidilens/spec` | Versioned cross-language JSON Schemas and schema registry |
| `@bidilens/vue` | Vue 3 component and composables |
| `@bidilens/svelte` | Svelte analysis and streaming stores |
| `@bidilens/web-component` | Framework-independent `<bidi-message>` element |
| `@bidilens/terminal` | ANSI-aware plain-text formatting and diagnostics |
| `@bidilens/cli` | Inspect, render, corpus-test, audit, SARIF, and sanitize |

All public packages are ESM-only, require maintained Node.js 22.12 or newer for
server-side use, include declarations, a package README, license, and runnable example.
Browser packages target current standards-based browsers. The packages are
prepared but **not yet published to npm**.

## Consumer install

After the maintainer publishes and owns the `@bidilens` npm scope:

```bash
npm install @bidilens/core @bidilens/html
```

Framework and Markdown peers are installed by the consuming application. See
each package README for its exact command and supported peer range.

For a no-build browser page, the published Web Component also exposes a
standalone entry that bundles the core and needs no import map:

```html
<script type="module" src="https://unpkg.com/@bidilens/web-component@0.1.0"></script>
<bidi-message text="React یک کتابخانه جاوااسکریپت بسیار محبوب است."></bidi-message>
```

Use the side-effect-free normal package entry plus
`defineBidiMessageElement()` in bundled applications, or import
`@bidilens/web-component/auto` when global registration is deliberate. Both
allow the application to deduplicate `@bidilens/core`. The URL above becomes
usable only after the maintainer-controlled npm publication described below.

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
// Mixed/RTL input gets semantic dir/bdi markup. LTR-only input gets escaped
// semantic HTML without BidiLens attributes or wrappers.
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

The reusable Action is documented in [action/README.md](action/README.md). It
bundles the real CLI implementation, requires no npm install at runtime, and
propagates conformance/security exit codes without constructing shell commands.

## Open-source license and participation

BidiLens is open source under the [MIT License](LICENSE). Unicode inputs and
the attributed Apache-2.0 comparison-corpus subset retain their upstream terms
in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Contributions are welcome;
start with [CONTRIBUTING.md](CONTRIBUTING.md), ask integration questions in
[Discussions](https://github.com/CodeinScrubs/BidiLens/discussions), and use
[private vulnerability reporting](https://github.com/CodeinScrubs/BidiLens/security/advisories/new)
for security-sensitive findings.

## Honest scope

The implemented web/JavaScript packages are release-candidate quality, not a
guarantee about every proprietary renderer. Native Android, Flutter, React
Native, SwiftUI, Electron, VS Code, PDF, screen-reader laboratory validation,
and downstream product patches are not shipped in this repository. npm scope
ownership, trusted-publishing provenance, and release credentials remain
external package-publication prerequisites.

See [limitations](docs/LIMITATIONS.md), [architecture](docs/ARCHITECTURE.md),
[security](docs/SECURITY.md), [publishing](docs/PUBLISHING.md), the
[accessibility checklist](docs/ACCESSIBILITY.md), [migration guide](docs/MIGRATION.md),
[adoption strategy](docs/ADOPTION.md), [maintainer outreach kit](docs/OUTREACH.md),
[FAQ](docs/FAQ.md), [build report](docs/V1_BUILD_REPORT.md),
[sibling-project comparison](docs/PROJECT_COMPARISON.md), and
[roadmap](docs/ROADMAP.md), or request help through [SUPPORT.md](SUPPORT.md).
The binding specification is audited requirement by
requirement in [docs/REQUIREMENT_MATRIX.md](docs/REQUIREMENT_MATRIX.md).
