# Sibling-project audit and idea traceability

This audit compares the local project folders available on 2026-07-20. It is
not a marketing comparison with external libraries. Counts come from files in
those folders and do not treat README claims as proof.

## Reproducible inventory

| Local project | Public package folders | Package test files | Package `expect(` calls | Visual specs / `expect(` calls | Corpus fixtures present |
|---|---:|---:|---:|---:|---:|
| `v1-cgtt` | 5 | 4 | 38 | 0 / 0 | 16 |
| `v1-Her` | 7 | 7 | 57 | 0 / 0 | 2 |
| `v1.1-Her` | 9 | 9 | 67 | 0 / 0 | 2 |
| `v1.2-Her` | 9 | 9 | 67 | 0 / 0 | 2 |
| `v1.3-Her` | 11 | 11 | 197 | 3 / 64 | 200 |
| canonical BidiLens checkout | 12 | 14 | 692 | 3 / 63 | 918 |

Static assertion counts are only a depth signal; the canonical total is 755
across package and visual tests. The canonical checkout also runs those tests,
coverage thresholds, examples, the three-browser visual suite,
dependency audit, Unicode reproducibility, tarball inspection, and isolated
consumer install. The sibling folders do not provide equivalent passing
release gates.

The retained `bidilens-v1.2.0` folder under `v1.1-cgtt` contains documentation
but no package source. Its claims of 125 fixtures and broader packages cannot
be reproduced from the surviving artifacts and are therefore treated as ideas,
not delivered evidence.

## `v1.3-Her` audit

`v1.3-Her` is the strongest sibling and contains several real advances over
the earlier `Her` folders. Its frozen install, package build, unit tests,
typecheck, and lint pass locally. The unit suite contains 367 executed tests,
including 200 fixture files. It also proposes separate stream/security
packages, a richer demo, a no-build custom element, math handling, benchmark
artifacts, and broader CI.

Those strengths do not make its published-readiness claims reproducible:

- the root test command explicitly skips visual tests;
- the primary visual configuration serves the fixtures directory at `/` but
  navigates to `/fixtures/index.html`, while also collecting playground tests
  that require a different server; the run does not reach the expected
  locator, and the committed `.last-run.json` records 13 failed tests;
- visual baselines omit Firefox and CI does not run the visual suite;
- documentation still reports 10 packages and 59 tests, not the observed 11
  packages and 367 tests;
- the deployed Web Component demo copies an unbundled file with a bare
  `@bidiguard/core` import, so a plain browser cannot resolve it; its package
  also marks an auto-registering entry `sideEffects: false`;
- aggregate table direction can reverse column flow, Markdown renderers are
  overwritten rather than composed, and the custom element uses `innerHTML`;
- the mixed-script security heuristic covers only a small BMP subset and is
  not a UTS #39 implementation; the separate Markdown stream helper reparses
  all accumulated source on each update;
- generated Unicode 16 tables have no committed source/checksum reproduction
  gate, and public JavaScript callers can pass invalid values through parts of
  the typed-only boundary.

The audit restored `v1.3-Her` to its original clean worktree after testing; no
sibling source was edited.

## Material ideas reviewed

| Idea found across siblings | Canonical disposition |
|---|---|
| Content-majority default for the user flagship | Implemented and fixture #001 |
| Unicode range lookup instead of hand-written script ranges | Implemented from pinned Unicode 17 bidi-class and general-category data with checksums/generator |
| Separate `stream` and `security` package proposals | Their useful APIs are implemented in `@bidilens/core`; keeping them together avoids two tiny dependency layers while preserving streaming, scan, sanitize, and SARIF capabilities |
| Block evidence and language-neutral offsets | Implemented in `analyzeBlock` with UTF-16 and code-point ranges |
| Versioned language-neutral output contracts | Implemented in `@bidilens/spec` with strict analysis/security/stream JSON Schemas validated against real core output |
| Technical-token exclusion and inline planning | Implemented with monotonic range traversal and expanded token classes |
| Semantic HTML compiler | Implemented as an escaped package with a conservative non-executable tag allowlist |
| DOM mutation support | Implemented with custom selectors, idempotence, restoration, and isolation |
| unified plus markdown-it support | Implemented in one deep Markdown package |
| React SSR and streaming | Implemented with duplicated-initial-text regression coverage and explicit SSR/client completion |
| Vue and Svelte adapters | Implemented idiomatically with stream APIs |
| Sibling `BidiMarkdown` framework wrappers | Replaced by composition with the real AST-based Markdown package; the sibling wrappers only split plain-text blocks despite their name and therefore were not copied |
| Framework-independent custom element | Implemented with DOM node construction and side-effect metadata |
| Chunk-boundary-invariant streaming | Implemented for final and live decisions with source-position checkpoints, pending-surrogate handling, UTF-16 boundary properties, and completed-paragraph immutability |
| Trojan-Source-style scanner | Implemented with balance/cross-isolate checks, modes, dual offsets, and SARIF |
| Conservative terminal behavior | Implemented with complete ECMA-48 CSI/string-control masking; control insertion remains opt-in |
| CLI inspection/audit/render/test/sanitize | Implemented with deterministic directory filtering, unconditional explicit-file scans, and symlink skipping |
| Corpus schemas and numbered words | Implemented with JSON Schema, semantic technical-span numbering, and 918 cases |
| Package/release evidence | Implemented with examples executed from all tarballs, licenses, ESM type analysis, pack/install consumer, audit, and SBOM command |
| Reusable Playwright assertions | Implemented as a public package and exercised for direction, source text, isolation metadata, logical selection/clipboard, and physical edge geometry in the three-browser suite |
| Target matrices and upstream contribution dossiers | Reviewed as archival research; their issue/PR routing principle is retained in adoption guidance, but dated product-policy claims are not presented as current or ready-to-submit integrations |
| Honest limitations and publishing guide | Implemented; false badges and fake repository metadata rejected |

