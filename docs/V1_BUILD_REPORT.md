# BidiLens 0.1.0 web release-candidate report

**Evidence date:** 2026-07-22

**License:** MIT, with Unicode-data and Apache-2.0 corpus third-party notices

**Publication status:** canonical source repository public; npm packages not published

**Recommendation:** suitable for maintainer-controlled web pilots after the
external publication gates; not a universal cross-platform production release

## Mission and architecture

BidiLens preserves the logical model/source string and supplies the missing
application layer for mixed-direction output:

```text
source → structural block → Unicode/evidence analysis → isolation plan
       → framework/markup adapter → native browser/OS bidi renderer
```

It never reverses stored strings and does not reimplement visual UAX #9
reordering. The default `content-majority` policy excludes technical tokens,
selects the dominant natural-language direction, and isolates technical or
opposite-direction runs.

## Shipped package status

| Surface | Status | Evidence / boundary |
|---|---|---|
| `@bidilens/core` | Complete and tested | Unicode analysis, raw and policy-adjusted evidence, configurable technical vocabulary, dual-offset isolation, security, revisable streaming with tested final chunk invariance, properties; 95.38% lines |
| `@bidilens/dom` | Complete and tested | apply/restore, custom selectors, styles, observer lifecycle, detached/cross-realm DOM |
| `@bidilens/html` | Complete and tested | escaped semantic blocks and `<bdi>` isolation, tag validation, source preservation |
| `@bidilens/markdown` | Complete and tested | unified/remark/rehype and typed markdown-it; blocks/lists/tables/quotes/code/math/XSS |
| `@bidilens/playwright` | Complete and tested | reusable direction/source/isolation/selection/clipboard/geometry assertions; 100% lines and real three-browser use |
| `@bidilens/react` | Complete and tested | SSR-safe components, per-paragraph mixed-stream rendering, isolation, direction and stream hooks |
| `@bidilens/spec` | Complete and tested | five versioned language-neutral schema documents, strict registry API, dual-offset compatibility, real-output and negative validation tests |
| `@bidilens/vue` | Complete and tested | Vue component, SSR, analysis and stream composables |
| `@bidilens/svelte` | Complete and tested | idiomatic analysis and streaming stores |
| `@bidilens/web-component` | Complete and tested | Side-effect-free main import, explicit/auto registration entries, safe DOM construction, self-contained CDN entry, real three-browser loading |
| `@bidilens/terminal` | Complete and tested | ANSI-aware conservative output; emulator shaping remains host-dependent |
| `@bidilens/cli` | Complete and tested | inspect/render/test/audit/lint/security-scan/sanitize; human/JSON/SARIF; real packed binary |
| Bundled GitHub Action | Complete and tested | Node 24 audit/corpus action, human/JSON/SARIF, workspace-safe report path, real exit codes; source and generated-bundle probes |
| React/Vite playground | Complete and tested | Static/offline; EN/FA UI, policy/security controls, adjustable stream, live four-way comparison, AST/evidence/isolation/security, searchable 918-case asset, copy verification, JSON/semantic HTML export, hash state and explicit theme; three-browser flow |
| Corpus | Partial (with exact missing functionality) | 918 schema-valid technical/user cases, including 196 attributed sibling seeds; zero native-speaker-certified templates |
| VS Code, Electron, PDF | Unsupported (with technical reason) | No implementations exist; hollow packages were rejected and these require host-specific security/print tests |
| Android, Flutter, React Native, Swift | Unsupported (with technical reason) | No implementations or executable SDK evidence exist in this repository |
| Upstream AI-product patches | Unsupported (with technical reason) | No current-policy dossiers or patch sets exist; external research/submission was not authorized or fabricated |

## Reproduced validation

| Command / gate | Observed result |
|---|---|
| `pnpm run check` | Unicode, strict TypeScript, ESLint, anti-hollow package depth, coverage, corpus, docs, 12 package builds plus demo, Action bundle and generated-artifact probes pass |
| Vitest within `check` | 16 files, 234 tests pass |
| Coverage (seeded run) | 90.00% statements, 82.35% branches, 92.12% functions, 92.95% lines; core 95.38%, Playwright helpers 100% lines |
| `pnpm run corpus:check` | 918/918; 0 native-speaker-reviewed |
| `pnpm run test:visual` | 24/24 across Chromium, Firefox, WebKit on the Windows/Arial baseline OS, including real standalone-module loading and the bilingual playground's controls/corpus/copy/theme/exports; CI aligns pixel and geometry checks to that OS while Linux runs semantic/build/package gates |
| `pnpm -r --if-present run example` | all 12 public package examples run in the workspace |
| `pnpm run packages:types` | all 12 ESM package layouts and the spec package's five JSON subpaths pass real ATTW packing; CJS is intentionally unsupported |
| publint 0.3.21 against every package directory | all 12 packed manifests and published file layouts report `All good!` |
| `pnpm run deps:audit` | no known vulnerabilities at audit time |
| `pnpm licenses list --prod` | runtime dependency inventory reports MIT, ISC, BSD-2-Clause, and Python-2.0 licenses; Unicode data and the imported Apache-2.0 corpus are covered separately by the committed third-party notices |
| `pnpm outdated -r` | only `@types/node` 26 and TypeScript 7 are newer majors; types stay aligned to supported Node 24 and TypeScript 6.0.3 is the newest line accepted by the installed `typescript-eslint` peer range |
| `pnpm run sbom` + `pnpm run sbom:check` | CycloneDX 1.7; 584 components, 598 dependency relationships. cdxgen also reports inherited `NODE_PATH` in the pnpm execution environment; validation does not treat that environment warning as a component finding |
| actionlint 1.7.12 | CI, release-preparation, benchmark, and opt-in Pages workflows pass |
| `pnpm run action:check` | 187,701-byte bundle; Node 24 metadata/notices and unresolved-import checks pass; built artifact returns 0 for safe source and 2 for a strict high-risk control without mutation |
| Supported Node probes | built core and CLI pass Node 22.22.1 and 24.18.0; an additional Node 20.19.5 compatibility probe passed, but that EOL line is not a production support claim |
| Packed framework peer probes | shipped examples pass React/React DOM 18.3.1, Vue/server-renderer 3.5.0, and Svelte 4.2.20; the primary consumer covers React 19.2.8, Vue 3.5.40, and Svelte 5 |
| `pnpm run release:check` | strict clean-worktree build/pack/inspect/install/type/runtime/CLI consumer passes; exact examples extracted from all 12 tarballs execute. The pre-commit development tree also passed with `--allow-dirty` |

