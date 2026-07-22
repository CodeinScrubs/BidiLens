# Changelog

All notable changes to this project are recorded here. The package set has not
been published from this checkout.

## 0.1.0 - 2026-07-18

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
- Added 234 unit/property/action tests with enforced coverage thresholds and 24
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
