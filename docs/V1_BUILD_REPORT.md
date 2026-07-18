# BidiLens 0.1.0 web release-candidate report

**Evidence date:** 2026-07-18

**License:** MIT, with Unicode third-party notices

**Publication status:** prepared locally; not published

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
| `@bidilens/core` | Complete and tested | Unicode analysis, evidence, isolation, security, streaming, properties; 94.10% lines |
| `@bidilens/dom` | Complete and tested | apply/restore, custom selectors, styles, observer lifecycle, detached/cross-realm DOM |
| `@bidilens/html` | Complete and tested | escaped semantic blocks and `<bdi>` isolation, tag validation, source preservation |
| `@bidilens/markdown` | Complete and tested | unified/remark/rehype and typed markdown-it; blocks/lists/tables/quotes/code/XSS |
| `@bidilens/react` | Complete and tested | SSR-safe components, isolation, direction and stream hooks |
| `@bidilens/vue` | Complete and tested | Vue component, SSR, analysis and stream composables |
| `@bidilens/svelte` | Complete and tested | idiomatic analysis and streaming stores |
| `@bidilens/web-component` | Complete and tested | SSR-safe registration, safe DOM construction, attributes/light-DOM restoration |
| `@bidilens/terminal` | Complete and tested | ANSI-aware conservative output; emulator shaping remains host-dependent |
| `@bidilens/cli` | Complete and tested | inspect/render/test/audit/lint/security-scan/sanitize; human/JSON/SARIF; real packed binary |
| React/Vite demo | Partial (with exact missing functionality) | Production build passes; lacks the requested full bilingual corpus browser, evidence inspector, shareable state, and export workflow |
| Corpus | Partial (with exact missing functionality) | 722 schema-valid technical/user cases; zero native-speaker-certified templates |
| VS Code, Electron, PDF | Unsupported (with technical reason) | No implementations exist; hollow packages were rejected and these require host-specific security/print tests |
| Android, Flutter, React Native, Swift | Unsupported (with technical reason) | No implementations or executable SDK evidence exist in this repository |
| Upstream AI-product patches | Unsupported (with technical reason) | No current-policy dossiers or patch sets exist; external research/submission was not authorized or fabricated |

## Reproduced validation

| Command / gate | Observed result |
|---|---|
| `pnpm run check` | Unicode, strict TypeScript, ESLint, coverage, corpus, docs, 10 package builds and demo build pass |
| Vitest within `check` | 12 files, 130 tests pass |
| Coverage | 86.89% statements, 75.15% branches, 90.61% functions, 91.71% lines; core 94.10% lines |
| `pnpm run corpus:check` | 722/722; 0 native-speaker-reviewed |
| `pnpm run test:visual` | 18/18 across Chromium, Firefox, WebKit on the Windows/Arial baseline OS; CI aligns pixel and geometry checks to that OS while Linux runs semantic/build/package gates |
| `pnpm -r --if-present run example` | all 10 public package examples run in the workspace |
| `pnpm run packages:types` | all 10 ESM package layouts pass real ATTW packing; CJS is intentionally unsupported |
| publint 0.3.21 against every package directory | all 10 packed manifests and published file layouts report `All good!` |
| `pnpm run deps:audit` | no known vulnerabilities at audit time |
| `pnpm licenses list --prod` | runtime dependency inventory contains only MIT and ISC licenses; Unicode data is covered separately by the committed third-party notices |
| `pnpm outdated -r` | only `@types/node` 26 and TypeScript 7 are newer majors; types stay aligned to supported Node 24 and TypeScript 6.0.3 is the newest line accepted by the installed `typescript-eslint` peer range |
| `pnpm run sbom` + `pnpm run sbom:check` | CycloneDX 1.7; 584 components, 596 dependency relationships |
| actionlint 1.7.12 | CI and disabled release-preparation workflows pass |
| Supported Node probes | built core and CLI pass Node 22.22.1 and 24.18.0; an additional Node 20.19.5 compatibility probe passed, but that EOL line is not a production support claim |
| Packed framework peer probes | shipped examples pass React/React DOM 18.3.1, Vue/server-renderer 3.5.0, and Svelte 4.2.20; the primary consumer covers React 19.2.7, Vue 3.5.40, and Svelte 5 |
| `pnpm run release:check` | clean-tree build/pack/inspect/install/type/runtime/CLI consumer passes; exact examples extracted from all 10 tarballs execute |