Visual coverage includes the four-way flagship comparison, geometry, English
mirror, per-paragraph direction, logical selection in three engines, actual
Chromium clipboard text, stream settlement, dark mode/zoom, and structured
Markdown heading/list/blockquote/table/code output.

## Artifact sizes

Aggregate emitted JavaScript, including chunks and before minification/gzip:

| Package | Bytes | Enforced budget |
|---|---:|---:|
| CLI | 13,084 | 32,768 |
| Core | 112,110 | 118,784 |
| DOM | 17,698 | 20,480 |
| HTML | 4,321 | 12,288 |
| Markdown | 16,455 | 24,576 |
| Playwright | 8,542 | 16,384 |
| React | 11,277 | 16,384 |
| Spec | 9,160 | 24,576 |
| Svelte | 1,855 | 8,192 |
| Terminal | 4,233 | 8,192 |
| Vue | 4,422 | 12,288 |
| Web Component | 34,384 | 81,920 |

The core artifact is 24,051 bytes with gzip and 17,776 bytes with Brotli on
this build. Its unminified increase funds exact batch/final token-policy parity
across the tested token grammar and stream chunk boundaries; applications that
do not import the stream API can still tree-shake that implementation. Live
snapshots remain intentionally revisable while an unfinished token can still
change classification; `finish()` is the exact finalization boundary.

The Web Component total deliberately includes the shared main/auto-registration
entries and the minified self-contained browser entry. Applications use the
side-effect-free main entry for dependency deduplication and call registration
explicitly; no-build pages trade that for one standalone URL.

The release verifier also checks export maps, declarations, licenses, packed
examples, Unicode notices, rewritten workspace dependencies, strict consumer
types with `skipLibCheck: false`, runtime imports/assertions, and the installed
CLI. It also checks the imported corpus license/notice and rejects a standalone
browser artifact containing unresolved `@bidilens/*` imports. It executes the
exact `examples/basic.mjs` extracted from every tarball with the documented
host/peer dependencies.

## Performance snapshot

Host: Windows 10.0.19045 x64, Node 25.2.1, Intel i7-4810MQ 2.80 GHz,
8 logical CPUs. Selected averages:

- 1 KB / 10 KB / 100 KB / 1 MB analysis: 0.4718 / 4.3712 / 43.8334 /
  478.6787 ms;
- 100,000 units streamed in 1,000 chunks: 251.4544 ms incremental versus
  22,624.4040 ms for full accumulated reparse after every chunk;
- 10,000 one-character pushes: 44.6316 ms;
- 500-item deep list: 15.9302 ms analysis;
- 1,000-row table: 32.2007 ms analysis.

See the complete [methodology and matrix](PERFORMANCE.md). These are comparative
local numbers, not a service-level objective.

## Security and supply chain

- Hidden/explicit controls are reported, not silently removed.
- Ordinary Persian ZWNJ prose has dedicated false-positive coverage.
- Raw plain-text HTML output is escaped; Markdown examples keep raw HTML off.
- Unicode 17 bidi-class and general-category inputs are checksum-pinned and attributed.
- Imported comparison-corpus text is explicitly marked, Apache-2.0 attributed,
  and shipped with the exact upstream license in the CLI payload.
- Actions are commit-SHA pinned with read-only default permissions.
- The SBOM generator is version-pinned and its output is independently checked.
- Property-test seeds are pinned; consecutive coverage runs produce identical
  counts and percentages while failure output retains fast-check replay data.
- Runtime Commander and the compatible ESLint/Vite toolchain majors were
  refreshed during the final audit; incompatible/mismatched major updates are
  recorded rather than forced through the release candidate.
- No external penetration test or security audit is claimed.

## Sibling-project comparison

The canonical checkout is the strongest reproducible JavaScript/web
implementation among the local sibling folders: 12 public packages, 16 test
files with 234 tests, 918 fixtures, current generated Unicode data, real
three-engine visual evidence, and clean package-consumer gates. Broader
native/desktop ideas found in sibling documentation are retained in the
[traceability audit](PROJECT_COMPARISON.md), not misrepresented as working code.

## Release decision

The code artifacts are ready for a **maintainer-controlled public web beta**
once all of these external gates are completed:

1. prove ownership or rename the `@bidilens` npm scope;
2. configure trusted npm publishing/provenance and protected human approval;
3. perform final name/trademark review;
4. obtain native-language and accessibility review appropriate to claims.

Broad production or “all platforms” readiness is **not** claimed because native
packages, Tier-2 desktop/PDF surfaces, upstream integrations, native-speaker
certification, accessibility laboratory testing, an external security audit,
and a real downstream pilot remain absent. Milestone tags beyond `m1` were not
retroactively fabricated; publishing the reviewed source does not reconstruct
the original stepwise tag history.
