# BidiLens current verification and release report

> This report separates verified publication from broader production claims.
> Web/package `0.4.0` and Android `0.1.2` are public, with protected publication,
> registry-only consumer checks, and immutable release evidence. That does not
> certify every language, device, accessibility path, or downstream application.

**Current-tree evidence date:** 2026-09-07

## Current 0.4.0 release evidence — 2026-09-07

All 12 npm `0.4.0` packages are public from protected source commit
`46b9b21c6b58cdaa7b0b5e3473aa253ee6c07e52`; Android stays at its separately
published `0.1.2`. [PR #84](https://github.com/CodeinScrubs/BidiLens/pull/84)
passed all [19 CI jobs](https://github.com/CodeinScrubs/BidiLens/actions/runs/34053633393)
and [five CodeQL analyses](https://github.com/CodeinScrubs/BidiLens/actions/runs/34053633462).
The reviewed and merged trees match exactly. Protected npm run
[`34104056339`](https://github.com/CodeinScrubs/BidiLens/actions/runs/34104056339)
repeated the release gates and published through OIDC.

The integration change passed 479 tests in 19 files, with 92.32% statements,
86.43% branches, 95.02% functions, and 95.07% lines. All 12 packed packages,
declaration layouts, executable package examples, and the four actual CLI
recipes passed consumer checks. The new editor exclusion regression passed
in Chromium, Firefox, and WebKit. All 33 hosted browser tests passed. A local
Firefox navigation timeout also reproduced against a minimal non-BidiLens
HTTP server; universal local-browser reliability is not claimed.

All retained/public package bytes, `latest` tags, registry integrity and SLSA
source provenance were independently verified. A separate registry-only
consumer passed strict TypeScript, adapter/runtime/source-preservation/LTR,
guide and DOM-exclusion checks, installed CLI corpus tests, and `npm audit
signatures`. The annotated immutable
[`v0.4.0` release](https://github.com/CodeinScrubs/BidiLens/releases/tag/v0.4.0)
retains exact artifacts, manifest, public evidence, and a validated CI SBOM
(523 components, 537 dependency relationships); asset digests and GitHub's
signed release attestation were verified. See [publication evidence](PUBLISHING.md).

The Start here guide, CLI adapter selection, editor-free starter guard,
idempotent cleanup, DOM `skipSelector` fix, and AST bundle import audit were
independently reviewed. No inference policy or native source changed.

## Earlier release evidence

**License:** MIT, with Unicode-data and Apache-2.0 corpus third-party notices

**Historical publication status:** all 12 `0.3.3` packages were independently
verified with registry integrity, then-current `latest` tags, and SLSA provenance; exact source commit
`51dcd971efa5873a393b90cb6311c73f4315b8e8` has an annotated `v0.3.3` tag and an
immutable GitHub release containing the retained tarballs, release manifest,
and CycloneDX 1.7 SBOM. Earlier releases remain immutable historical archives.
The native Android `0.1.2` core, Views, and Compose modules from the same
source commit are signed and public on Maven Central with an annotated tag,
immutable release, and public-consumer evidence.

**Recommendation:** suitable for bounded, maintainer-controlled web and Android
pilots; not a universal cross-platform production release

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
| `@bidilens/core` | Complete and tested | Unicode analysis, raw and policy-adjusted evidence, configurable technical vocabulary, dual-offset isolation, security, revisable streaming with tested final chunk invariance, properties; 96.32% lines |
| `@bidilens/dom` | Complete and tested | apply/restore, custom selectors, protected descendant/standalone-code exclusions, styles, observer lifecycle, detached/cross-realm DOM |
| `@bidilens/html` | Complete and tested | escaped semantic blocks and `<bdi>` isolation, tag validation, source preservation |
| `@bidilens/markdown` | Complete and tested | unified/remark/rehype and typed Markdown-It batch adapters; blocks/lists/tables/quotes/code/math/XSS; rich Markdown-It stream with AST/HTML/isolation/security final parity, dirty/pending ranges, and 97.30% lines |
| `@bidilens/playwright` | Complete and tested | reusable direction/source/isolation/selection/clipboard/geometry assertions; 100% lines and real three-browser use |
| `@bidilens/react` | Complete and tested | SSR-safe components, per-paragraph mixed-stream rendering, isolation, direction and stream hooks |
| `@bidilens/spec` | Complete and tested | five versioned language-neutral schema documents, strict registry API, dual-offset compatibility, real-output and negative validation tests |
| `@bidilens/vue` | Complete and tested | Vue component, SSR, analysis and stream composables |
| `@bidilens/svelte` | Complete and tested | idiomatic analysis and streaming stores |
| `@bidilens/web-component` | Complete and tested | Side-effect-free main import, explicit/auto registration entries, safe DOM construction, self-contained CDN entry, real three-browser loading |
| `@bidilens/terminal` | Complete and tested | ANSI-aware conservative output; emulator shaping remains host-dependent |
| `@bidilens/cli` | Complete and tested | offline guide with 12 routes/four tested recipes; inspect/render/test/audit/lint/security-scan/sanitize; human/JSON/SARIF; real packed binary |
| Bundled GitHub Action | Complete and tested | Node 24 audit/corpus action, human/JSON/SARIF, workspace-safe report path, real exit codes; source and generated-bundle probes |
| React/Vite playground | Complete and tested | Static/offline; EN/FA UI, policy/security controls, adjustable stream, live four-way comparison, AST/evidence/isolation/security, searchable 932-case asset, copy verification, JSON/semantic HTML export, hash state and explicit theme; three-browser flow |
| Corpus | Partial (with exact missing functionality) | 932 schema-valid technical/user cases, including 196 attributed sibling seeds; zero native-speaker-certified templates |
| VS Code, Electron, PDF | Unsupported (with technical reason) | No implementations exist; hollow packages were rejected and these require host-specific security/print tests |
| Native Android | Implemented; `0.1.2` published | Signed Maven Central core, Views, and Compose artifacts with combining-mark parity and host-property ownership fixes; sample APK; 932-case verification; 31 core, 13 Views, and 9 Compose JVM tests; lint/AAR build; isolated Maven-local and public-only consumers; and API 35/36 emulator UI evidence |
| Apple Swift/UIKit/SwiftUI | Implemented in source; registry and physical-device validation pending | Swift Package, generated Unicode 17 tables, 932-case corpus tests, UIKit adapters, UIKit-backed SwiftUI `BidiText`, independent physical alignment, and hosted macOS/iOS Simulator gates |
| Windows .NET/WPF | Implemented in source; NuGet and physical-device validation pending | Dependency-free .NET 8 core, WPF adapters, 932-case executable corpus gate, state/selection restoration, physical-left RTL test, sample, build and package gates |
| Rust | Implemented in source; crates.io and downstream validation pending | Native core, generated Unicode 17 tables, byte/UTF-16/code-point offsets, 932-case conformance, Linux/macOS/Windows CI, and a runnable example |
| Flutter and React Native | Unsupported (with technical reason) | No implementations, generated corpus representations, package builds, widget tests, or host integration evidence exist in this repository |
| Upstream AI-product integrations | Two native contributions merged; two code PRs open (checked 2026-09-07) | [Streamdown #569](https://github.com/vercel/streamdown/pull/569) and [CoderAI #3](https://github.com/mohamadreza1368/coderAI/pull/3) are merged as native fixes without a BidiLens package dependency. [Hermes #72508](https://github.com/NousResearch/hermes-agent/pull/72508) and [Cline #12724](https://github.com/cline/cline/pull/12724) remain open. A merge is not evidence of BidiLens dependency adoption, a production pilot, or company endorsement; see the [outreach log](OUTREACH_LOG.md). |

## Historical 0.3.3 validation snapshot — 2026-09-02

These exact counts, versions, and commands preserve the earlier release's
evidence. Current 0.4.0 validation is recorded above; historical `latest` and
dependency-update results are not current registry claims.

| Command / gate | Observed result |
|---|---|
| `pnpm run check` | Unicode, strict TypeScript, ESLint, anti-hollow package depth, coverage, corpus, docs, 12 package builds plus demo, Action bundle and generated-artifact probes pass |
| Vitest within `check` | 17 files, 439 tests pass |
| Coverage (seeded run) | 92.25% statements, 86.28% branches, 94.86% functions, 95.05% lines; core 96.32%, Markdown 97.30%, Playwright helpers 100% lines |
| `pnpm run corpus:check` | 932/932; 0 native-speaker-reviewed |
| `pnpm run android:check` | Kotlin core/Views/Compose unit suites, Android lint, all debug assemblies, and the sample APK pass with JDK 21 and SDK 36 |
| Android device gates | 3/3 Views and 3/3 Compose UI tests pass locally on Android 16/API 36.1; CI defines a pinned API 35 emulator gate |
| `pnpm run test:visual` | 30/30 across Chromium, Firefox, WebKit on the Windows/Arial baseline OS, including real standalone-module loading, screenshot-derived Persian medical prose, and the bilingual playground's controls/corpus/copy/theme/exports; CI aligns pixel and geometry checks to that OS while Linux runs semantic/build/package gates |
| `pnpm -r --if-present run example` | all 12 public package examples run in the workspace |
| `pnpm run packages:types` | all 12 ESM package layouts and the spec package's five JSON subpaths pass real ATTW packing; CJS is intentionally unsupported |
| publint 0.3.21 against every package directory | all 12 packed manifests and published file layouts report `All good!` |
| `pnpm run deps:audit` | no known vulnerabilities at audit time |
| `pnpm licenses list --prod` | runtime dependency inventory reports MIT, ISC, BSD-2-Clause, and Python-2.0 licenses; Unicode data and the imported Apache-2.0 corpus are covered separately by the committed third-party notices |
| `pnpm outdated -r` | only `@types/node` 26 and TypeScript 7 are newer majors; types stay aligned to supported Node 24 and TypeScript 6.0.3 is the newest line accepted by the installed `typescript-eslint` peer range |
| `pnpm run sbom` + `pnpm run sbom:check` | CycloneDX 1.7; 523 components, 537 dependency relationships. cdxgen also reports inherited process environment warnings in the local execution environment; validation does not treat those environment warnings as component findings |
| actionlint 1.7.12 | CI, release-preparation, benchmark, and opt-in Pages workflows pass |
| `pnpm run action:check` | 185,234-byte bundle; Node 24 metadata/notices and unresolved-import checks pass; built artifact returns 0 for safe source and 2 for a strict high-risk control without mutation |
| Supported Node probes | built core and CLI pass Node 22.22.1 and 24.18.0; an additional Node 20.19.5 compatibility probe passed, but that EOL line is not a production support claim |
| Packed framework peer probes | shipped examples pass React/React DOM 18.3.1, Vue/server-renderer 3.5.0, and Svelte 4.2.20; the primary consumer covers React 19.2.8, Vue 3.5.40, and Svelte 5 |
| `pnpm run release:check` | strict clean-worktree build/pack/inspect/install/type/runtime/CLI consumer passes; exact examples extracted from all 12 tarballs execute. The pre-commit development tree also passed with `--allow-dirty` |
| `pnpm run npm:release:dry-run -- --version 0.3.3` | all 12 aligned tarballs packed successfully before publication; no registry mutation occurred |
| GitHub CI for release PR | [PR #79 CI](https://github.com/CodeinScrubs/BidiLens/actions/runs/33589740575) passed all 19 jobs, including Node 22/24, packed consumers, Windows/macOS, three browser engines, Android API 35, Apple, Windows/.NET, Rust on three OSes, audit/SBOM, workflow lint, and Markdown-It 13/14/15. All five [CodeQL analyses](https://github.com/CodeinScrubs/BidiLens/actions/runs/33589740613) also passed: 24 required contexts in total |
| Protected npm publication | [workflow run `33591632030`](https://github.com/CodeinScrubs/BidiLens/actions/runs/33591632030) passed the full release gate, published all 12 `0.3.3` packages through OIDC trusted publishing, verified registry integrity/provenance, and retained the exact tarballs and manifest |
| Immutable GitHub release | [`v0.3.3`](https://github.com/CodeinScrubs/BidiLens/releases/tag/v0.3.3) resolves to published commit `51dcd971efa5873a393b90cb6311c73f4315b8e8`; GitHub reports the release immutable and records SHA-256 digests for all 12 package tarballs, the release manifest, and CycloneDX 1.7 SBOM |
| External npm consumer | all 12 public `0.3.3` packages installed from the registry; strict TypeScript, adapter/runtime imports, mixed Persian/English direction, source preservation, streaming, CLI, and pure-LTR no-op passed. `npm audit signatures` verified 114 signatures and 53 attestations across the installed dependency tree |
| Android release CI | [PR #79 CI](https://github.com/CodeinScrubs/BidiLens/actions/runs/33589740575) passed the Android libraries/sample, isolated Maven consumer, and API 35 device jobs |
| Protected Android publication | [workflow run `33610612564`](https://github.com/CodeinScrubs/BidiLens/actions/runs/33610612564) signed and published all three Android `0.1.2` modules to Maven Central |
| Public Maven consumer | all 15 primary files matched retained workflow bytes; 15 detached signatures and 30 Central checksums verified; an empty-Maven-Local consumer resolved all three public coordinates and built |
| Immutable Android release | [`android-v0.1.2`](https://github.com/CodeinScrubs/BidiLens/releases/tag/android-v0.1.2) resolves to the exact published commit and retains the AARs, sample APK, Maven repository, Central evidence, public key, and SHA-256 checksums |

## Post-release outreach evidence

Outreach remains independent of publication. The [outreach log](OUTREACH_LOG.md)
links every live route, records the merged Streamdown and CoderAI native fixes and two
open host-code PRs, explains the issue/discussion routes, and lists deliberate
anti-spam deferrals. The Streamdown and CoderAI changes have verified upstream merges;
neither submissions nor those merges establish a downstream pilot, production
deployment, BidiLens dependency adoption, or company endorsement.

Visual coverage includes the four-way flagship comparison, geometry, English
mirror, per-paragraph direction, logical selection in three engines, actual
Chromium clipboard text, stream settlement, dark mode/zoom, and structured
Markdown heading/list/blockquote/table/code output.

## 0.4.0 artifact sizes

Aggregate emitted JavaScript, including chunks and before minification/gzip:

| Package | Bytes | Enforced budget |
|---|---:|---:|
| CLI | 27,731 | 32,768 |
| Core | 112,136 | 126,976 |
| DOM | 18,465 | 20,480 |
| HTML | 4,361 | 12,288 |
| Markdown | 79,833 | 81,920 |
| Playwright | 8,542 | 16,384 |
| React | 11,666 | 16,384 |
| Spec | 9,160 | 24,576 |
| Svelte | 1,855 | 8,192 |
| Terminal | 4,273 | 8,192 |
| Vue | 4,553 | 12,288 |
| Web Component | 29,960 | 81,920 |

On 2026-09-02, Node 25.2.1's default zlib settings measured the core entry at
23,421 bytes with gzip and 19,601 bytes with Brotli. Compact generated Unicode
range encoding reduces the emitted core and standalone Web Component while
retaining the checksum-derived classification tables and test coverage. These
are build-artifact measurements, not cross-runtime compression guarantees.
Applications that do not import the stream API can still tree-shake that
implementation. Live snapshots remain intentionally revisable while an
unfinished token can change classification; `finish()` is the exact
finalization boundary.

The Markdown artifact is 15,135 bytes with gzip and 13,111 bytes with Brotli on
the same build. It contains the serializable token AST, block-analysis
report, security deltas, dirty/pending range protocol, geometric and
context-changing structural checkpoints, bounded grammar-aware provisional
state, and exact final reconciliation. Markdown-It remains a caller-owned
optional peer and is not bundled into the package artifact.

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

- 1 KB / 10 KB / 100 KB / 1 MB analysis: 0.5062 / 4.8258 / 54.1128 /
  510.9244 ms;
- 100,000 units streamed in 1,000 chunks: 319.6915 ms incremental versus
  24,329.2887 ms for full accumulated reparse after every chunk;
- 10,000 one-character pushes: 49.7679 ms;
- 20,000 Markdown units in 400 chunks: 469.8347 ms with 10 rich parses
  versus 8,211.4203 ms for a rich full reparse after every chunk;
- 500-item deep list: 20.1153 ms analysis;
- 1,000-row table: 42.8413 ms analysis.

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
  recorded rather than forced through the public beta.
- All 12 npm artifacts expose SLSA provenance and exact registry integrity.
  Future publishing is restricted to the protected GitHub environment through
  per-package OIDC trust; the temporary bootstrap credential was removed and
  traditional token publishing is disabled for every package.
- No external penetration test or security audit is claimed.

## Sibling-project comparison

The canonical checkout is the strongest reproducible JavaScript/web
implementation among the audited local sibling folders: 12 public packages, 19 test
files with 479 tests, 932 fixtures, current generated Unicode data, real
three-engine visual evidence, and clean package-consumer gates. Broader
native/desktop ideas found in sibling documentation are retained in the
[traceability audit](PROJECT_COMPARISON.md), not misrepresented as working code.

## Release decision

The `0.4.0` web packages and Android `0.1.2` modules are published for
**maintainer-controlled, bounded pilots**. npm and Maven publication, package
provenance/signatures, registry-integrity verification, per-package trusted
publishing, protected maintainer approval, the annotated `v0.4.0` and
`android-v0.1.2` tags, and immutable releases are complete. Broad rollout still
requires:

1. final name/trademark review appropriate to the adopter;
2. native-language and accessibility review appropriate to claims;
3. independent security review appropriate to the deployment risk;
4. a real downstream pilot with performance and rollback evidence.

Broad production or “all platforms” readiness is **not** claimed. Native
Android Kotlin, Views, and Compose modules now have JVM, lint, sample-app, and
emulator evidence plus signed Maven Central distribution, but physical OEM/IME
and TalkBack validation, physical iOS/VoiceOver and Windows accessibility/IME
labs, native registry publication beyond Android, PDF support, additional
upstream integrations, native-speaker certification, an external security audit,
and a real downstream pilot remain incomplete. Historical milestone tags
between `m1` and the current `v0.4.0` release tag were not retroactively fabricated;
publishing the reviewed source does not reconstruct the original stepwise tag
history.
