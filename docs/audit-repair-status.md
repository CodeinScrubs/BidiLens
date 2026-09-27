# Audit repair status

Updated 2026-09-27. This is a repair ledger, not a production certification.
Tests, native builds, browser rendering, and hosted platform validation are
separate evidence gates. The working branch is
`fix/audit-regressions-20260926`; these source changes are not a published release.

## Latest follow-up: external 27-claim reports

The [claim-by-claim review](EXTERNAL_REVIEW_27_CLAIMS_2026_09.md) separates
wrong-checkout assertions from reproducible defects. New repairs retain grouped
numbers and percentages in one atom in JavaScript/Kotlin/Swift/C#/Rust; recognize
closed multiline display math while retaining paragraph-scoped controls; make
Svelte rejected writes transactional; and repair an incomplete URL-scheme
stream-cache transition. JavaScript numeric suffix matching is bounded, and
open bracketed display math uses an explicitly documented exact-analysis
fallback. The original sibling corpus seeds remain unchanged; reviewed policy
overrides and nine new fixtures produce 941 canonical cases.

Fresh local follow-up evidence:

| Gate | Result |
| --- | --- |
| `pnpm check` | 25 suites; 737 passed, 2 existing platform skips; 941 direction/isolation fixtures and 94 security fixtures; generated data, types, lint, docs, package-depth, all builds, and bundled Action probes passed. |
| Three-browser verification | 69 tests passed on the latest JavaScript source in Chromium, Firefox, and WebKit, including the new grouped-number/percentage geometry, source selection/restoration, and physical-left alignment case. |
| Independent source review | Reproduced and repaired malformed UTF-16 numeric boundaries, provisional bracket-token exclusions, and URL/bracket lexical overlap. Final URL/path probes covered 81 sources and 4,286 prefix/split/exclusion checks without mismatches. This is bounded review evidence, not a universal proof. |
| Windows | 5,786 assertions and 941 canonical cases passed with local .NET 10 and runtime roll-forward. Hosted pinned .NET 8 still requires verification of the changed native source. |
| Android | 39 core, 13 Compose, and 13 Views JVM/Robolectric tests passed with no skips; all three debug AARs assembled. This follow-up did not execute connected-device instrumentation locally. |
| Rust minimum 1.85 | Formatting, all-target check, denied-warning Clippy, and all-target tests passed: 34 conformance tests, including the 941-case corpus and numeric-prefix regression. |
| Dependency/SBOM checks | No known locked npm vulnerabilities reported; unchanged dependency graph still validates as CycloneDX 1.7 with 532 components and 546 relationships. |

Packed consumer/type/parser compatibility and clean-tree release
artifact gates must finish against this follow-up before publication is
considered. Apple/iOS source changed in this follow-up and cannot be compiled
on this Windows host; fresh macOS/iOS simulator and all hosted CI/CodeQL gates
are required. Earlier green native jobs do not certify the new Swift code.

