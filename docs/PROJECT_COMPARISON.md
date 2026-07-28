# Sibling-project audit and idea traceability

This audit began with the local project folders available on 2026-07-21 and
was extended through the `v1.5-Her` working tree on 2026-07-27. It is not a
marketing comparison with external libraries. Counts come from files in those
folders and do not treat README claims as proof.

## Reproducible inventory

| Local project | Public package folders | Package test files | Package `expect(` calls | Visual specs / `expect(` calls | Corpus fixtures present |
|---|---:|---:|---:|---:|---:|
| `v1-cgtt` | 5 | 4 | 38 | 0 / 0 | 16 |
| `v1-Her` | 7 | 7 | 57 | 0 / 0 | 2 |
| `v1.1-Her` | 9 | 9 | 67 | 0 / 0 | 2 |
| `v1.2-Her` | 9 | 9 | 67 | 0 / 0 | 2 |
| `v1.3-Her` | 11 | 11 | 197 | 3 / 64 | 200 |
| `v1.4-Her` working tree | 16 | 21 | 745 | 1 / 18 | 310 |
| `v1.5-Her` working tree | 16 | 23 | 997 | 4 / 82 | 616 |
| canonical BidiLens checkout | 12 | 15 | 1,248 | 3 / 63 | 918 |

Static assertion counts are only a depth signal; the canonical total is 1,311
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
standalone custom element, direction-exact corpus comparison (plus exact
isolation expectations where authored), packed-consumer tests, and
Chromium/Firefox/WebKit behavior checks. An ad-hoc same-process audit on this
machine also put canonical ahead for both 10 KiB and 100 KiB English, Persian,
and representative technical/Persian inputs after duplicate analysis passes
were removed. Because that sibling checkout and harness are not published with
this repository, this observation is deliberately not presented as a
reproducible product benchmark or a universal latency claim; BidiLens' own
committed benchmark remains the release regression evidence.

## `v1.5-Her` audit

`v1.5-Her` expands the sibling working tree to 616 on-disk fixtures and
1,233 passing test invocations, including 21 screenshot cases across
Chromium, Firefox, and WebKit. It also fixes the earlier HTML no-op predicate,
adds cross-isolate security reporting, makes Unicode 17 data reproducible, and
adds useful benchmark cases. Those are genuine improvements over
`v1.4-Her`, and the review did not dismiss them merely because their package
names differ from BidiLens.

The live tree is nevertheless not a releasable or reproducible project. It has
58 modified tracked files and 705 untracked files. Of the 616 corpus fixtures,
306 are untracked. The following commands were run after a successful frozen
lockfile install:

- `pnpm run test`, `pnpm run lint`, `pnpm run unicode:check`,
  `pnpm run sbom:check`, and `pnpm run bench` pass;
- `pnpm run build` and `pnpm run typecheck` fail because
  `@bidiguard/cli` does not provide Node types for `node:fs/promises`,
  `node:path`, `Buffer`, and `process`;
- `pnpm audit --audit-level low` reports 17 findings in the workspace
  development and peer-test dependency graph: five high, eleven moderate, and
  one low. The audit did not establish exposure in shipped runtime tarballs;
- the root coverage command forwards `"--" "--coverage"` and does not refresh
  its only existing `lcov.info`, which predates the audit by three days;
- the normal release check rejects the dirty tree, while
  `node scripts/release-check.mjs --allow-dirty` passes by inspecting existing
  `dist` folders without rebuilding, packing, installing, importing, or
  executing them;
- the primary CI matrix uses a valid pinned `pnpm/action-setup` commit and
  reaches the same CLI build failure described above. A different, malformed
  pin in the security self-scan job prevents that job from reaching its scan;
- the declared GitHub repository does not exist and npm returns `E404` for
  both `@bidiguard/core` and `@bidiguard/react-native`. Canonical BidiLens is
  public and its 12 packages resolve at version `0.3.0`.

Passing tests also miss release- and behavior-critical defects reproduced
against the built sibling artifacts:

- after `finish()`, a stream may auto-reopen. If appended text creates a new
  block, the old block-index cache can return analysis for the pre-append
  source. A reproduced block whose source was `Hello سلام` still reported the
  counts for `Hello` alone;
- `stabilityThreshold` is calculated but never used. Hysteresis changes only
  `analysis.direction`, so a live result can claim an LTR block while its
  paragraph, counts, confidence, and isolation plan still describe an RTL
  analysis;
