# Build-specification traceability matrix

**Current-tree evidence date:** 2026-09-01

This file maps the binding “Ultimate Build Instruction — Cross-Platform
Bidirectional Text Toolkit for AI Interfaces, version 2.0” to the source and
repeatable gates in this repository. It prevents a strong web implementation
from being mislabeled as completion of the larger cross-platform mission.

Status vocabulary:

- **Complete and tested** — implementation and a local executable gate exist.
- **Implemented; historical gate incomplete** — code is tested now, but the
  specification's required milestone tag/history does not exist.
- **Partial** — useful implementation exists, with named missing behavior.
- **Missing** — the required implementation is not shipped.
- **External/manual** — completion needs people, credentials, policy approval,
  hardware, or evidence that cannot be manufactured by this repository.

## Acceptance criterion and binding constraints

| Requirement | Status | Evidence or exact gap |
|---|---|---|
| Fixture #001 is the Persian-majority sentence beginning with `React` | Complete and tested | First entry in `corpus/cases.json`; enforced by `scripts/check-corpus.ts`; core, adapters, framework packages, Playwright flagship, and standalone Web Component tests exercise it |
| Default base direction is natural-language content majority, excluding technical tokens | Complete and tested | `packages/core/src/detect.ts`; default-policy and technical-token tests; `strict-uax9`, `first-strong`, `inherit`, explicit `ltr`/`rtl`, and semantic alias are available |
| Opposite-direction and technical inline runs are isolated | Complete and tested for shipped surfaces | Core isolation plan plus HTML, DOM, Markdown, React, Vue, Svelte, Web Component, terminal, and browser tests |
| Never reverse or mutate stored source | Complete and tested for shipped surfaces | Core properties, HTML/DOM/framework tests, selection and Chromium clipboard tests; no visual-reordering implementation exists in core |
| LTR-only non-interference | Complete and tested for shipped web surfaces | In the default `auto` mode, ordinary LTR content in an LTR context emits no BidiLens direction attributes, wrappers, inline styles, or controls. Exact-output/tree/DOM tests cover core, HTML, DOM, Markdown, React, Vue, Svelte, Web Component, terminal, CLI, and Playwright helpers; inherited RTL and hidden-control counterexamples prevent an unsafe fast-path bypass |
| Every public package has implementation, ≥25 package-local assertions, README/install, and example | Complete and executable | `pnpm run packages:depth` enforces this for all 12 packages; packed examples are also exercised by `pnpm run release:check` |
| Full source lives in Git; annotated milestone tag after every gate | Partial | Reviewed source is committed to the canonical public Git repository, but only historical tags `m0` and `m1` exist. Missing history is not retroactively fabricated |
| No fabricated badges, counts, adoption, or publication | Complete for the current tree | Publication is tied to registry/release evidence; the [outreach log](OUTREACH_LOG.md) labels submissions as contact only and makes no merge, audit, pilot, adoption, endorsement, or unverified badge claim |
| ≥300 corpus fixtures | Complete as a technical corpus; external review incomplete | 932 schema-valid entries; 735 authored template-matrix cases, 196 attributed sibling-project seeds, one user fixture; zero are marked native-speaker-reviewed |
| Automated wrong-versus-correct visual proof | Complete and tested | `tests/visual/flagship.spec.ts` and committed Windows/Arial baselines; Chromium, Firefox, and WebKit gate |

## Mission and platform scope

### Tier 1 — mandatory deep web surfaces

