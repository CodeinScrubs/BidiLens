# BidiLens 0.2.0 release report

> This is the immutable historical report for 0.2.0. The current web/package
> release is 0.3.0; its changes are recorded in the root changelog and its
> release evidence is retained by the protected publication workflow.

**Evidence date:** 2026-07-28

**License:** MIT, with Unicode-data and Apache-2.0 corpus third-party notices

**Publication status:** all 12 `0.2.0` packages are public with verified
registry integrity, `latest` tags, and SLSA provenance; the exact source commit
has an annotated `v0.2.0` tag and an immutable GitHub release containing the
retained tarballs, release manifest, and validated SBOM. The later native
Android `0.1.1` core, Views, and Compose modules are signed and public on Maven
Central with an annotated tag, immutable release, and public-consumer evidence

**Recommendation:** suitable for bounded, maintainer-controlled web pilots;
not a universal cross-platform production release

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
| `@bidilens/core` | Complete and tested | Unicode analysis, raw and policy-adjusted evidence, configurable technical vocabulary, dual-offset isolation, security, revisable streaming with tested final chunk invariance, properties; 95.73% lines |
| `@bidilens/dom` | Complete and tested | apply/restore, custom selectors, styles, observer lifecycle, detached/cross-realm DOM |
| `@bidilens/html` | Complete and tested | escaped semantic blocks and `<bdi>` isolation, tag validation, source preservation |
| `@bidilens/markdown` | Complete and tested | unified/remark/rehype and typed Markdown-It batch adapters; blocks/lists/tables/quotes/code/math/XSS; rich Markdown-It stream with AST/HTML/isolation/security final parity, dirty/pending ranges, and 97.29% lines |
| `@bidilens/playwright` | Complete and tested | reusable direction/source/isolation/selection/clipboard/geometry assertions; 100% lines and real three-browser use |
| `@bidilens/react` | Complete and tested | SSR-safe components, per-paragraph mixed-stream rendering, isolation, direction and stream hooks |
| `@bidilens/spec` | Complete and tested | five versioned language-neutral schema documents, strict registry API, dual-offset compatibility, real-output and negative validation tests |
| `@bidilens/vue` | Complete and tested | Vue component, SSR, analysis and stream composables |
| `@bidilens/svelte` | Complete and tested | idiomatic analysis and streaming stores |
| `@bidilens/web-component` | Complete and tested | Side-effect-free main import, explicit/auto registration entries, safe DOM construction, self-contained CDN entry, real three-browser loading |
| `@bidilens/terminal` | Complete and tested | ANSI-aware conservative output; emulator shaping remains host-dependent |
| `@bidilens/cli` | Complete and tested | inspect/render/test/audit/lint/security-scan/sanitize; human/JSON/SARIF; real packed binary |
| Bundled GitHub Action | Complete and tested | Node 24 audit/corpus action, human/JSON/SARIF, workspace-safe report path, real exit codes; source and generated-bundle probes |
| React/Vite playground | Complete and tested | Static/offline; EN/FA UI, policy/security controls, adjustable stream, live four-way comparison, AST/evidence/isolation/security, searchable 928-case asset, copy verification, JSON/semantic HTML export, hash state and explicit theme; three-browser flow |
| Corpus | Partial (with exact missing functionality) | 928 schema-valid technical/user cases, including 196 attributed sibling seeds; zero native-speaker-certified templates |
| VS Code, Electron, PDF | Unsupported (with technical reason) | No implementations exist; hollow packages were rejected and these require host-specific security/print tests |
| Native Android | Implemented and published after the immutable 0.2.0 web release | Signed Maven Central `0.1.1` core, Views, and Compose artifacts; sample APK; current source verifies 928 cases while the published release predates the ten boundary-regression fixtures; JVM/Robolectric tests; lint/AAR build; and API 35/36 emulator UI evidence. This does not alter the historical 0.2.0 npm artifacts |
| Flutter, React Native, Swift | Unsupported (with technical reason) | No implementations or executable SDK evidence exist in this repository |
| Upstream AI-product integrations | External review in progress; no adoption | One host-tested Hermes TUI patch is submitted as [NousResearch/hermes-agent#72508](https://github.com/NousResearch/hermes-agent/pull/72508); tailored evidence requests are public for six additional project families. No review, merge, pilot, deployment, or endorsement is claimed; see the [outreach log](OUTREACH_LOG.md). |

## Reproduced validation

| Command / gate | Observed result |
|---|---|
| `pnpm run check` | Unicode, strict TypeScript, ESLint, anti-hollow package depth, coverage, corpus, docs, 12 package builds plus demo, Action bundle and generated-artifact probes pass |
| Vitest within `check` | 16 files, 392 tests pass |
| Coverage (seeded run) | 91.85% statements, 85.80% branches, 94.48% functions, 94.76% lines; core 95.73%, Markdown 97.29%, Playwright helpers 100% lines |
| `pnpm run corpus:check` | 928/928; 0 native-speaker-reviewed |
| `pnpm run android:check` | Kotlin core/Views/Compose unit suites, Android lint, all debug assemblies, and the sample APK pass with JDK 21 and SDK 36 |
| Android device gates | 3/3 Views and 3/3 Compose UI tests pass locally on Android 16/API 36.1; CI defines a pinned API 35 emulator gate |
| `pnpm run test:visual` | 24/24 across Chromium, Firefox, WebKit on the Windows/Arial baseline OS, including real standalone-module loading and the bilingual playground's controls/corpus/copy/theme/exports; CI aligns pixel and geometry checks to that OS while Linux runs semantic/build/package gates |
| `pnpm -r --if-present run example` | all 12 public package examples run in the workspace |
| `pnpm run packages:types` | all 12 ESM package layouts and the spec package's five JSON subpaths pass real ATTW packing; CJS is intentionally unsupported |
| publint 0.3.21 against every package directory | all 12 packed manifests and published file layouts report `All good!` |
| `pnpm run deps:audit` | no known vulnerabilities at audit time |
| `pnpm licenses list --prod` | runtime dependency inventory reports MIT, ISC, BSD-2-Clause, and Python-2.0 licenses; Unicode data and the imported Apache-2.0 corpus are covered separately by the committed third-party notices |
| `pnpm outdated -r` | only `@types/node` 26 and TypeScript 7 are newer majors; types stay aligned to supported Node 24 and TypeScript 6.0.3 is the newest line accepted by the installed `typescript-eslint` peer range |
| `pnpm run sbom` + `pnpm run sbom:check` | CycloneDX 1.7; 585 components, 599 dependency relationships. cdxgen also reports inherited process environment warnings in the local execution environment; validation does not treat those environment warnings as component findings |
| actionlint 1.7.12 | CI, release-preparation, benchmark, and opt-in Pages workflows pass |
| `pnpm run action:check` | 195,023-byte bundle; Node 24 metadata/notices and unresolved-import checks pass; built artifact returns 0 for safe source and 2 for a strict high-risk control without mutation |
| Supported Node probes | built core and CLI pass Node 22.22.1 and 24.18.0; an additional Node 20.19.5 compatibility probe passed, but that EOL line is not a production support claim |
| Packed framework peer probes | shipped examples pass React/React DOM 18.3.1, Vue/server-renderer 3.5.0, and Svelte 4.2.20; the primary consumer covers React 19.2.8, Vue 3.5.40, and Svelte 5 |
| `pnpm run release:check` | strict clean-worktree build/pack/inspect/install/type/runtime/CLI consumer passes; exact examples extracted from all 12 tarballs execute. The pre-commit development tree also passed with `--allow-dirty` |
| GitHub CI for published commit | [11/11 jobs passed](https://github.com/CodeinScrubs/BidiLens/actions/runs/30297267976): Node 22/24 quality and packed consumers, Windows/macOS quality, three browser engines, actionlint, dependency audit, and SBOM |
| Protected npm publication | [workflow run `30297697861`](https://github.com/CodeinScrubs/BidiLens/actions/runs/30297697861) passed the full release gate, published all 12 `0.2.0` packages through OIDC, verified registry integrity, and retained the exact tarballs and manifest |
| Immutable GitHub release | [`v0.2.0`](https://github.com/CodeinScrubs/BidiLens/releases/tag/v0.2.0) resolves to the published source commit; GitHub's immutable-release verification covers the 12 package tarballs, release manifest, and validated SBOM |
| External npm consumer | all 12 public packages installed from the registry; runtime imports, mixed Persian/English direction, streaming, CLI, and the pure-LTR no-op passed; current production dependency audit reported zero findings |
| Android release CI | [13/13 jobs passed](https://github.com/CodeinScrubs/BidiLens/actions/runs/30337482079), including Android libraries/sample, isolated Maven consumer, and API 35 device tests |
| Protected Android publication | [workflow run `30339097846`](https://github.com/CodeinScrubs/BidiLens/actions/runs/30339097846) signed and published all three Android `0.1.1` modules to Maven Central |
| Public Maven consumer | all 15 primary files matched retained workflow bytes; 15 detached signatures and 30 Central checksums verified; an empty-Maven-Local consumer resolved all three public coordinates and built |
| Immutable Android release | [`android-v0.1.1`](https://github.com/CodeinScrubs/BidiLens/releases/tag/android-v0.1.1) resolves to the exact published commit and retains the AARs, sample APK, Maven repository, Central evidence, public key, and SHA-256 checksums |

## Post-release outreach evidence

The outreach recorded before `0.2.0` remains independent of publication. The
[outreach log](OUTREACH_LOG.md) links every live route, records one focused
host-code PR, explains why other routes are issue/discussion proposals, and
lists deliberate anti-spam deferrals. This activity does not change the
published package bytes and does not count as an audit, merge, pilot,
production deployment, adoption, or company endorsement.

Visual coverage includes the four-way flagship comparison, geometry, English
mirror, per-paragraph direction, logical selection in three engines, actual
Chromium clipboard text, stream settlement, dark mode/zoom, and structured
Markdown heading/list/blockquote/table/code output.

## Artifact sizes

Aggregate emitted JavaScript, including chunks and before minification/gzip:

| Package | Bytes | Enforced budget |
|---|---:|---:|
| CLI | 16,241 | 32,768 |
| Core | 120,452 | 122,880 |
| DOM | 18,297 | 20,480 |
| HTML | 4,361 | 12,288 |
| Markdown | 79,375 | 81,920 |
| Playwright | 8,542 | 16,384 |
| React | 11,597 | 16,384 |
| Spec | 9,160 | 24,576 |
| Svelte | 1,855 | 8,192 |
| Terminal | 4,273 | 8,192 |
| Vue | 4,478 | 12,288 |
| Web Component | 35,595 | 81,920 |

The core artifact is 25,500 bytes with gzip and 19,110 bytes with Brotli on
this build. Its unminified increase funds exact batch/final token-policy parity,
invisible-character auditing, atomic control-family sanitization, and
closed-fence recognition across the tested token grammar and stream chunk
boundaries; applications that do not import the stream API can still tree-shake
that implementation. Live snapshots remain intentionally revisable while an
unfinished token can still change classification; `finish()` is the exact
finalization boundary.

The Markdown artifact is 14,916 bytes with gzip and 12,980 bytes with Brotli on
this build. Its increase contains the serializable token AST, block-analysis
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
implementation among the local sibling folders: 12 public packages, 16 test
files with 391 tests, 928 fixtures, current generated Unicode data, real
three-engine visual evidence, and clean package-consumer gates. Broader
native/desktop ideas found in sibling documentation are retained in the
[traceability audit](PROJECT_COMPARISON.md), not misrepresented as working code.

## Release decision

The `0.2.0` code artifacts are published as a **maintainer-controlled public
web beta**. npm publication, package provenance, registry-integrity
verification, per-package trusted publishing, protected human approval, the
annotated `v0.2.0` tag, and the immutable release are complete. Broad rollout
still requires:

1. final name/trademark review appropriate to the adopter;
2. native-language and accessibility review appropriate to claims;
3. independent security review appropriate to the deployment risk;
4. a real downstream pilot with performance and rollback evidence.

Broad production or “all platforms” readiness is **not** claimed. Native
Android Kotlin, Views, and Compose modules now have JVM, lint, sample-app, and
emulator evidence plus signed Maven Central distribution, but physical OEM/IME
and TalkBack validation, iOS/desktop/PDF surfaces, upstream integrations,
native-speaker certification, an external security audit, and a real
downstream pilot remain absent. Historical milestone tags between
`m1` and the current `v0.2.0` release tag were not retroactively fabricated;
publishing
the reviewed source does not reconstruct the original stepwise tag history.