- the DOM adapter analyzes all descendant text but mutates only direct child
  text nodes. On `Hello <strong>سلام</strong> world`, it left the Persian word
  untouched and wrapped ` wor` as RTL. BidiLens traverses the real text-node
  tree, preserves author markup, is idempotent, and restores the original
  subtree; this exact adversarial case is now a named regression test;
- all 15 React Native tests bypass `BidiText` and `useBidiStream` and call
  core analysis directly. No component, Android, iOS, Expo, or device renderer
  is exercised, and the `streaming` prop does not change rendering behavior;
- the Playwright helper named `expectTextOrder` compares `textContent` indexes,
  which are logical source order rather than visual order. BidiLens checks
  physical edge geometry in real browsers as well as logical copy/selection;
- changing the Web Component's observed `streaming` attribute does not
  rerender it. The component called `bidi-markdown` also splits plain text on
  blank lines rather than parsing Markdown;
- the Action still launches an untracked CLI `dist` file relative to the
  downstream `GITHUB_WORKSPACE`. Its apparent end-to-end test passes the
  sibling repository root as the working directory and therefore masks the
  consumer failure. Canonical ships and probes a self-contained Action bundle;
- corpus tests assert exact block direction, but expected isolations are only
  checked for source-span coverage. Their declared direction and kind are
  ignored. Only 251 fixtures contain any isolation expectation, and only 25
  fixtures carry a provenance field;
- the mixed-script scanner treats any Latin/Cyrillic or Latin/Greek mixture as
  a confusable without UTS #39 data, while identifiers separated by common
  punctuation can evade the word regex. BidiLens deliberately does not market
  this heuristic as a confusable engine;
- citation and security metadata claim a placeholder DOI, non-existent
  project destinations, a complete UAX #9 implementation, published packages,
  and universal false-positive freedom that the source and registry do not
  substantiate.

The second pass retained the sibling's useful intent while replacing its
weaker implementations: canonical raw analysis now recognizes closed
multiline fences embedded in prose without changing standalone/incomplete
raw-text policy; invisible-character auditing covers contextual
ASCII-identifier ZWNJ/ZWJ, WORD JOINER, and midstream BOM without flagging
ordinary Persian or emoji joining; category-selective sanitization keeps
opener/closer families atomic; and packed artifacts execute mixed-direction
plus pure-LTR non-interference probes across the actual adapters. Existing
advantages remain context-aware default non-interference, cross-isolate
security checks with dual offsets, exact final stream reconciliation,
three-browser geometry tests, reproducible Unicode sources and checksums,
CycloneDX 1.7 generation, and a clean packed-consumer release gate.

The sibling's one unambiguously broader low-level API is a public full Unicode
`BidiClass` lookup. That API was not copied: adding a second Unicode standards
package would expand bundle, compatibility, and long-term conformance
obligations without improving the browser rendering policy. Mature UAX #9
engines remain the appropriate dependency for consumers that need full
reordering. Its Apache-2.0 license also supplies an explicit patent grant that
MIT does not; licensing suitability is a procurement decision, not evidence
of rendering correctness, and BidiLens retains the user-selected MIT license.

## Material ideas reviewed

