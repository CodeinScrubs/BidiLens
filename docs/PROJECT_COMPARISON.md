# Sibling-project audit and idea traceability

This audit compares the local project folders available on 2026-07-21. It is
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
| `v1.4-Her` working tree | 16 | 21 | 745 | 1 / 18 | 310 |
| canonical BidiLens checkout | 12 | 14 | 837 | 3 / 63 | 918 |

Static assertion counts are only a depth signal; the canonical total is 900
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

## `v1.4-Her` audit

`v1.4-Her` is broader than `v1.3-Her`: its current working tree has 16
publishable package folders, 742 passing tests when the seven Chromium visual
cases are included, a reproducible Unicode 17 data generator, an SBOM checker,
a second CLI, and a React Native package. Those are real scope advances, but
the working tree is not a reproducible release candidate. It contains 926
tracked insertions and 107 tracked deletions plus hundreds of untracked research
files, and has no Git remote. The following commands were run against a fresh
frozen-lockfile install:

- `pnpm run build` fails with 31 missing-Node-type errors in
  `@bidiguard/cli`;
- `pnpm run typecheck` fails on the same package;
- `pnpm run release:check -- --allow-dirty` still fails because the declared
  `@bidiguard/web-component/standalone` export does not exist;
- `pnpm audit --audit-level low` reports 11 known vulnerabilities, including
  one high-severity Vite advisory;
- `pnpm run test:coverage` passes its tests but does not enable coverage: the
  root command forwards a literal `-- --coverage`, and no coverage report is
  produced;
- `pnpm run lint`, the 742-test command, Unicode reproducibility, SBOM
  validation, and the advisory benchmark command pass. Lint reports four
  unused-disable warnings.

Passing tests do not cover several release-critical failures:

- the new `skipIfNotMixed` path equates an LTR base direction with LTR-only
  content. `The word سلام means hello.` therefore becomes plain unisolated
  HTML, losing the exact English-with-Persian correction the toolkit exists to
  provide. The DOM adapter makes the same document-level mistake, while the
  React wrapper still adds its own container even on the claimed no-op path;
- streaming hysteresis mutates only `analysis.direction`, leaving the
  confidence, paragraph direction, counts, and isolation plan computed for the
  opposite base. A reproduced live snapshot reported block `ltr`, paragraph
  `rtl`, 10 LTR versus 16 RTL strong characters, and isolated `Hello world` as
  LTR; `finish()` then changed the block to RTL. The documented
  `stabilityThreshold` option is never read, and every live update reparses all
  accumulated source, which the project's own long-stream benchmark shows is
  many times slower than one batch analysis;
- the streaming Web Component emits malformed markup such as
  `<p class="bk-provisional dir="rtl" ...>` and does not rerender when its
  observed `streaming` attribute changes. It also rewrites author light DOM
  with `innerHTML`;
- the GitHub Action invokes `packages/cli/dist/bin.js`, but package `dist`
  output is not tracked, the path is resolved from the downstream
  `GITHUB_WORKSPACE` instead of the Action's own checkout directory (for
  example, one derived from `import.meta.url`), and root CI never runs the
  Action test script. A consumer checking out an Action tag would not receive
  or resolve the required CLI;
- the 310 on-disk corpus cases assert exact block direction but only
  lower-bound-check the *number* of isolations. Expected isolation text, kind,
  direction, and ranges are parsed but never compared;
- most technical isolation records omit the advertised code-point range, and
  `mixed` means “paragraphs have different base directions,” not “both strong
  directions are present.” That semantic mismatch is the cause of the unsafe
  no-op gate;
- the React Native tests never import or render the React Native adapter; they
  only retest `@bidiguard/core`. Consequently the README's iOS, Android, Expo,
  Yoga, and inline-isolation claims have no native or component-level evidence;
- the security package keeps embedding and isolate stacks independently, so it
  misses cross-isolate formatting structure that canonical BidiLens reports.
  Its “false-positive-free guarantee” is inferred from a small benign list,
  not a defensible universal guarantee or a sourced UTS #39 implementation;
