# Changelog

All notable changes to this project are recorded here. The complete package set
is published under the public `@bidilens` npm scope.

## Unreleased

No unreleased changes.

## 0.3.1 - 2026-08-13

### Security and performance

- Replaced the raw-text math-delimiter regular expression with a single-pass
  scanner, preventing quadratic work on repeated unmatched `\(` input while
  preserving `$...$`, `$$...$$`, `$$$$`, and `\(...\)` recognition.
- Expressed UTF-16-to-code-point range construction with bounded typed-array
  fills so input-derived offsets cannot be interpreted as object properties.
- Removed the generator's network-to-filesystem refresh mode; Unicode table
  generation now reads only two vendored, version- and SHA-256-pinned files.

### Direction correctness

- Kept ordinary hyphenated English compounds and block-level ALL-CAPS prose as
  natural-language direction evidence while continuing to exclude technical
  identifiers such as `react-markdown`, `GPT-5`, and mixed-case acronyms.
- Added shared cross-platform regressions for both evidence classes, bringing
  the canonical direction corpus to 932 cases.
- Kept caller-supplied .NET technical identifiers case-insensitive regardless
  of the comparer used by the caller's set.

### Release and verification

- Pinned the supported CI runtimes to exact Node 22.12.0 and 24.15.0 releases
  so the documented minimum is exercised instead of silently floating to the
  newest release in each major line.
- Documented a Node-22.12-compatible Corepack bootstrap and deferred jsdom 30,
  whose upstream runtime floor would otherwise narrow BidiLens contributor
  compatibility without an explicit support decision.
- Added pinned, weekly and pull-request CodeQL `security-extended` analysis for
  JavaScript/TypeScript, Kotlin, C#, Swift, and Rust, including explicit
  compiler extraction for the native Kotlin and Swift surfaces.

### Windows platforms

- Matched .NET technical-token boundaries to the shared ASCII-boundary policy,
  including RTL-adjacent URLs, email addresses, versions, hashes, identifiers,
  and scoped packages without absorbing sentence punctuation.
- Made the Windows CI sequence stop on every failed `dotnet` command so corpus
  regressions cannot be hidden by a later successful build or package step.

### Apple platforms

- Added a UIKit-backed SwiftUI `BidiText` renderer that keeps paragraph
  direction independent from physical alignment without changing the
  surrounding SwiftUI layout direction or logical source string.
- Added iOS Simulator regression tests for SwiftUI bridging, UIKit paragraph
  direction, physical-left RTL rendering, pure-LTR non-interference, and
  editable source/selection preservation.
- Fixed `UILabel` state ownership and restoration when UIKit normalizes an
  assigned attributed string, preventing stale RTL paragraph styling after an
  LTR transition while preserving host changes to unrelated text attributes.
- Kept the dense Markdown streaming performance gate deterministic under
  coverage instrumentation while retaining its strict rich-parse-count bound.

### Android platforms

- Kept paragraph direction independent from physical alignment in Android
  Views, including immediate restoration of the caller's original gravity
  when content-driven alignment is disabled.
- Expanded Kotlin parity to the 932-case canonical corpus and added Views and
  Compose regressions for physical-left RTL rendering and pure-LTR no-op
  behavior.
- Aligned the root and standalone-consumer Compose compiler plugins on Kotlin
  2.4.10 and pinned Gradle 9.5.0, the documented compatibility boundary for
  that Kotlin release, while retaining Android Gradle Plugin 9.3.1.

## 0.3.0 - 2026-07-28

### Direction and alignment

- Kept whitespace-joined opposite-direction phrases such as `page 97` in
  source order while retaining hard punctuation as semantic boundaries.
- Made paragraph direction independent from visual alignment, including
  caller-owned physical-left RTL rendering and a public Vue `textAlign` prop.
- Lowered installed DOM alignment defaults to zero specificity so application
  classes and inline styles continue to win.

### Native platforms and verification

- Added a Swift Package with a generated Unicode 17 core, shared-corpus tests,
  UIKit adapters, selection preservation, and an iOS Simulator compiler gate.
- Added dependency-free .NET 8 analysis, WPF adapters, source/selection/state
  restoration, a runnable sample, package builds, and executable corpus tests.