| Idea found across siblings | Canonical disposition |
|---|---|
| Content-majority default for the user flagship | Implemented and fixture #001 |
| Unicode range lookup instead of hand-written script ranges | Implemented from pinned Unicode 17 bidi-class and general-category data with checksums/generator |
| Separate `stream` and `security` package proposals | Dependency-free direction/security primitives remain in `@bidilens/core`; parser-specific rich state lives in `@bidilens/markdown`, avoiding thin packages while keeping the parser out of core |
| Block evidence and language-neutral offsets | Implemented in `analyzeBlock` with UTF-16 and code-point ranges |
| Versioned language-neutral output contracts | Implemented in `@bidilens/spec` with strict analysis/security/stream JSON Schemas validated against real core output |
| Technical-token exclusion and inline planning | Implemented with monotonic range traversal, a conservative expanded built-in vocabulary, and caller-supplied `technicalIdentifiers` propagated through every applicable adapter |
| Complete multiline fences in raw core analysis | Adopted with linear line scanning for closed backtick/tilde fences embedded in prose, including longer closers and CR/LF variants; standalone/incomplete raw fences retain literal evidence and the Markdown package remains the richer parser-aware path |
| Selective bidi-control preservation | Adopted as risk plus semantic `removeGroups`; embedding/override/PDF and isolate/PDI are atomic families, with exact removed-control metadata |
| Extra invisible-character diagnostics | Adopted with tighter context than the sibling heuristic: ASCII-identifier ZWNJ/ZWJ, WORD JOINER, and midstream BOM are reported while Persian ZWNJ, emoji ZWJ, and a leading byte-order signature remain accepted |
| Semantic HTML compiler | Implemented as an escaped package with a conservative non-executable tag allowlist |
| DOM mutation support | Implemented with custom selectors, idempotence, restoration, and isolation |
| unified plus markdown-it support | Implemented in one deep Markdown package, with batch adapters for both and a rich checkpointed Markdown-It stream |
| React SSR and streaming | Implemented with duplicated-initial-text regression coverage, explicit SSR/client completion, revisable default direction, and independent blocks when accumulated paragraphs differ in direction |
| Vue and Svelte adapters | Implemented idiomatically with stream APIs |
| Sibling `BidiMarkdown` framework wrappers | Replaced by composition with the real AST-based Markdown package; the sibling wrappers only split plain-text blocks despite their name and therefore were not copied |
| Opt-in `skipIfNotMixed` no-op mode | Superseded by canonical default `needsBidiIntervention`: pure LTR in LTR context is untouched, English-majority text containing RTL is still isolated, LTR under an RTL parent is protected, and explicit policies remain authoritative |
| Framework-independent custom element | Implemented with DOM node construction, a side-effect-free main entry, explicit `/auto` registration, and a bundled standalone entry |
| Chunk-boundary-invariant streaming | Implemented for final and live decisions with source-position checkpoints, misleading-prefix revision, an explicit sticky strategy, pending-surrogate handling, UTF-16 boundary properties, and completed-paragraph immutability |
| Trojan-Source-style scanner | Implemented with balance/cross-isolate checks, modes, dual offsets, and SARIF |
| Conservative terminal behavior | Implemented with complete ECMA-48 CSI/string-control masking; control insertion remains opt-in |
| CLI inspection/audit/render/test/sanitize | Implemented with deterministic directory filtering, unconditional explicit-file scans, and symlink skipping |
| Corpus schemas and numbered words | Implemented with JSON Schema and 918 direction-exact cases; 197 also carry exact isolation expectations, five carry security-code expectations, and numbered-order arrays are schema/permutation fixtures rather than rendered-geometry oracles |
| Package/release evidence | Implemented with examples executed from all tarballs, licenses, ESM type analysis, pack/install consumer, audit, and SBOM command |
| Reusable Playwright assertions | Implemented as a public package and exercised for direction, source text, isolation metadata, logical selection/clipboard, and physical edge geometry in the three-browser suite |
| React Native adapter | Not copied from `v1.4-Her` or `v1.5-Her`: their tests never import the adapter and there is no iOS/Android rendering gate. Canonical instead implements native Android directly with Kotlin core, Views, Compose, a sample, generated corpus parity, and device tests. React Native remains deferred until it has equivalent adapter-level iOS/Android evidence |
| Public full Unicode `BidiClass` lookup | `v1.4-Her` and `v1.5-Her` are broader here. Canonical deliberately exposes generated strong-direction/natural-letter helpers used by application policy, while mature UAX #9 engines remain the correct dependency for full class/reordering work. Copying a second public standards surface would increase size and long-term compatibility obligations without improving browser message rendering |
| API compatibility aliases and character helpers | Equivalent analysis, direction, run segmentation, control inspection, evidence, and sanitization primitives already exist; aliases are accepted only where they do not create ambiguous duplicate contracts |
| Target matrices and upstream contribution dossiers | Reviewed as archival research; their issue/PR routing principle is retained in adoption guidance, but dated product-policy claims are not presented as current integrations. Fresh 2026-07-27 host research and submissions are recorded separately in the [outreach log](OUTREACH_LOG.md) |
| Honest limitations and publishing guide | Implemented; false badges and fake repository metadata rejected |

### Ideas specifically reconciled from `v1.3-Her`