| Surface | Status | Evidence or exact gap |
|---|---|---|
| Framework-independent TypeScript core | Complete and tested | `@bidilens/core`; dependency-free runtime; generated Unicode data; analysis, evidence, isolation, security, streaming |
| unified/remark/rehype and markdown-it AST processing | Complete and tested | `@bidilens/markdown`; typed adapters, structural blocks, tables/lists/quotes/code/math, raw-HTML-safe defaults; source builds against Markdown-It 15 through a version-neutral runtime boundary, while packed strict consumers verify identical full 932-fixture behavior on Markdown-It 13.0.2/14.3.1 and identical BidiLens semantic reports on Markdown-It 15.0.1 (whose upstream linkifier can render differently), without leaking host type lines |
| Plain HTML and DOM | Complete and tested | `@bidilens/html` and `@bidilens/dom`; escaped serialization, restore/observe lifecycle, cross-realm tests |
| Web Component | Complete and tested | `@bidilens/web-component`; side-effect-free/SSR-safe main import, explicit `/auto` registration, self-contained browser bundle, three-browser load test |
| React | Complete and tested | `@bidilens/react`; React 18/19 probes, SSR, components and streaming hook |
| Vue | Complete and tested | `@bidilens/vue`; Vue 3 component, SSR and reactive stream composable |
| Svelte | Complete and tested | `@bidilens/svelte`; Svelte 4/5 store APIs and consumer probes |
| Direction streaming engine | Complete and tested within its stated boundary | `@bidilens/core` incrementally tracks source, completed paragraphs, surrogate boundaries, revisable default direction, explicit sticky lock, and batch direction equivalence |
| Streaming Markdown AST/HTML update API | Complete and tested within the Markdown-It backend | `@bidilens/markdown` exports a real `createBidiMarkdownStream`: per-push direction state, checkpointed serializable AST/HTML/security documents, block analysis and isolation, dirty and pending ranges, security deltas, conservative stable prefixes, atomic reset, and exact `finish()` parity with `analyzeBidiMarkdown` |
| Security scanner and SARIF | Complete and tested for bidi-control threats | Core scanner plus CLI audit/security modes and SARIF; 15 ordinary multilingual false-positive cases under all four modes. Full identifier confusable analysis under UTS #39 remains research |
| CLI commands and CI exit behavior | Complete and tested | `@bidilens/cli`: inspect, lint, render, test, audit/security-scan, sanitize; human/JSON/SARIF; packed binary consumer test |
| Reusable Playwright helpers | Complete and tested | `@bidilens/playwright`: metadata, logical text, isolation, selection, clipboard and edge geometry; package-local tests plus real Chromium/Firefox/WebKit use |
| Reusable conformance GitHub Action | Complete and tested | `action/action.yml`; self-contained Node 24 bundle around the real CLI; audit/test, human/JSON/SARIF, stable outputs and exit codes; 43 source assertions plus built safe/strict-failure probes |
| Playground | Complete and tested | Static/offline Vite app; Markdown; adjustable chunk/speed simulation; policy/security selectors; live arbitrary-input four-way comparison; AST/evidence/isolation/security inspectors; searchable 932-case local corpus asset; logical-copy verifier; JSON/semantic-HTML export; URL state; explicit dark theme; responsive layout; complete EN/FA UI switch. The full flow passes all three browsers |

Keeping the dependency-free direction stream and security primitives inside
`@bidilens/core` is intentional. Parser-specific rich state belongs in
`@bidilens/markdown`, where it can accept a caller-owned Markdown-It instance
without adding a parser dependency to core. Unified/remark/rehype remains a
batch plugin path; it is not misrepresented as a stateful streaming backend.

### Tier 2 — mandatory honest-effort desktop surfaces

| Surface | Status | Evidence or exact gap |
|---|---|---|
| CSP-safe VS Code extension with tests | Missing | No extension source, webview CSP validation, extension build, or host test exists |
| Secure Electron example | Missing | No Electron main/preload/renderer boundary, sandbox policy, clipboard test, or build exists |
| HTML-to-PDF export | Missing | No export package/example or browser print/PDF conformance test exists |

### Tier 3 — required structure gated by SDKs