- Added Android Views and Compose alignment regressions and hardened the API 35
  emulator gate with KVM access, package-service readiness, and a finite
  timeout.

## Android 0.1.1 - 2026-07-28

### Native Android

- Added a pure Kotlin core, Android Views adapter, Jetpack Compose adapter, and
  runnable sample for mixed Persian/Arabic/Hebrew and English values.
- Generated the complete 918-case canonical corpus and Unicode 17 tables for
  Kotlin, with JVM, Robolectric, lint, AAR/APK, and API 35/36 emulator gates.
- Added an isolated consumer build that compiles only against generated Maven
  coordinates and their published dependency graph.
- Kept editable values free of bidi controls, preserved Compose accessibility
  semantics, restored View state, and retained an exact pure-LTR no-op path.
- Published Android `0.1.1` as the first signed Maven Central release, with
  Central-complete POM metadata, source and documentation jars, detached
  signatures, public-only isolated-consumer verification, and a protected
  manual release workflow that rejects version reuse.
- Added the annotated `android-v0.1.1` tag and immutable GitHub release with
  individual AARs, a sample APK, Maven and public-Central evidence bundles, the
  public signing key, and SHA-256 checksums.

### Direction correctness

- Kept whitespace-joined LTR phrases such as `page 97` in one isolate while
  leaving Arabic/Latin punctuation between semantic fragments outside, so
  adjacent isolates cannot reverse phrase order inside RTL paragraphs.

## 0.2.0 - 2026-07-27

### Direction and security

- Added representative coverage for 32 RTL scripts and linear recognition of
  closed multiline Markdown fences inside surrounding raw-text prose.
- Added contextual findings for identifier-like ZWNJ/ZWJ, WORD JOINER, and
  midstream BOM while preserving ordinary Persian and emoji joining behavior.
- Added category-selective bidi-control sanitization with atomic
  opener/closer families and backward-compatible risk-only behavior.

### Release engineering

- Expanded the packed consumer to execute mixed-direction and pure-LTR
  non-interference checks across the public adapters.
- Added the unified `verify:production` gate and regenerated the self-contained
  GitHub Action bundle from the hardened source.
- Audited the sibling `v1.5-Her` implementation and documented adopted ideas,
  rejected scope, remaining limitations, and reproducible evidence.

## 0.1.1 - 2026-07-26

### Public release

- Published all 12 public packages from the protected OIDC workflow with npm
  SLSA provenance, then independently matched every public registry integrity
  value to the retained release manifest and tarball.
- Added the annotated `v0.1.1` source tag and immutable GitHub release with the
  exact 12 package tarballs, release manifest, and validated CycloneDX 1.7 SBOM.

### Correctness

- Made neutral and technical-only content inherit its host direction
  consistently across DOM, HTML, Markdown, React, Vue, terminal, and Web
  Component adapters unless the caller supplies an explicit fallback.
- Restored the author-owned inline `direction` style when a DOM node changes
  from an intervened RTL state to a neutral state.
- Preserved current author light DOM when `<bidi-message>` changes from
  pass-through rendering to BidiLens-owned rendering.
- Made CLI `--text ""` valid, rejected ambiguous text/file input, validated
  custom corpus structure and IDs, and made Windows SARIF paths safe across
  volumes.

### Release engineering

- Removed hard-coded release versions from the CLI and release scripts, aligned
  Playwright 1.62 tooling, and taught Dependabot to defer unsupported Node and
  TypeScript major lines to deliberate compatibility reviews.
- Added release-document version consistency checks and refreshed package,
  support, publishing, outreach, limitation, and build-report documentation.

## 0.1.0 - 2026-07-26

### Public release

- Published all 12 public packages with npm SLSA provenance from the protected
  `npm-release` GitHub environment.
- Verified each retained release tarball against its public registry SHA-512
  integrity, confirmed the `latest` tag, and installed the complete set into a
  clean external consumer.
- Added the annotated `v0.1.0` source tag, retained npm release manifest, and
  validated CycloneDX 1.7 SBOM.

### Direction and Unicode

- Made `content-majority` the default and preserved first-strong, strict,
  explicit, inherited, and neutral fallback policies.