| `v1.3-Her` idea | Canonical decision and evidence |
|---|---|
| Explicit `math` / `inlineMath` nodes | Adopted in the unified Markdown adapter as LTR code-like nodes, with regression coverage |
| Reset with replacement text | Adopted atomically in the shared core stream and every framework adapter; one state transition replaces the source |
| Wider multilingual examples | 196 substantive strings imported under their Apache-2.0 notice; four empty/whitespace-only cases were excluded because they add no linguistic oracle; canonical outputs were recomputed and 17 documented policy differences were retained rather than copying sibling labels blindly |
| No-build custom element | Adopted as a genuinely self-contained `standalone.js`; normal imports remain externalized for deduplication, and all three browsers load the packed design without an import map |
| Demo presets and inspectors | Adopted and extended into a complete offline bilingual playground: policy/security and stream controls, four-way live input, AST/evidence/isolation/security, searchable 918-case asset, copy verification, semantic HTML/JSON export, hash state, theme, and an opt-in Pages workflow |
| Cross-platform CI | Complete `check` and example jobs pass on Windows and macOS in addition to Ubuntu Node 22/24; Android adds unit/lint/AAR/APK and API 35 emulator jobs; public hosted results are linked from the release report |
| Machine-readable benchmark history | Adopted as manual/weekly JSON artifacts; kept advisory because shared CI hardware is noisy |
| CLI color and `.gitignore` plan | Color work is unnecessary because canonical CLI output contains no ANSI styling. Recursive audits already restrict traversal to known text extensions, skip symlinks/common generated directories, and still scan explicitly named files. `.gitignore` is deliberately not an implicit security boundary; a future opt-in requires full nested-pattern semantics rather than a partial matcher |
| Separate core/stream/security packages | Not copied: direction/security APIs live in dependency-free core and parser-specific rich streaming lives beside the Markdown adapters, avoiding thin package boundaries and version-skew risk |
| Full accumulated Markdown reparse while streaming | Replaced by a real Markdown-It session: per-push direction, geometric and structural rich revisions, dirty/pending ranges, conservative stable prefixes, and one exact final reconciliation. The measured benchmark records the actual rich parse count rather than assuming one parse per chunk |
| Direction on an aggregate table | Rejected because `direction: rtl` on the table can reverse column order; canonical annotates semantic cells independently |
| Simplistic mixed-script/confusable warning | Rejected pending a sourced UTS #39 policy to avoid false security claims and ordinary multilingual false positives |
| `innerHTML` custom element and ambiguous package side effects | Rejected; canonical constructs text/element nodes, keeps its main import side-effect-free, and limits global registration to explicit `/auto` and standalone entries |

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
| `v1.5-Her` working tree | 80 | 39 | 76 | Broader fixtures and three-browser screenshots, but no clean source release, broken build/type/CI gates, stale package checks, workspace dev-tool advisories, and reproduced stream/DOM defects |
| canonical BidiLens | **90** | **95** | **96** | External native-speaker/accessibility/security review, signed Android distribution, remaining native surfaces, upstream integrations, and a downstream pilot remain |

A score of 100 would be false today. Even the canonical web artifact cannot
prove historical “first” status, absence of every defect, or acceptance by a
large AI company from local source alone. Its lead is reproducible within this
folder: it is the only candidate here with all local release gates, safe packed
consumers, current reproducible Unicode data, meaningful security properties,
three-engine visual/behavior tests, and explicit evidence boundaries.

## Ideas deliberately deferred

The sibling documents mention Flutter, React Native, SwiftUI, VS Code,
Electron, PDF, editor integrations, and upstream product dossiers. Every local
sibling source/package surface and the retained integration dossiers were
reviewed, but no sibling contains enough tested source to transplant these
honestly. Creating empty folders would violate the anti-hollow rule, so they
remain explicit roadmap items until a real implementation, at least 25
meaningful assertions, example, README, and executable platform gate can be
supplied. Upstream dossiers must also be re-researched against current product
architecture and contribution policy before submission.

Android is no longer a deferred folder: it was implemented independently
against the canonical contract and admitted only after Kotlin corpus parity,
JVM/Robolectric coverage, a runnable sample, lint/AAR/APK builds, and real
Views/Compose emulator tests passed.

Likewise, the sibling's fake passing badge, “enterprise-grade” label, and
unreproducible release/corpus counts were rejected rather than copied.

## Comparative conclusion

Within the shared JavaScript/web scope that exists as executable source, the
canonical checkout is objectively deeper and better verified than every
sibling: stronger package-local test depth, a much larger direction-exact
corpus with a documented subset of exact isolation/security expectations,
generated current Unicode data, property/visual/security coverage, safe
serialization, and clean tarball consumers. `v1.4-Her` and `v1.5-Her` have
more package folders, but several split capabilities already provided by
canonical core into separate packages. Their extra React Native surface lacks
adapter-level or device evidence; `v1.5-Her`'s full Unicode-class lookup is a
deliberately separate low-level concern rather than a rendering advantage.

It is not “100% better” in every conceivable dimension: some sibling documents
describe a wider future platform vision. This repository records that wider
vision, implements Android with executable evidence, and does not call the
remaining unbuilt platforms complete. That distinction is a quality
improvement, not a missing marketing claim.