| Surface | Status | Evidence or exact gap |
|---|---|---|
| Android/Jetpack Compose | Implemented, signed, and published; external validation pending | Maven Central `0.1.1` pure Kotlin core, Views, and Compose libraries; sample app; current source verifies the generated 932-case corpus and the newer paragraph-boundary security regressions (the published `0.1.1` release predates this hardening); JVM/Robolectric suites; lint/AAR/APK tasks; 3 Views plus 3 Compose UI tests on local API 36.1; and an API 35 emulator CI gate. Physical-device/OEM/IME/TalkBack evidence and a downstream pilot remain open |
| Flutter/Dart | Missing | No package/demo, generated corpus representation, widget/golden tests, or SDK build report |
| React Native | Missing | No component, generated corpus representation, native tests, or platform build report |
| Swift Package/SwiftUI/UIKit | Source and hosted simulator/compiler validation complete; physical-device/release validation pending | Swift Package, generated Unicode 17 ranges, copied 932-case corpus, core tests/example, UIKit `UILabel`/`UITextView`/`UITextField` adapters, UIKit-backed SwiftUI `BidiText`, independent physical alignment, and protected macOS/iOS Simulator gates in [CI](https://github.com/CodeinScrubs/BidiLens/actions/workflows/ci.yml). Physical iOS/VoiceOver evidence, sample app, editable SwiftUI integration, and registry publication remain open |
| Windows .NET/WPF | Source and hosted compiler validation complete; physical-device/release validation pending | Dependency-free .NET 8 core, generated Unicode ranges, 932-case executable test, WPF `TextBlock`/`TextBox` adapter, selection/source preservation, physical-left RTL test, runnable sample, package builds, and a protected Windows compiler/corpus gate in [CI](https://github.com/CodeinScrubs/BidiLens/actions/workflows/ci.yml). WinUI/WinForms/MAUI, accessibility/IME lab evidence, NuGet publication, and downstream validation remain open |
| Rust core | Source and hosted compiler validation complete; integration/release validation pending | Native `bidilens-core`, generated Unicode 17 ranges, byte/UTF-16/code-point offsets, all 932 direction fixtures, all declared isolation/security fixtures, a runnable example, and Linux/macOS/Windows CI. crates.io publication, an editor adapter, independent audit, and a downstream pilot remain open |
| Terminal/TUI | Complete and tested within documented limits | `@bidilens/terminal`; ANSI-aware, source-preserving compatibility mode and emulator limitations. A real multi-emulator manual matrix remains external/manual |

Absent platform directories are intentional: the anti-hollow rule forbids
counting scaffolds or unexecuted pseudocode as support. Android, Apple,
Windows, and Rust directories contain implementation, corpus tests, examples, and
compiler gates; their differing validation and publication maturity is
recorded explicitly.

## Standards, architecture, and security

| Requirement | Status | Evidence or exact gap |
|---|---|---|
| Pinned, reproducible UCD bidi data with checksums and upgrade command | Complete and tested | Unicode 17.0.0 files/checksums under `unicode/`; `scripts/generate-bidi-data.ts`; `pnpm run unicode:check` reproduces generated ranges exactly |
| Code-point-safe iteration, surrogate and combining handling, ZWJ/ZWNJ | Complete and tested across cores | `for...of`/native code-point paths, dual UTF-16/code-point offsets, generated Unicode 17 `Mn`/`Mc`/`Me` boundary tables, property tests, pending-surrogate stream state, and dedicated corpus/native regressions |
| Language-neutral schemas | Complete and tested | `@bidilens/spec` ships versioned Draft 7 schemas and a registry for `BlockAnalysis`, security reports, and stream snapshots; real core output and invalid counterexamples are validated in tests. Isolation and evidence ranges expose both UTF-16 and code-point offsets |
| Per-structural-block direction | Complete and tested for shipped Markdown/web surfaces | Paragraphs, headings, list items, quotes, table cells, code and math paths have package and visual coverage |
| Raw HTML/XSS-safe default | Complete and tested for shipped HTML/Markdown surfaces | Plain HTML serializer escapes source; Markdown examples disable raw HTML; explicit XSS regression tests |
| Trojan Source controls, balance, syntax context, positions, remediation | Partial | Explicit controls, imbalance, identifier/link/path contexts, dual offsets, remediation, modes and SARIF exist. Parser-aware syntax-boundary crossing and full source-language analysis are not complete |
| No hidden-control stripping by default | Complete and tested | Audit/warn/strict report or block; sanitization is explicit and reversible by the caller |

## Streaming requirements

| Requirement | Status | Evidence or exact gap |
|---|---|---|
| Chunk-boundary invariance | Complete for finalized direction/text and Markdown-It rich output within the tested grammar | Seeded fast-check properties cover whole, one-code-point, random, token-like, UTF-16 surrogate splits, Markdown fences/links and every Unicode 17 default paragraph separator; unfinished future-sensitive tokens may revise live snapshots, and final rich documents equal the batch oracle |
| Stable live rendering and flagship transition | Complete for the shipped streams | Source-position checkpoints; completed core paragraphs immutable; rich Markdown exposes conservative `stableThrough`, pending source, and dirty replacements rather than freezing future-sensitive syntax; default direction remains revisable and sticky locking is explicit |
| Incremental performance without full-document reparse per token | Complete for the shipped streams | Core incremental state plus 1-char/1,000-chunk benchmarks; the rich Markdown parser runs at geometric and structural checkpoints plus finalization, with an 8,192 one-character plain-text regression asserting no more than 14 live parses |
| Final stream equals batch for source and directions | Complete and tested | Core properties and framework adapter tests |
| Final stream equals batch for Markdown AST, isolation, security, and HTML | Complete and tested for Markdown-It | Forty seeded random chunkings across Unicode, surrogate, combining, link, URL, inline-code and fence boundaries produce the exact `analyzeBidiMarkdown` document; unified remains batch-only and is documented as such |

## Corpus and testing

| Requirement | Status | Evidence or exact gap |
|---|---|---|
| Numbered-word fixture schema and flagship first | Complete and tested | JSON Schema plus corpus checker require words, direction-specific complete `1..N` logical order, tags and curation metadata |
| Mandatory category/language breadth | Complete as generated technical coverage | Generator/checker covers Persian, Arabic, Hebrew, Urdu, Pashto, Kurdish Sorani, English and technical categories; linguistic correctness still needs native review |
| Thousands of generated/property variants | Complete at test runtime | Seeded fast-check runs arbitrary Unicode and random chunking; generated variants are reproducible test cases rather than committed corpus rows |
| Fixture-review guide | Complete | `corpus/README.md` explains review fields and native-speaker workflow |
| Unit/property/serialization/range tests | Complete for shipped packages | `pnpm run check`; package-local suites and fast-check properties |
| Visual Chromium + Firefox + WebKit | Complete and tested | 30 Playwright cases across three engines on the committed Windows/Arial baseline, including screenshot-derived mixed Persian/English medical prose |
| Four-way, flagship, structured Markdown, stream, dark, zoom | Complete and tested | Playwright flagship suite and screenshots |
| Selection and copy/paste invariant | Complete for web evidence; partial for Android | Three-engine logical selection and Chromium clipboard test; Android editable callbacks and Compose semantics remain control-free in device tests. Firefox/WebKit clipboard, physical Android OEM/IME copy, and other native surfaces remain environment-specific gaps |
| Accessibility | Partial/external | Automated semantic, selection, dark-mode and zoom evidence plus `docs/ACCESSIBILITY.md`; real screen-reader/browser/OS laboratory matrix is not complete |
| Native test matrix | Partial | Android has JVM/Robolectric plus API 35/36 emulator coverage; Apple has shared-corpus/macOS plus UIKit/SwiftUI iOS Simulator tests; Windows has shared-corpus/native-build jobs; Rust has all shared direction/isolation/security fixtures on Linux, macOS, and Windows. Physical Android/iOS devices, accessibility/IME labs, Flutter/RN, editor-specific Rust integration, and unimplemented Windows UI frameworks remain open |

## Docs, performance, adoption, and release

| Requirement | Status | Evidence or exact gap |
|---|---|---|
| English and Persian main README | Complete | `README.md` and `README.fa.md` |
| Architecture, security, limitations, accessibility, migration, FAQ, contributing, governance, conduct, roadmap, changelog | Complete for the public web beta and Android Maven release | Checked by `scripts/check-docs.ts`; Android has a dedicated integration guide; guides for missing surfaces necessarily remain incomplete |
| Reproducible performance matrix and budgets | Complete for current JS surfaces | `scripts/benchmark.ts`, `docs/PERFORMANCE.md`, scheduled workflow, package byte budgets in release checker |
| 3 patch-quality upstream integrations | Partial/external | One host-tested native implementation merged in [Vercel Streamdown#569](https://github.com/vercel/streamdown/pull/569); Hermes #72508 and Cline #12724 remain submitted/open. The minimum of three integrations, downstream pilots, and adoption evidence is not met |
| 2 issue-quality evidence bundles | Complete as public submissions, not product fixes | Current-policy, non-duplicate evidence is public for Antigravity, Claude Code, Codex, Cline, Continue, and assistant-ui; routes and exact states are recorded in the [outreach log](OUTREACH_LOG.md) |
| IMPACT, ADOPTION, APPLICATION_NOTES with measured facts only | Complete | Root and `docs/` evidence documents; targets are labeled as targets |
| CI: quality, package, visual, size, SBOM, audit | Complete for current JS/web surfaces | Pinned GitHub Actions; Node 22/24, Windows/macOS, three-browser Windows visual job, audit and CycloneDX checks |
| CI: VS Code and native builds | Partial | Android unit/lint/AAR/APK and API 35 device jobs are pinned and executable; signed Android publication has an isolated-consumer gate; Apple Swift/macOS/iOS Simulator, Windows .NET/WPF, and native Rust three-OS jobs have hosted compiler/test evidence. VS Code and unimplemented native-platform adapters remain open |
| Changesets and human-controlled release workflow | Complete | Changesets configuration, opt-in web release preparation, protected manual npm publication with exact confirmation and provenance, and protected manual Maven Central publication with signing and version-reuse rejection |
| Clean packed consumer | Complete and tested | `pnpm run release:check` passes from the reviewed clean commit: all 12 packages build, pack, inspect, install into a strict consumer, import at runtime, and execute their exact packed examples |
| Registry ownership, provenance, public repo metadata, credentials | Complete for the published package set | Canonical GitHub metadata, `@bidilens` ownership, and `io.github.codeinscrubs` namespace verified; all 12 npm `0.3.2` packages are public with SLSA provenance and matching integrity; all three Android `0.1.1` modules are signed and public with matching Central artifacts, signatures, and checksums; release credentials are protected outside the repository |
| Name/trademark decision | Partial/external | ADR records provisional `BidiLens`; final registry/legal review is still required |

## Milestone gate status

The specification defines a gate as both passing evidence **and** its annotated
tag. Therefore working code alone cannot make an historical milestone green.

| Milestone | Current result | Why it is not fully gated |
|---|---|---|
| M0 discovery/tooling/schemas | Gated historically | Annotated `m0` exists; current later changes were not part of that historical tree |
| M1 Unicode/core/security/100 fixtures | Gated historically | Annotated `m1` exists; current core coverage exceeds the 90% line requirement |
| M2 Markdown/HTML/DOM | Implemented; historical gate incomplete | Implementations and tests pass; no annotated `m2` tag |
| M3 streaming | Implemented; historical gate incomplete | Direction and rich Markdown-It stream gates pass now; no historical `m3` tag exists and is not fabricated retroactively |
| M4 frameworks/Electron | Partial | Web Component/React/Vue/Svelte pass anti-hollow and SSR gates; Electron is missing; no `m4` tag |
| M5 CLI/Playwright Action/VS Code | Partial | CLI, reusable Playwright helpers, and bundled conformance Action pass; VS Code extension is missing; no `m5` tag |
| M6 ≥300/visual/copy | Implemented; historical gate incomplete | 932 corpus cases and 30 three-engine visual tests pass; no `m6` tag |
| M7 native + terminal | Partial | Terminal, Android, SwiftUI/UIKit, and .NET/WPF exist; Flutter, React Native, and other documented native adapters remain open; no `m7` tag |
| M8 playground/full EN/FA docs | Implemented; historical gate incomplete | Offline bilingual playground and EN/FA repository docs pass build/browser/link checks; no annotated `m8` tag |
| M9 release/integrations | Partial | Package release side is complete: clean committed checkout, public npm artifacts, provenance, trusted publishing, SBOM, retained manifest, immutable `v0.3.2` web release, and signed `android-v0.1.1` Maven release. One host-tested native implementation merged upstream, but the required three integrations, downstream pilots, and adoption evidence remain incomplete |

## Definition-of-done audit

| # | Result |
|---:|---|
| 1 | Partial — flagship passes every shipped adapter and browser, but required missing platforms do not exist |
| 2 | Complete — content majority is default; first-strong is opt-in |
| 3 | Complete for shipped surfaces — source and logical copy order are preserved |
| 4 | Complete for shipped structured/web surfaces |
| 5 | Complete for batch Markdown and the shipped rich Markdown-It stream |
| 6 | Complete for direction/text and the shipped Markdown-It AST/security/isolation/HTML stream contract; unified remains batch-only |
| 7 | Complete for implemented bidi-control scope; broader parser-aware Trojan Source work remains |
| 8 | Complete — current Playwright suite passes all three engines |
| 9 | Complete — executable anti-hollow gate passes all 12 packages |
| 10 | Complete as schema-valid technical corpus; native review remains a publication-quality gap |
| 11 | Complete — no-backend bilingual playground and EN/FA repository docs exist |
| 12 | Complete for current packages — workflows validate, SBOM/license/notices exist |
| 13 | Partial — one host-tested native implementation is merged; fewer than three integrations exist and no downstream pilot is evidenced |
| 14 | Complete for current documented claims; continue checking after every change |
| 15 | Partial — the reviewed source, current `v0.3.2` web release, and `android-v0.1.1` Maven release are public, but historical intermediate milestone tags were not fabricated retroactively |

## Prior-attempt idea coverage

`docs/PROJECT_COMPARISON.md` is the source-by-source audit. It distinguishes
adopted implementation ideas from rejected regressions and intentionally
unshipped plans. No sibling project contained working VS Code, Electron, PDF,
Android, Flutter, React Native, Swift, or patch-quality upstream integration
code that could honestly be merged. The reusable Playwright and language-neutral
spec packages now close two previously documented Tier-1 gaps; the remaining
rows above are the active backlog, not hidden omissions.

## Honest release conclusion

The current tree is a verified and published **public web beta plus signed
Android release**, not the completed cross-platform v2.0 mission. Registry
identity, npm and Maven publication, provenance, OIDC trust, and the current
immutable web and Android releases are complete.
The original
specification's broader definition of done remains red until the missing
Tier-2/Tier-3 surfaces, integrations, native-language/accessibility review, and
real downstream evidence are actually completed.