Visual coverage includes the four-way flagship comparison, geometry, English
mirror, per-paragraph direction, logical selection in three engines, actual
Chromium clipboard text, stream settlement, dark mode/zoom, and structured
Markdown heading/list/blockquote/table/code output.

## Artifact sizes

Aggregate emitted JavaScript, including chunks and before minification/gzip:

| Package | Bytes | Enforced budget |
|---|---:|---:|
| CLI | 12,811 | 32,768 |
| Core | 62,722 | 65,536 |
| DOM | 7,807 | 16,384 |
| HTML | 3,616 | 12,288 |
| Markdown | 12,995 | 24,576 |
| React | 7,274 | 16,384 |
| Svelte | 1,749 | 8,192 |
| Terminal | 4,155 | 8,192 |
| Vue | 3,804 | 12,288 |
| Web Component | 2,142 | 8,192 |

The release verifier also checks export maps, declarations, licenses, packed
examples, Unicode notices, rewritten workspace dependencies, strict consumer
types with `skipLibCheck: false`, runtime imports/assertions, and the installed
CLI. It executes the exact `examples/basic.mjs` extracted from every tarball
with the documented host/peer dependencies.

## Performance snapshot

Host: Windows 10.0.19045 x64, Node 24.18.0 LTS, Intel i7-4810MQ 2.80 GHz,
8 logical CPUs. Selected averages:

- 1 KB / 10 KB / 100 KB / 1 MB analysis: 1.0391 / 8.5716 / 99.4084 /
  869.9294 ms;
- 100,000 units streamed in 1,000 chunks: 102.0627 ms incremental versus
  56,853.5192 ms for full accumulated reparse after every chunk;
- 10,000 one-character pushes: 28.8889 ms;
- 500-item deep list: 43.6502 ms analysis;
- 1,000-row table: 79.3424 ms analysis.

See the complete [methodology and matrix](PERFORMANCE.md). These are comparative
local numbers, not a service-level objective.

## Security and supply chain

- Hidden/explicit controls are reported, not silently removed.
- Ordinary Persian ZWNJ prose has dedicated false-positive coverage.
- Raw plain-text HTML output is escaped; Markdown examples keep raw HTML off.
- Unicode 17 bidi-class and general-category inputs are checksum-pinned and attributed.
- Actions are commit-SHA pinned with read-only default permissions.
- The SBOM generator is version-pinned and its output is independently checked.
- Runtime Commander and the compatible ESLint/Vite toolchain majors were
  refreshed during the final audit; incompatible/mismatched major updates are
  recorded rather than forced through the release candidate.
- No external penetration test or security audit is claimed.

## Sibling-project comparison

The canonical checkout is the strongest reproducible JavaScript/web
implementation among the local sibling folders: 10 public packages, 12 test
files, hundreds of assertions, 722 fixtures, current generated Unicode data,
real three-engine visual evidence, and clean package-consumer gates. Broader
native/desktop ideas found in sibling documentation are retained in the
[traceability audit](PROJECT_COMPARISON.md), not misrepresented as working code.

## Release decision

The code artifacts are ready for a **maintainer-controlled public web beta**
once all of these external gates are completed:

1. prove ownership or rename the `@bidilens` npm scope;
2. create the canonical public repository and add real repository/homepage/bug
   metadata and maintainer identity;
3. configure private security and conduct-reporting channels;
4. configure trusted publishing/provenance and protected human approval;
5. perform final name/trademark review;
6. obtain native-language and accessibility review appropriate to claims.

Broad production or “all platforms” readiness is **not** claimed because native
packages, Tier-2 desktop/PDF surfaces, upstream integrations, native-speaker
certification, accessibility laboratory testing, an external security audit,
and a real downstream pilot remain absent. Milestone tags beyond `m1` were not
retroactively fabricated; the final consolidated work is committed, but the
original stepwise tag history cannot be reconstructed honestly.
