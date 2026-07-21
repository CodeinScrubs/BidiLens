# Build-specification traceability matrix

**Evidence date:** 2026-07-20

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
| No fabricated badges, counts, adoption, or publication | Complete for the current tree | README/report label local results and unsupported surfaces; no publication/adoption claim or unverified passing badge |
| ≥300 corpus fixtures | Complete as a technical corpus; external review incomplete | 918 schema-valid entries; 721 authored template-matrix cases, 196 attributed sibling-project seeds, one user fixture; zero are marked native-speaker-reviewed |
| Automated wrong-versus-correct visual proof | Complete and tested | `tests/visual/flagship.spec.ts` and committed Windows/Arial baselines; Chromium, Firefox, and WebKit gate |

## Mission and platform scope

### Tier 1 — mandatory deep web surfaces

| Surface | Status | Evidence or exact gap |
|---|---|---|
| Framework-independent TypeScript core | Complete and tested | `@bidilens/core`; dependency-free runtime; generated Unicode data; analysis, evidence, isolation, security, streaming |
| unified/remark/rehype and markdown-it AST processing | Complete and tested | `@bidilens/markdown`; typed adapters, structural blocks, tables/lists/quotes/code/math, raw-HTML-safe defaults |
| Plain HTML and DOM | Complete and tested | `@bidilens/html` and `@bidilens/dom`; escaped serialization, restore/observe lifecycle, cross-realm tests |
| Web Component | Complete and tested | `@bidilens/web-component`; SSR-safe import, auto-registration entries, self-contained browser bundle, three-browser load test |
| React | Complete and tested | `@bidilens/react`; React 18/19 probes, SSR, components and streaming hook |
| Vue | Complete and tested | `@bidilens/vue`; Vue 3 component, SSR and reactive stream composable |
| Svelte | Complete and tested | `@bidilens/svelte`; Svelte 4/5 store APIs and consumer probes |
| Direction streaming engine | Complete and tested within its stated boundary | `@bidilens/core` incrementally tracks source, completed paragraphs, surrogate boundaries, stable lock and batch direction equivalence |
| Streaming Markdown AST/HTML update API | Partial | `createBidiMarkdownStream` is currently an alias of the paragraph direction stream. It does not return AST annotations, isolation/security deltas, dirty regions, or final HTML, so the complete §7 API/AST equivalence requirement is not met |
| Security scanner and SARIF | Complete and tested for bidi-control threats | Core scanner plus CLI audit/security modes and SARIF; 15 ordinary multilingual false-positive cases under all four modes. Full identifier confusable analysis under UTS #39 remains research |
| CLI commands and CI exit behavior | Complete and tested | `@bidilens/cli`: inspect, lint, render, test, audit/security-scan, sanitize; human/JSON/SARIF; packed binary consumer test |
| Reusable Playwright helpers | Complete and tested | `@bidilens/playwright`: metadata, logical text, isolation, selection, clipboard and edge geometry; package-local tests plus real Chromium/Firefox/WebKit use |
| Reusable conformance GitHub Action | Complete and tested | `action/action.yml`; self-contained Node 24 bundle around the real CLI; audit/test, human/JSON/SARIF, stable outputs and exit codes; 43 source assertions plus built safe/strict-failure probes |
| Playground | Complete and tested | Static/offline Vite app; Markdown; adjustable chunk/speed simulation; policy/security selectors; live arbitrary-input four-way comparison; AST/evidence/isolation/security inspectors; searchable 918-case local corpus asset; logical-copy verifier; JSON/semantic-HTML export; URL state; explicit dark theme; responsive layout; complete EN/FA UI switch. The full flow passes all three browsers |

Keeping stream and security inside `@bidilens/core` is an intentional package
boundary: their implementations are substantial, but separate packages would
only create thin re-export layers. The missing Markdown stream behavior above
is a functional gap, not excused by that packaging decision.

### Tier 2 — mandatory honest-effort desktop surfaces

| Surface | Status | Evidence or exact gap |
|---|---|---|
| CSP-safe VS Code extension with tests | Missing | No extension source, webview CSP validation, extension build, or host test exists |
| Secure Electron example | Missing | No Electron main/preload/renderer boundary, sandbox policy, clipboard test, or build exists |
| HTML-to-PDF export | Missing | No export package/example or browser print/PDF conformance test exists |

### Tier 3 — required structure gated by SDKs

| Surface | Status | Evidence or exact gap |
|---|---|---|
| Android/Jetpack Compose | Missing | No library/demo, generated corpus representation, unit/UI tests, or SDK build report |
| Flutter/Dart | Missing | No package/demo, generated corpus representation, widget/golden tests, or SDK build report |
| React Native | Missing | No component, generated corpus representation, native tests, or platform build report |
| Swift Package/SwiftUI/TextKit | Missing | No package/demo, generated corpus representation, tests, or toolchain report |
| Terminal/TUI | Complete and tested within documented limits | `@bidilens/terminal`; ANSI-aware, source-preserving compatibility mode and emulator limitations. A real multi-emulator manual matrix remains external/manual |

The absent native/desktop directories are intentional: the anti-hollow rule
forbids counting scaffolds or unexecuted pseudocode as platform support.