- the only active visual project is Chromium. The RLO case preserves the
  dangerous control and merely snapshots the resulting page; it does not prove
  that visual order is safe. Firefox and WebKit are commented out;
- the requirement matrix says the complete UAX #9 X1-L4 algorithm is
  implemented and the performance guide says `analyzeBlock` can call a full
  reorder pass, but the public source has no visual-reordering API. A later row
  in the same matrix correctly says the browser performs that work;
- documentation is internally stale: all ten plans remain marked `TODO`, two
  relative links are broken, repository URLs disagree, and current benchmark
  output contradicts the unconditional `2.3x faster` badge for short text.

Canonical BidiLens already has the safe versions of the worthwhile ideas:
context-aware default non-interference, exact dual-offset isolation contracts,
cross-isolate security checks, a bundled and self-tested Action, a genuinely
standalone custom element, strict corpus isolation comparison, packed-consumer
tests, and Chromium/Firefox/WebKit behavior checks. Its direct same-process
microbenchmark is not universally faster: `v1.4-Her` was faster on pure English
and Persian direction detection on this machine, while BidiLens was faster on
the representative technical-token-plus-Persian mixed workload. Performance is
therefore recorded as a tradeoff, not converted into an unsupported superiority
claim.

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
| Opt-in `skipIfNotMixed` no-op mode | Superseded by canonical default `needsBidiIntervention`: pure LTR in LTR context is untouched, English-majority text containing RTL is still isolated, LTR under an RTL parent is protected, and explicit policies remain authoritative |
| Framework-independent custom element | Implemented with DOM node construction and side-effect metadata |
| Chunk-boundary-invariant streaming | Implemented for final and live decisions with source-position checkpoints, pending-surrogate handling, UTF-16 boundary properties, and completed-paragraph immutability |
| Trojan-Source-style scanner | Implemented with balance/cross-isolate checks, modes, dual offsets, and SARIF |
| Conservative terminal behavior | Implemented with complete ECMA-48 CSI/string-control masking; control insertion remains opt-in |
| CLI inspection/audit/render/test/sanitize | Implemented with deterministic directory filtering, unconditional explicit-file scans, and symlink skipping |
| Corpus schemas and numbered words | Implemented with JSON Schema, semantic technical-span numbering, and 918 cases |
| Package/release evidence | Implemented with examples executed from all tarballs, licenses, ESM type analysis, pack/install consumer, audit, and SBOM command |
| Reusable Playwright assertions | Implemented as a public package and exercised for direction, source text, isolation metadata, logical selection/clipboard, and physical edge geometry in the three-browser suite |
| React Native adapter | Not copied from `v1.4-Her`: its tests never import the adapter and there is no iOS/Android rendering gate. A native package remains deferred until it has actual component tests plus device-level evidence, so a web-only repository is not burdened with an unverified platform claim |
| API compatibility aliases and character helpers | Equivalent analysis, direction, run segmentation, control inspection, evidence, and sanitization primitives already exist; aliases are accepted only where they do not create ambiguous duplicate contracts |
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
| `v1.4-Her` working tree | 78 | 42 | 74 | Broad and test-rich, but build/type/release/audit failures plus correctness bugs in its no-op, stream, Web Component, Action, and corpus gates |
| canonical BidiLens | **90** | **96** | **93** | External identity, native review, accessibility/security audit, and downstream pilot remain |

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

Within the shared JavaScript/web scope that exists as executable source, the
canonical checkout is objectively deeper and better verified than every
sibling: stronger package-local test depth, a much larger exactly validated
corpus, generated current Unicode data, property/visual/security coverage, safe
serialization, and clean tarball consumers. `v1.4-Her` has more package folders,
but several of those folders split capabilities already provided by canonical
core into separate packages, and its extra React Native surface lacks
adapter-level or device evidence.

It is not “100% better” in every conceivable dimension: some sibling documents
describe a wider future platform vision. This repository records that wider
vision without calling unbuilt platforms complete. That distinction is a
quality improvement, not a missing marketing claim.
