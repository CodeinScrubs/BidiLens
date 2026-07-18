# BidiLens v0.1.0 Build Report

**Build date:** 2026-07-18  
**Status:** working alpha; validation below reflects commands run in this checkout

## Delivered system

BidiLens is a TypeScript monorepo that supplies the application layer missing from many mixed RTL/LTR interfaces. It delegates visual reordering to standards-compliant browser and operating-system text engines, while adding base-direction detection, semantic isolation, streaming stability, Markdown annotation, DOM integration, React primitives, and security auditing.

### Packages

| Package | Public API | Built artifact |
|---|---|---|
| `@bidilens/core` | analysis, detection, segmentation, isolation, stream state, control audit | ESM + declarations + source map |
| `@bidilens/dom` | `applyBidi`, `observeBidi`, `installBidiStyles`, CSS policy | ESM + declarations + source map |
| `@bidilens/markdown` | `remarkBidi`, `rehypeBidi` | ESM + declarations + source map |
| `@bidilens/react` | components and hooks for messages, code, isolates, and streams | ESM + declarations + source map |
| `@bidilens/vue` | Vue 3 `BidiMessage` and `useBidiDirection` | ESM + declarations + source map |
| `@bidilens/svelte` | reactive `createBidiMessage` store | ESM + declarations + source map |
| `@bidilens/web-component` | `<bidi-message>` custom element | ESM + declarations + source map |
| `@bidilens/cli` | `inspect`, `render`, `test`, `audit`/`security-scan`, `sanitize` | executable ESM + declarations + source map |

### Demonstration application

The Vite/React demo includes:

- editable mixed Persian/English Markdown;
- headings, lists, tables, URLs, inline code, and fenced code;
- real-time direction metrics;
- model-token streaming simulation;
- identifier and path isolation examples;
- hidden Unicode control visualization;
- responsive light/dark styling.

## Important implementation decisions

### Native UBA, application-level policy

The project does not replace the Unicode Bidirectional Algorithm. It detects the base direction for semantic blocks and then relies on native rendering. This avoids maintaining a second text layout engine and keeps shaping, cursor movement, selection, and line breaking under the platform implementation.

### Direction detector

The core scans Unicode code points and classifies strong characters. RTL classification covers the principal RTL script ranges; other Unicode letters are treated as LTR for base-direction purposes. Numbers, punctuation, whitespace, symbols, and emoji are neutral.

Supported policies:

- `content-majority`: default; excludes technical tokens and chooses the
  dominant natural-language direction;
- `first-strong`: compatibility mode matching `dir=auto`-like behavior;
- `strict-uax9`: explicit first-strong base-direction mode; visual reordering
  remains the platform engine's responsibility;
- `majority`: compatibility alias for content-majority;
- configurable fallback, minimum strong count, and majority threshold.

### Streaming state machine

The stream API prevents direction oscillation while tokens arrive.

- `content-majority` is the default and may transition once from a provisional
  fallback to the dominant direction as natural-language evidence arrives;
- `first-strong` locks on the first actual strong character, including when it matches the configured fallback;
- `sticky-majority` locks on the first non-neutral majority result;
- `majority` remains dynamic;
- paragraph snapshots are calculated independently for multiline answers.

### Isolation policy

HTML adapters prefer semantic `dir`, `<bdi>`, and `unicode-bidi:isolate`/`plaintext`. Invisible Unicode isolate controls are available only for plain-text channels. This keeps browser clipboard output clean by default.

### Code policy

`pre`, `code`, `kbd`, `samp`, `var`, paths, versions, and machine identifiers are rendered LTR and isolated. Prose surrounding those elements retains its own direction.

### Security policy

The core and CLI detect:

- LRM/RLM marks;
- embeddings and their pop control;
- LTR/RTL overrides;
- LTR/RTL/first-strong isolates and PDI.

Each finding includes the UTF-16 index, code point, Unicode name, category, and severity. Sanitization is explicit and configurable rather than automatic.

## Validation results

The validation commands listed below completed successfully in this checkout.

| Check | Result |
|---|---|
| TypeScript strict type-check | passed |
| ESLint | passed |
| Vitest | 7 files, 48 tests passed |
| Core package build | passed |
| DOM package build | passed |
| Markdown package build | passed |
| React package build | passed |
| CLI package build | passed |
| Demo production build | passed |
| Direction corpus | 17/17 passed |
| Playwright visual regression | Chromium, Firefox, and WebKit flagship snapshots passed |
| CLI inspect smoke test | passed |
| Playwright visual suite | 3 tests passed (one per Chromium/Firefox/WebKit) |

Package-size measurements and clean consumer-install checks are release work;
no package is described as published.

### Benchmark snapshot

Benchmark input: a 45,000-character mixed Persian/English/code sample, 500 iterations.

| Operation | Total | Average |
|---|---:|---:|
| complete text analysis | 3,294.57 ms | 6.5891 ms |
| directional segmentation | 2,158.72 ms | 4.3174 ms |

These numbers are environment-specific and should be tracked comparatively rather than treated as universal limits. The benchmark found and prompted removal of an initial quadratic neutral-run resolver; the delivered implementation is linear in the number of directional runs.

## Repository workflows

### Local development

```bash
npm install
npm run check
npm run corpus:check
npm run demo
```

### Security audit in CI

```bash
npx bidilens audit src docs --fail-on high
```

### Release sequence

1. Choose and register the npm scope, or rename package identifiers.
2. Set repository, homepage, bugs, author, and funding metadata.
3. Configure npm provenance and GitHub trusted publishing.
4. Run `npm ci`, `npm run check`, and `npm run corpus:check`.
5. Publish in dependency order: core, DOM, Markdown, React, Vue, Svelte, web-component, CLI.
6. Deploy `apps/demo/dist` to a static host.
7. Tag `v0.1.0` and attach the corpus/benchmark results.

## Known v1 boundaries

The implementation is a working alpha, not a substitute for platform-level text rendering, and has not undergone an external security audit.

Not yet included:

- complete Unicode conformance data import and automated Unicode-version generation;
- screenshot regression beyond the flagship fixture across Chromium, Firefox, and WebKit;
- terminal, PDF, Android Compose, SwiftUI, Monaco, and CodeMirror adapters;
- screen-reader laboratory testing;
- confusable/homoglyph and mixed-script identifier detection;
- source-language-aware Trojan Source parsing;
- native Android Compose, Flutter, React Native, and SwiftUI adapters;
- a claimed npm organization and public GitHub release infrastructure.

These are explicitly staged in `docs/ROADMAP.md` rather than hidden behind claims of universal coverage.

## Recommended immediate next milestone

Turn v0.1.0 into a credible public alpha by adding a public issue corpus from real AI interfaces, Playwright screenshots for representative Markdown cases, generated Unicode range data, and one integration pull request against an established open-source AI chat frontend. That evidence will be more persuasive for open-source sponsorship applications than additional unvalidated features.