### Ideas specifically reconciled from `v1.3-Her`

| `v1.3-Her` idea | Canonical decision and evidence |
|---|---|
| Explicit `math` / `inlineMath` nodes | Adopted in the unified Markdown adapter as LTR code-like nodes, with regression coverage |
| Reset with replacement text | Adopted atomically in the shared core stream and every framework adapter; one state transition replaces the source |
| Wider multilingual examples | 196 substantive strings imported under their Apache-2.0 notice; four empty/whitespace-only cases were excluded because they add no linguistic oracle; canonical outputs were recomputed and 16 documented policy differences were retained rather than copying sibling labels blindly |
| No-build custom element | Adopted as a genuinely self-contained `standalone.js`; normal imports remain externalized for deduplication, and all three browsers load the packed design without an import map |
| Demo presets and inspectors | Adopted and extended into a complete offline bilingual playground: policy/security and stream controls, four-way live input, AST/evidence/isolation/security, searchable 918-case asset, copy verification, semantic HTML/JSON export, hash state, theme, and an opt-in Pages workflow |
| Cross-platform CI | Configured as complete `check` and example jobs on Windows and macOS in addition to Ubuntu Node 22/24; hosted results begin only after the repository is pushed |
| Machine-readable benchmark history | Adopted as manual/weekly JSON artifacts; kept advisory because shared CI hardware is noisy |
| CLI color and `.gitignore` plan | Color work is unnecessary because canonical CLI output contains no ANSI styling. Recursive audits already restrict traversal to known text extensions, skip symlinks/common generated directories, and still scan explicitly named files. `.gitignore` is deliberately not an implicit security boundary; a future opt-in requires full nested-pattern semantics rather than a partial matcher |
| Separate core/stream/security packages | Not copied: the mature APIs already live in dependency-free core, avoiding two tiny package boundaries and version-skew risk |
| Full accumulated Markdown reparse while streaming | Not copied: it is quadratic over repeated updates and its lightweight splitter is not a full Markdown parser; canonical paragraph streaming already freezes completed blocks and preserves chunk invariance |
| Direction on an aggregate table | Rejected because `direction: rtl` on the table can reverse column order; canonical annotates semantic cells independently |
| Simplistic mixed-script/confusable warning | Rejected pending a sourced UTS #39 policy to avoid false security claims and ordinary multilingual false positives |
| `innerHTML` and `sideEffects: false` custom element | Rejected; canonical constructs text/element nodes and explicitly retains auto-registration side effects |

The general corpus row above is now 918 cases, not 722: 722 authored/generated
canonical fixtures plus the 196 attributed comparison seeds.

## Evidence-calibrated ratings

These scores are engineering judgments, not market facts. “Novelty” measures
distinctiveness inside this local set rather than proving historical priority;
“readiness” measures the checked web artifact before external ownership/audit
gates; “AI-company potential” measures integration fit, not expressed company
interest.

| Local project | Novelty / 100 | Readiness / 100 | AI-company potential / 100 | Main constraint |
|---|---:|---:|---:|---|
| `v1-cgtt` | 58 | 43 | 55 | Useful seed, limited surfaces and verification |
| `v1-Her` | 64 | 36 | 56 | Wider design, shallow executable evidence |
| `v1.1-Her` | 67 | 45 | 61 | More packages, very small corpus and no visual gate |
| `v1.2-Her` | 67 | 45 | 61 | Substantively the same executable implementation as `v1.1-Her` |
| `v1.3-Her` | 74 | 55 | 70 | Stronger scope and tests, but broken/omitted visuals and unsafe/incomplete distribution details |
| canonical BidiLens | **88** | **96** | **91** | External identity, native review, accessibility/security audit, and downstream pilot remain |

A score of 100 would be false today. Even the canonical web artifact cannot
prove historical “first” status, absence of every defect, or acceptance by a
large AI company from local source alone. Its lead is reproducible within this
folder: it is the only candidate here with all local release gates, safe packed
consumers, current reproducible Unicode data, meaningful security properties,
three-engine visual/behavior tests, and explicit evidence boundaries.

## Ideas deliberately deferred

The sibling documents mention Android, Flutter, React Native, SwiftUI, VS Code,
Electron, PDF, editor integrations, and upstream product dossiers. Every local
sibling source/package surface and the retained integration dossiers were
reviewed, but no sibling contains enough tested source to transplant these
honestly. Creating empty folders would violate the anti-hollow rule, so they
remain explicit roadmap items until a real implementation, at least 25
meaningful assertions, example, README, and executable platform gate can be
supplied. Upstream dossiers must also be re-researched against current product
architecture and contribution policy before submission.

Likewise, the sibling's fake passing badge, “enterprise-grade” label, and
unreproducible release/corpus counts were rejected rather than copied.

## Comparative conclusion

Within the JavaScript/web scope that exists as executable source, the canonical
checkout is objectively more complete and better verified than every sibling:
more real packages, package-local test depth, a much larger validated corpus,
generated current Unicode data, property/visual/security coverage, safe
serialization, and clean tarball consumers.

It is not “100% better” in every conceivable dimension: some sibling documents
describe a wider future platform vision. This repository records that wider
vision without calling unbuilt platforms complete. That distinction is a
quality improvement, not a missing marketing claim.