## Standards, architecture, and security

| Requirement | Status | Evidence or exact gap |
|---|---|---|
| Pinned, reproducible UCD bidi data with checksums and upgrade command | Complete and tested | Unicode 17.0.0 files/checksums under `unicode/`; `scripts/generate-bidi-data.ts`; `pnpm run unicode:check` reproduces generated ranges exactly |
| Code-point-safe iteration, surrogate and combining handling, ZWJ/ZWNJ | Complete and tested in core | `for...of` code-point paths, dual UTF-16/code-point offsets, property tests, pending-surrogate stream state, dedicated corpus categories |
| Language-neutral schemas | Complete and tested | `@bidilens/spec` ships versioned Draft 7 schemas and a registry for `BlockAnalysis`, security reports, and stream snapshots; real core output and invalid counterexamples are validated in tests. Isolation and evidence ranges expose both UTF-16 and code-point offsets |
| Per-structural-block direction | Complete and tested for shipped Markdown/web surfaces | Paragraphs, headings, list items, quotes, table cells, code and math paths have package and visual coverage |
| Raw HTML/XSS-safe default | Complete and tested for shipped HTML/Markdown surfaces | Plain HTML serializer escapes source; Markdown examples disable raw HTML; explicit XSS regression tests |
| Trojan Source controls, balance, syntax context, positions, remediation | Partial | Explicit controls, imbalance, identifier/link/path contexts, dual offsets, remediation, modes and SARIF exist. Parser-aware syntax-boundary crossing and full source-language analysis are not complete |
| No hidden-control stripping by default | Complete and tested | Audit/warn/strict report or block; sanitization is explicit and reversible by the caller |

## Streaming requirements

| Requirement | Status | Evidence or exact gap |
|---|---|---|
| Arbitrary chunk-boundary invariance | Complete for direction/text stream | Seeded fast-check properties cover whole, one-code-point, random, token-like, UTF-16 surrogate splits and default paragraph separators; future-sensitive custom regular expressions are buffered and split once at `finish()` |
| Stable live rendering and flagship transition | Complete for direction/text stream | Source-position checkpoints; completed blocks immutable; flagship moves provisional LTR → locked RTL once |
| Incremental performance without full-document reparse per token | Complete for direction/text stream | Incremental state machine and 1-char/1,000-chunk benchmarks; custom-regex pushes have an 8,000-character regression alarm and defer one full split to `finish()` |
| Final stream equals batch for source and directions | Complete and tested | Core properties and framework adapter tests |
| Final stream equals batch for Markdown AST, isolation, security, and HTML | Missing | No rich Markdown stream update type or parser state exists yet |

## Corpus and testing

| Requirement | Status | Evidence or exact gap |
|---|---|---|
| Numbered-word fixture schema and flagship first | Complete and tested | JSON Schema plus corpus checker require words, direction-specific complete `1..N` logical order, tags and curation metadata |
| Mandatory category/language breadth | Complete as generated technical coverage | Generator/checker covers Persian, Arabic, Hebrew, Urdu, Pashto, Kurdish Sorani, English and technical categories; linguistic correctness still needs native review |
| Thousands of generated/property variants | Complete at test runtime | Seeded fast-check runs arbitrary Unicode and random chunking; generated variants are reproducible test cases rather than committed corpus rows |
| Fixture-review guide | Complete | `corpus/README.md` explains review fields and native-speaker workflow |
| Unit/property/serialization/range tests | Complete for shipped packages | `pnpm run check`; package-local suites and fast-check properties |
| Visual Chromium + Firefox + WebKit | Complete and tested | 24 Playwright cases across three engines on the committed Windows/Arial baseline |
| Four-way, flagship, structured Markdown, stream, dark, zoom | Complete and tested | Playwright flagship suite and screenshots |
| Selection and copy/paste invariant | Complete for web evidence | Three-engine logical selection and Chromium clipboard test. Firefox/WebKit clipboard and native surfaces remain environment-specific gaps |
| Accessibility | Partial/external | Automated semantic, selection, dark-mode and zoom evidence plus `docs/ACCESSIBILITY.md`; real screen-reader/browser/OS laboratory matrix is not complete |
| Native test matrix | Missing except terminal | Follows missing Tier-3 implementations |

## Docs, performance, adoption, and release