Before this follow-up, source snapshot `07f3c8b` completed both
[CI](https://github.com/CodeinScrubs/BidiLens/actions/runs/36284399401) and
[CodeQL](https://github.com/CodeinScrubs/BidiLens/actions/runs/36284399317).
Those successes close the previous snapshot's queued gates, not the new code's
gates. The audit PR remains draft; no release or publication was performed.

## Implemented repairs

| Area | Repair and scope |
| --- | --- |
| JavaScript core | Pinned Unicode 17 extended-grapheme boundaries; strict UAX #9 first-strong handling of existing isolates; conservative first-argument command recognition; bounded email/path scanning with legacy non-overlapping email, Unicode simple-fold, and relative-path suffix compatibility; balanced mixed URL delimiters; streaming option/case parity and late syntax inside quoted command arguments. |
| DOM and Markdown | Isolate complete eligible phrases across formatting nodes without cloning original elements; retain logical text, selection, formatting identity, authored boundaries, and caller alignment. Refresh host CSS direction rather than retaining stale computed values. Unsupported partial cross-format ranges remain unwrapped. Keep cached identical-block analyses independently mutable; respect authored Markdown-It CSS bidi boundaries. |
| Android Compose | Resolve paragraph bases independently, even when run isolation is disabled; preserve logical editable values and non-paragraph annotation payloads; retain authored paragraph alignment while supplying direction. New layout instrumentation cases passed on API 35. |
| Windows WPF | Add paragraph-aware `Paragraph` and `RichTextBox` application/restoration, including nested lists, sections, and tables. Preserve source, selection, bindings, physical alignment, and current inherited styles. Tolerate malformed UTF-16 during analysis. |
| Native core policies | Generate the curated command vocabulary from one source for Kotlin, Swift, C#, and Rust; implement conservative command boundaries, strict isolate-aware first-strong logic, strategy-sensitive technical exclusion, and balanced URL delimiters. Platform-specific verification is listed below. |
| HTML, terminal, assertions | Preserve CR/CRLF through HTML parsing; enforce required Playwright isolate counts; distinguish NEL from ANSI and avoid injecting isolate bytes into incomplete terminal control sequences. |
| CLI and GitHub Action | Discover the packaged corpus; shield runner logs from untrusted workflow commands; isolate consumer probes from ambient runner inputs and explicitly test production log shielding under `GITHUB_ACTIONS=true`; validate SARIF output targets, use exclusive temporary files and atomic replacement, preserve prior reports on failure, index source positions once, and encode artifact URI segments. |
| Demo | Use the selected direction policy and inherited UI context throughout preview, inspector, exports, and streaming. Reconcile completed streams. Wrap narrow panel toolbars so controls are not silently clipped. |

The native command policy is a curated recognition heuristic, not a shell
parser. Native option/API compatibility boundaries are documented in the
respective platform guides. Android Views and WPF `TextBlock`/`TextBox` retain
whole-control bases; per-paragraph policies use Compose or WPF document APIs.

## Verification of this audit branch

Local Windows checks completed against the latest code revision `81119bc`:

| Gate | Evidence |
| --- | --- |
| `pnpm check` | TypeScript, ESLint, generated data and package-depth checks; 24 unit suites, 694 passed and 2 platform-specific skips; 932 canonical direction/isolation fixtures and 94 security fixtures; documentation links; workspace builds; bundled Action runtime probes. The full run also passed with ambient `GITHUB_ACTIONS=true`. |
| `pnpm test:visual` | 66 tests passed across Chromium, Firefox, and WebKit, including source/copy/selection, authored boundaries, left alignment, rendering policies, completed streams, and toolbar containment at 320/390/768/1024/1280/1440 px in English and Persian. |
| Latest Markdown regressions | Eight failing cases reproduced analysis aliasing, authored CSS-boundary crossings, case-insensitive attributes, and a whitespace-related normal-style false positive. Twelve new checks now pass; the complete Markdown and inline-forest suites passed 155 tests. |
| Latest lexical regressions | Thirteen new checks cover relative paths after non-word prefixes, non-overlapping chained email candidates, and the legacy `ſ`/`K` simple-fold matches. A separate public-API differential probe against `origin/main` matched 26,285 bounded inputs. Independent review exercised 328,265 email and 299,593 relative-path cases. These bounded comparisons are not proof over every input or an RFC email-validation claim. |
| `pnpm packages:types` | Packed declarations and supported ESM/bundler resolution passed for all 12 JavaScript packages. CommonJS remains dynamic-import-only. |
| `pnpm markdown-it:compat` | Packed strict TypeScript consumers, 932 canonical cases, and 9 host-structure cases passed on Markdown-It 13.0.2, 14.3.1, and 15.0.1 after the latest lexical repairs. |
| `pnpm deps:audit` | No known locked npm dependency vulnerabilities reported. This is not an independent security audit. |
| `pnpm sbom` / `pnpm sbom:check` | CycloneDX 1.7 validated after incorporating current `main`: 532 components, 546 dependency relationships. |
| `pnpm release:check` | Clean-tree run: all 12 tarballs inspected; strict TypeScript/runtime/CLI consumer passed; four integration guides compiled and exercised; all 12 packed examples executed; raw and gzip size budgets passed. The command completed against committed source without `--allow-dirty`; this is still not a publish decision. |
| Windows native verification | 5,728 assertions and 932 canonical cases passed using local .NET 10 with runtime roll-forward. The hosted pinned .NET 8.0.423 job also passed, including WPF sample builds and both NuGet packs. |
| Android | 38 core, 13 Compose, and 13 Views JVM tests passed. The API 35 emulator passed 7 Compose and 4 Views instrumentation tests on rerun, including new independent-paragraph/physical-left layout cases and real-clipboard source preservation. The initial infrastructure failure is documented below. |
| Apple | Hosted Swift core verification and iOS adapter build passed; simulator test output reports 34 tests with zero failures. This Windows host has no local Swift/iOS runtime. |
| Rust | Minimum Rust 1.85: formatting, all-target check, Clippy with denied warnings, and all-target tests passed locally (32 tests, including canonical corpus checks). Hosted Linux/macOS/Windows jobs also passed. |

Local JavaScript toolchain: Node 25.2.1 / pnpm 10.27.0. The packed-library,
parser-compatibility, and release-artifact checks above were rerun against
`81119bc`. Native sources did not change between that revision and the hosted
snapshot described below.

### Hosted snapshot and Android rerun

Source snapshot `6f762ca9a5dd60b44488756618fbfda356eee3d1` passed all 25
reported checks: [functional CI](https://github.com/CodeinScrubs/BidiLens/actions/runs/36282885982)
and [CodeQL](https://github.com/CodeinScrubs/BidiLens/actions/runs/36282886006).
These include minimum Node 22.12 and Node 24.15, cross-platform quality,
packed consumers, browser tests, Android libraries/sample, native platforms,
and all five CodeQL language jobs. No open code-scanning alerts were returned
when checked. Neither green CodeQL nor an empty alert list establishes an
independent security audit. Later commits require their own hosted results.

In the first API 35 run, the clipboard case timed out at its initial
window-focus wait, before selecting or copying text. The retained screenshot
and window diagnostics show a **Quickstep ANR modal owning focus**. The new
layout cases and all four Views cases passed in that run. A fresh-runner rerun
passed all seven Compose and four Views cases with no skipped tests; the real
clipboard and source-equality assertions were not weakened. This records an
infrastructure flake, not proof that every physical-device clipboard/IME path
works.

The draft [audit PR #162](https://github.com/CodeinScrubs/BidiLens/pull/162)
incorporates `main`'s current dependency lockfile and CodeQL action pins. The
conflict resolution preserves those upstream versions rather than reverting
them to the older audit baseline. Hosted checks, not draft status or local
test counts, determine whether that combined branch can be merged.

Release-artifact checks executed the clean packed consumer, CLI, guides, and
examples. Earlier `--allow-dirty` probes were development-only and did not
satisfy the clean-tree release requirement. The latest clean-tree run does
satisfy that artifact gate; publication still needs an explicit release
decision and the protected provenance-capable workflow.

## Remaining repairs and release gates

- UIKit independent paragraph bases, ownership-aware restoration, and
  marked-text composition still need repair and simulator/device validation.
  Existing hosted compiler, simulator, and Swift CodeQL results do not close
  these unimplemented source gaps. Until repaired, keep separate read-only
  blocks in separate controls and defer applying/restoring editable adapters
  while marked text is active; see the [Apple guide](../apple/README.md).
- Native engines do not yet implement the JavaScript core's full pinned
  extended-grapheme rules. Shared direction fixtures do not establish native
  cluster-boundary parity.
- Native offset construction and regex complexity still need dedicated
  adversarial workload review. The bounded JavaScript email/path scanners do
  not prove native implementations have equivalent complexity.
- Kotlin data-class `copy(strategy = ...)` retains its previous explicit
  Boolean token-exclusion field rather than recalculating the new strategy's
  constructor default. The Android guide documents choosing both fields;
  automatic tri-state override semantics remain an API-design follow-up.
- Ambiguous dollar/environment/math overlaps can still cause provisional
  live-stream differences and repeated full rescans. `finish()` is the exact
  batch-reconciliation boundary; no universal linear streaming guarantee is
  claimed.
- The new Android layout tests have API 35 evidence, but still need API 36
  and physical-device coverage. Require fresh hosted Node minimum-version,
  cross-platform quality, native, and CodeQL gates against the latest PR head;
  the green `6f762ca` snapshot predates the final JavaScript lexical repairs.
- Independent security review, native-speaker corpus certification,
  accessibility/IME laboratory testing, and downstream production pilots
  remain outstanding. No company adoption or universal rendering guarantee
  is inferred from green tests.

Full Unicode grapheme data and rich-text preservation deliberately increase
the JavaScript facade size. Release checks now bound both aggregate raw
JavaScript and gzip bytes for the core, DOM, and Markdown packages; see
[performance methodology](PERFORMANCE.md). This records the cost rather than
claiming the additional functionality is free.

See [limitations](LIMITATIONS.md) for unsupported surfaces, same-value
ownership handoffs, and the trusted-workspace boundary of atomic SARIF output.
