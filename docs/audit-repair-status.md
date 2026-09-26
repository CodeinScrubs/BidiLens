# Audit repair status

Updated 2026-09-27. This is a repair ledger, not a production certification.
Tests, native builds, browser rendering, and hosted platform validation are
separate evidence gates. The working branch is
`fix/audit-regressions-20260926`; these source changes are not a published release.

## Implemented repairs

| Area | Repair and scope |
| --- | --- |
| JavaScript core | Pinned Unicode 17 extended-grapheme boundaries; strict UAX #9 first-strong handling of existing isolates; conservative first-argument command recognition; bounded email/path scanning; balanced mixed URL delimiters; streaming option/case parity and late syntax inside quoted command arguments. |
| DOM and Markdown | Isolate complete eligible phrases across formatting nodes without cloning original elements; retain logical text, selection, formatting identity, authored boundaries, and caller alignment. Refresh host CSS direction rather than retaining stale computed values. Unsupported partial cross-format ranges remain unwrapped. Keep cached identical-block analyses independently mutable; respect authored Markdown-It CSS bidi boundaries. |
| Android Compose | Resolve paragraph bases independently, even when run isolation is disabled; preserve logical editable values and non-paragraph annotation payloads; retain authored paragraph alignment while supplying direction. New layout instrumentation cases are compiled but not yet executed. |
| Windows WPF | Add paragraph-aware `Paragraph` and `RichTextBox` application/restoration, including nested lists, sections, and tables. Preserve source, selection, bindings, physical alignment, and current inherited styles. Tolerate malformed UTF-16 during analysis. |
| Native core policies | Generate the curated command vocabulary from one source for Kotlin, Swift, C#, and Rust; implement conservative command boundaries, strict isolate-aware first-strong logic, strategy-sensitive technical exclusion, and balanced URL delimiters. Platform-specific verification is listed below. |
| HTML, terminal, assertions | Preserve CR/CRLF through HTML parsing; enforce required Playwright isolate counts; distinguish NEL from ANSI and avoid injecting isolate bytes into incomplete terminal control sequences. |
| CLI and GitHub Action | Discover the packaged corpus; shield runner logs from untrusted workflow commands; validate SARIF output targets, use exclusive temporary files and atomic replacement, preserve prior reports on failure, index source positions once, and encode artifact URI segments. |
| Demo | Use the selected direction policy and inherited UI context throughout preview, inspector, exports, and streaming. Reconcile completed streams. Wrap narrow panel toolbars so controls are not silently clipped. |

The native command policy is a curated recognition heuristic, not a shell
parser. Native option/API compatibility boundaries are documented in the
respective platform guides. Android Views and WPF `TextBlock`/`TextBox` retain
whole-control bases; per-paragraph policies use Compose or WPF document APIs.

## Verification of this audit branch

Local Windows checks completed against the repaired source:

| Gate | Evidence |
| --- | --- |
| `pnpm check` | TypeScript, ESLint, generated data and package-depth checks; 24 unit suites, 681 passed and 2 platform-specific skips; 932 canonical direction/isolation fixtures and 94 security fixtures; documentation links; workspace builds; bundled Action runtime probes. |
| `pnpm test:visual` | 66 tests passed across Chromium, Firefox, and WebKit, including source/copy/selection, authored boundaries, left alignment, rendering policies, completed streams, and toolbar containment at 320/390/768/1024/1280/1440 px in English and Persian. |
| Latest Markdown regressions | Eight failing cases reproduced analysis aliasing, authored CSS-boundary crossings, case-insensitive attributes, and a whitespace-related normal-style false positive. Twelve new checks now pass; the complete Markdown and inline-forest suites passed 155 tests. |
| `pnpm packages:types` | Packed declarations and supported ESM/bundler resolution passed for all 12 JavaScript packages. CommonJS remains dynamic-import-only. |
| `pnpm markdown-it:compat` | Packed strict TypeScript consumers, 932 canonical cases, and 9 host-structure cases passed on Markdown-It 13.0.2, 14.3.1, and 15.0.1 after the final Markdown repairs. |
| `pnpm deps:audit` | No known locked npm dependency vulnerabilities reported. This is not an independent security audit. |
| `pnpm sbom` / `pnpm sbom:check` | CycloneDX 1.7 validated: 531 components, 545 dependency relationships. |
| `pnpm release:check --allow-dirty` | All 12 tarballs inspected; clean strict TypeScript/runtime/CLI consumer passed; four integration guides compiled and exercised; all 12 packed examples executed; raw and gzip size budgets passed. Development-only validation, not a publish decision. |
| Windows native verification | 5,728 assertions and 932 canonical cases passed using local .NET 10 with runtime roll-forward; pinned .NET 8.0.423 verification is still required. |
| Android | 38 core, 13 Compose, and 13 Views JVM tests passed; new Compose instrumentation tests compiled. No device was connected for execution of these new layout tests. |
| Rust | Minimum Rust 1.85: formatting, all-target check, Clippy with denied warnings, and all-target tests passed (32 tests, including canonical corpus checks). Other OS compiler runs remain hosted gates. |

Local JavaScript toolchain: Node 25.2.1 / pnpm 10.27.0. Declared Node 22.12
support still needs the hosted minimum-version gate for this branch. Prior
platform evidence does not validate changes introduced by this audit.

Release-artifact checks executed the clean packed consumer, CLI, guides, and
examples. `--allow-dirty` is a development-only probe; it
does not authorize publishing or satisfy the clean-tree release requirement.

## Remaining repairs and release gates

- UIKit independent paragraph bases, ownership-aware restoration, and
  marked-text composition still need repair and simulator/device validation.
  Swift core edits in this branch have not been compiled locally; require
  macOS Swift, iOS adapter, and Swift CodeQL checks before merge.
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
- Run new Android layout tests on API 35/36 and physical devices; validate
  WPF against the pinned .NET 8 SDK; run hosted Node minimum-version,
  cross-platform quality, native, and CodeQL gates.
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