| Requirement | Status | Evidence or exact gap |
|---|---|---|
| English and Persian main README | Complete | `README.md` and `README.fa.md` |
| Architecture, security, limitations, accessibility, migration, FAQ, contributing, governance, conduct, roadmap, changelog | Complete for the web candidate | Checked by `scripts/check-docs.ts`; platform guides for missing surfaces necessarily remain incomplete |
| Reproducible performance matrix and budgets | Complete for current JS surfaces | `scripts/benchmark.ts`, `docs/PERFORMANCE.md`, scheduled workflow, package byte budgets in release checker |
| 3 patch-quality upstream integrations | Missing | No patch is represented as ready. Archived sibling dossiers were planning/evidence notes, not host-tested patches, so they were not copied as completed deliverables |
| 2 issue-quality evidence bundles | Missing in canonical repository | Archived sibling Claude/Grok notes show a useful shape but contain dated policy claims requiring fresh research |
| IMPACT, ADOPTION, APPLICATION_NOTES with measured facts only | Complete | Root and `docs/` evidence documents; targets are labeled as targets |
| CI: quality, package, visual, size, SBOM, audit | Complete for current JS/web surfaces | Pinned GitHub Actions; Node 22/24, Windows/macOS, three-browser Windows visual job, audit and CycloneDX checks |
| CI: VS Code and native builds | Missing | Follows missing platform implementations |
| Changesets and inactive human-controlled release workflow | Complete | Changesets configuration and opt-in release-preparation workflow; no automatic publication step |
| Clean packed consumer | Complete in development mode; final clean gate pending | `pnpm run release:check -- --allow-dirty` passed on the modified tree. A reviewed commit followed by `pnpm run release:check` without the override is still required |
| Registry ownership, provenance, public repo metadata, credentials | Partial/external | Canonical GitHub source and package metadata are real and public. npm scope ownership, trusted-publishing provenance, and release credentials still require maintainer verification; npm E404 is not ownership proof |
| Name/trademark decision | Partial/external | ADR records provisional `BidiLens`; final registry/legal review is still required |

## Milestone gate status

The specification defines a gate as both passing evidence **and** its annotated
tag. Therefore working code alone cannot make an historical milestone green.

| Milestone | Current result | Why it is not fully gated |
|---|---|---|
| M0 discovery/tooling/schemas | Gated historically | Annotated `m0` exists; current later changes were not part of that historical tree |
| M1 Unicode/core/security/100 fixtures | Gated historically | Annotated `m1` exists; current core coverage exceeds the 90% line requirement |
| M2 Markdown/HTML/DOM | Implemented; historical gate incomplete | Implementations and tests pass; no annotated `m2` tag |
| M3 streaming | Partial | Plain direction streaming passes; rich Markdown AST/HTML stream equivalence is missing; no `m3` tag |
| M4 frameworks/Electron | Partial | Web Component/React/Vue/Svelte pass anti-hollow and SSR gates; Electron is missing; no `m4` tag |
| M5 CLI/Playwright Action/VS Code | Partial | CLI, reusable Playwright helpers, and bundled conformance Action pass; VS Code extension is missing; no `m5` tag |
| M6 ≥300/visual/copy | Implemented; historical gate incomplete | 918 corpus cases and 24 three-engine visual tests pass; no `m6` tag |
| M7 native + terminal | Partial | Terminal exists; Android/Flutter/RN/Swift do not; no `m7` tag |
| M8 playground/full EN/FA docs | Implemented; historical gate incomplete | Offline bilingual playground and EN/FA repository docs pass build/browser/link checks; no annotated `m8` tag |
| M9 release/integrations | Partial | Packs, consumer, SBOM and workflows pass locally; integration minimum, clean committed checkout, identity/provenance and final tag are missing |

## Definition-of-done audit

| # | Result |
|---:|---|
| 1 | Partial — flagship passes every shipped adapter and browser, but required missing platforms do not exist |
| 2 | Complete — content majority is default; first-strong is opt-in |
| 3 | Complete for shipped surfaces — source and logical copy order are preserved |
| 4 | Complete for shipped structured/web surfaces |
| 5 | Complete for batch Markdown; incomplete for rich Markdown streaming |
| 6 | Partial — direction/text stream equivalence passes; AST/security/isolation/HTML stream equivalence missing |
| 7 | Complete for implemented bidi-control scope; broader parser-aware Trojan Source work remains |
| 8 | Complete — current Playwright suite passes all three engines |
| 9 | Complete — executable anti-hollow gate passes all 12 packages |
| 10 | Complete as schema-valid technical corpus; native review remains a publication-quality gap |
| 11 | Complete — no-backend bilingual playground and EN/FA repository docs exist |
| 12 | Complete for current packages — workflows validate, SBOM/license/notices exist |
| 13 | Missing — zero host-tested ready-to-submit integration patches |
| 14 | Complete for current documented claims; continue checking after every change |
| 15 | Partial — the reviewed source is committed for public GitHub distribution, but historical milestone tags and the final package-release tag remain incomplete |

## Prior-attempt idea coverage

`docs/PROJECT_COMPARISON.md` is the source-by-source audit. It distinguishes
adopted implementation ideas from rejected regressions and intentionally
unshipped plans. No sibling project contained working VS Code, Electron, PDF,
Android, Flutter, React Native, Swift, or patch-quality upstream integration
code that could honestly be merged. The reusable Playwright and language-neutral
spec packages now close two previously documented Tier-1 gaps; the remaining
rows above are the active backlog, not hidden omissions.

## Honest release conclusion

The current tree is a strong, locally verified **web release candidate**, not
the completed cross-platform v2.0 mission. A public web beta can be prepared
after the external identity/security/accessibility/language-review gates. The
original specification's final `v0.1.0` gate remains red until the missing
Markdown streaming, Tier-2/Tier-3 surfaces
requirements, integrations, reviewed commit, clean-checkout gate, and tags are
actually completed.