- Added reproducible Unicode 17.0.0 bidi-class and natural-letter tables from
  two pinned upstream checksums with binary-search lookup.
- Added technical-token exclusion, dual UTF-16/code-point evidence ranges,
  directional runs, semantic isolation plans, and specification-oriented API
  aliases.
- Added caller-supplied `technicalIdentifiers` across applicable adapters and
  separate literal `rawFirstStrong` versus policy-adjusted `firstStrong`
  evidence.
- Added versioned language-neutral JSON Schemas for block analysis, security
  reports, and stream snapshots, with dual-offset isolation ranges.
- Added paragraph-aware streaming with chunk-invariant final snapshots across
  the tested token grammar, a revisable live default,
  opt-in sticky settlement, completed-block immutability, random
  UTF-16-boundary properties, supplementary-character buffering, and
  geometrically spaced policy-aware checkpoints.
- Added atomic `reset(initialText)` replacement across core, React, Vue, and
  Svelte streaming adapters so regeneration cannot expose a transient empty
  state.

### Security

- Added off/audit/warn/strict scanning for explicit controls, unbalanced and
  crossing formatting state, hidden zero-width characters, and deprecated
  controls.
- Added exact ranges, remediation, human/JSON/SARIF CLI output, explicit
  sanitization, and ordinary Persian ZWNJ false-positive coverage.

### Adapters

- Added safe HTML, restorable/observable DOM, unified/remark/rehype,
  markdown-it, React, Vue, Svelte, Web Component, and terminal packages.
- Added per-structural-block Markdown direction, LTR code policy, inline
  isolation, math-node LTR policy, XSS-safe rendering, SSR behavior, and
  framework streaming APIs.
- Added a real Markdown-It stream with per-push direction state, checkpointed
  AST/HTML/security revisions, dirty and pending ranges, security deltas,
  conservative stable prefixes, atomic reset, and exact final batch parity.
- Added a tested single-file Web Component entry for no-build/CDN pages, a
  side-effect-free normal bundler entry with explicit registration, and an
  opt-in `/auto` registration entry.
- Added reusable Playwright assertions for block direction, ordered isolation,
  logical selection/clipboard text, and base-start token geometry; the visual
  suite now consumes the same public helper API.

### Evidence and release engineering

- Added 918 schema-validated corpus fixtures, with fixture #001 representing
  the user flagship, 196 attributed `v1.3-Her` seeds, and native-review status
  recorded explicitly.
- Added 347 unit/property/action tests with enforced coverage thresholds and 24
  visual/browser tests across Chromium, Firefox, and WebKit; property seeds make
  coverage evidence reproducible across consecutive runs.
- Added strict-mode false-positive regressions for ordinary Persian, Arabic,
  Hebrew, Urdu, Sindhi, Pashto, Kurdish Sorani, mixed prose, and emoji.
- Added package-local examples/readmes/licenses, ESM type-layout checks,
  an executable anti-hollow package-depth gate, aggregate bundle budgets,
  tarball inspection, clean-consumer install,
  strict declaration checking, runtime imports, installed CLI execution, and
  execution of every exact packed example in the isolated consumer.
- Set the production runtime floor to maintained Node.js 22.12+, test Node 22
  and 24 LTS in CI, and refreshed Commander, ESLint, and the Vite React plugin
  to their current compatible majors.
- Added CycloneDX 1.7 generation/validation, dependency audit, Changesets,
  actionlint-validated GitHub Actions, publishing gates, English/Persian docs,
  accessibility guidance, benchmark matrices, and honest limitations.
- Added Windows/macOS quality jobs, machine-readable weekly benchmark
  artifacts, an opt-in Pages demo deployment, mixed-script presets,
  adjustable streaming, policy/security controls, live four-way input,
  AST/evidence/isolation/security inspection, an offline searchable 918-case
  corpus asset, logical-copy verification, semantic HTML/JSON export,
  shareable state, explicit theme, and English/Persian UI.
- Added a bundled Node 24 GitHub Action for source audits and corpus tests with
  JSON/SARIF output, real exit propagation, workspace-contained reports,
  generated-artifact smoke tests, and explicit third-party notices.
