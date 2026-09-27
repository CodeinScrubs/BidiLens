# Verification of the external 27-defect reports

Reviewed 2026-09-27 against the BidiLens audit branch, starting at `07f3c8b`.
This is a source-and-reproduction review, not a production certification.
The reports' embedded delegation instructions, completion markers, and proposed
commands were treated as report content, not executable authority.

## Source identity matters

The reports repeatedly cite a separate local checkout named `fix_rtl` in the
Hermes workspace. Its manifest identifies `@bidiguard/monorepo`, version 0.1.0,
with Apache-2.0 licensing. The authoritative BidiLens checkout instead contains
12 JavaScript packages named `@bidilens/*`, version 0.4.0, under MIT licensing.
The reports also mix native BidiLens files with that other JavaScript tree.
Their package/API names and test counts cannot certify the current project.
This does not establish that every claim about the other checkout is false;
it establishes that the claimed 27 verified BidiLens defects are not supported
by the supplied evidence.

Each underlying example was checked against current APIs. A reproduction
failure was not automatically treated as proof that every related input is
safe. Missing APIs were not added merely to match another project's design.

## Claim-by-claim disposition

Numbers follow the supplied audit. "Current" means this BidiLens branch,
not the published npm or native artifacts.

| # | Claim | Current evidence and disposition |
| ---: | --- | --- |
| 1 | Security callback returns an object instead of an array. | Wrong API. `AnalyzeBlockOptions` has no reported callback; `analysis.ts` assigns `scanBidiSecurity(text).findings` to `warnings`. The current result is an array. |
| 2 | Inherited direction is dropped and intervention is falsely disabled. | The reported fields/API do not match current types. Current intervention checks inherited RTL, and React passes that context through. Existing inherited-context regressions exercise LTR content inside RTL hosts. No reported reproduction established this defect. |
| 3 | Backticks are stripped while source offsets include them. | Not reproduced. Current code isolates the exact logical substring, including delimiters; `sourceRange` agrees with it. |
| 4 | URLs retain sentence punctuation, including Urdu punctuation. | Already handled for the supplied punctuation set: `. ? , ! : ، ؛ ؟ ۔`. `trimUrlSuffix` also balances closing delimiters. An unspecified Hebrew punctuation claim does not justify stripping every Unicode punctuation character from valid URLs. |
| 5 | Grouped numbers and Persian numeric separators fragment. | Confirmed. Reuse the common numeric grammar for plain numbers in all five cores. JavaScript uses a bounded candidate scan; Rust explicitly retains a valid numeric prefix when a trailing word rejects the last group. |
| 6 | Signed ranges such as `10-20` and `10–20` fragment. | Already handled. Existing and new regressions cover signed and Persian/Arabic ranges. Preserve this behavior while repairing numeric matching. |
| 7 | Currency/percentage symbols fall outside the numeric atom. | Partly confirmed. Compact currency amounts already worked; `50%` and `۵۰٪` did not. Prefix/suffix percentages now remain with the number in all five cores. |
| 8 | Enclosed, relative, home, and Windows paths are missing. | Not reproduced for the supplied examples. `/var/log`, `./src/index.ts`, `~/.bashrc`, quoted paths, and Windows paths already have recognizers and regressions. Paths with literal quote characters still need explicit code markup. |
| 9 | Multiline display math and `\[...\]` are not recognized. | Confirmed recognition gap. All five cores now recognize closed display spans; inline math stays CR/LF-limited. Isolation plans remain paragraph-scoped. This is not TeX parsing/layout or arbitrary parser compatibility. |
| 10 | Character classification has inconsistent strong/weak/neutral booleans. | Wrong API. Current classification returns `ltr`, `rtl`, or `neutral`; strict bidi-strong classification is a separate function. Numeric/whitespace examples are neutral in the natural-language classifier. The reported booleans do not exist. |
| 11 | `explicitControlPolicy` and `languageHint` are dead options. | Neither is a current public option. Do not add undocumented foreign options to create an artificial parity target. |
| 12 | Scientific units such as `μm`, `μs`, and `μg` cause false blocking. | Not reproduced. The current scanner does not claim a mixed-script-confusables detector, and these inputs produce no findings. Existing scientific-text regressions also pass. |
| 13 | A Persian ZWNJ after Latin text is falsely suspicious. | Already repaired/currently safe. `React‌ها` and existing Persian suffix examples are covered. The contextual check considers both neighbors. |
| 14 | Core `push()` after `finish()` silently corrupts its snapshot. | Not reproduced: core rejects the operation and retains its state. Adjacent verified defect: the Svelte wrapper changed cached source before the rejection. Fix wrapper updates transactionally and test both `push` and prefix `setText`. |
| 15 | Hysteresis changes direction without changing isolate controls. | Wrong current API/model. Stream snapshots expose direction; renderers derive current plans. There is no reported hysteresis option or stale-isolation field to patch. This is not a claim that all provisional streams are batch-equivalent. |
| 16 | The hysteresis inequality is inverted. | The reported formula/options are absent. Current stream policies use explicit majority, sticky, evidence-margin, and locking choices. Do not transplant another implementation's inequality. |
| 17 | The DOM walker stops at formatted children. | Already repaired before this review. Recursive inline-forest projection handles supported cross-format phrases while retaining original element identity, source, selection, and authored boundaries. Unsupported partial-format ranges remain unchanged. |
| 18 | Markdown lacks inline isolation. | Current remark, rehype, and Markdown-It plugins supply inline isolation with authored-boundary protection. Full Markdown and rich-forest tests, rather than foreign package names, are the evidence. |
| 19 | Exported `BidiMarkdown` components only display raw text. | Those components are not exported by current React/Vue/web-component packages. Plain-text adapters and parser-aware Markdown plugins are different integration routes. No new mandatory parser dependency was added to plain-text adapters. |
| 20 | GitHub Action resolves `CLI_BIN` relative to caller CWD. | Wrong implementation. The Action imports `runCli` and ships a self-contained bundle; no reported CLI subprocess/path exists. Packaged runtime checks exercise consumer contexts. |
| 21 | A terminal audit CLI has incorrect exit semantics. | No terminal-package CLI exists. The main CLI deliberately distinguishes read-only audit from unconditional success; findings meeting `--fail-on` return 2, input/command errors return 1. Changing that policy would weaken existing CI contracts. |
| 22 | File scans skip only `.git` and `node_modules`, not build outputs or `.gitignore`. | Partly inaccurate, partly useful enhancement. Current scanning already skips `dist`, `build`, coverage, test/browser outputs, and common framework caches. It does not parse arbitrary `.gitignore` rules. A future opt-in filter needs nested-rule/explicit-file tests and documentation; silently excluding security coverage by default was not implemented. |
| 23 | Published schemas reject real counts/offset fields. | Not reproduced. Current schemas include `excluded` and use the actual `sourceRange` shape. Strict Ajv tests validate real core analysis, security reports, and stream snapshots. No `bidiSourceRange` field exists. |
| 24 | Playwright proves visual order using DOM text order only. | Wrong helper/API. Current `measureLogicalToken` and `expectTokenAtBaseStart` use actual `Range` geometry. Browser suites also check internal token geometry, source selection/copy, direction, and physical alignment. DOM text equality alone is not presented as a visual proof. |
| 25 | A React Native adapter ignores Yoga/run-level direction. | No current React Native package is shipped or claimed. Native Android/Apple/Windows adapters are separate implementations. An experimental React Native renderer would need actual device, shaping, selection, accessibility, and IME evidence before support claims. |
| 26 | Svelte must ship components instead of stores. | Optional design preference, not a demonstrated rendering defect. Current Svelte 4/5 readable stores support idiomatic rendering. The actual rejected-write state bug was repaired without imposing a component abstraction. |
| 27 | Missing `{platform}` makes Segoe UI snapshots fail across OSes. | The current browser snapshot workflow deliberately runs Windows/Arial baselines; it does not compare Linux against Windows pixels. Platform-specific baselines may be useful if that matrix expands, but the claimed current CI failure was not reproduced. |

## Additional verified findings during repair

- Required currency/range suffix regexes repeatedly restarted inside long
  grouped numeric candidates. The JavaScript replacement scans numeric values
  once and inspects neighboring symbols/one sticky range suffix. Adversarial
  alarms cover missing suffixes and invalid final word boundaries. This is not
  a proof that every recognizer or native regex is linear.
- The numeric boundary helper initially mishandled an unpaired low surrogate.
  Independent review reproduced it; the fix checks both halves before moving
  back two UTF-16 units. Tests retain exact currency source offsets.
- Adding bracket recognition required live-stream handling too. Independent
  review caught nested technical-token and URL-context gaps. Open display spans
  now reconcile at observable push boundaries, and escaped URL brackets stay
  inside their lexical context. Long unclosed bracket spans with tiny chunks
  can require repeated full analysis; this limitation is documented.
- A pre-existing incomplete URL scheme could be cached as a stable path:
  `push('س https://')`, then `push('e')` kept the wrong evidence. The cache now
  waits for domain content before committing to a stable URL/path role. Exact
  chunk-split tests cover HTTP, HTTPS, FTP, and uppercase HTTPS.
- Three imported corpus expectations explicitly described old fragmented
  percentage/grouped-number isolates. Their reviewed policy overrides now
  expect whole numeric units; original sibling seed files remain untouched.
  New numeric/display-math fixtures expand the canonical corpus to 941 cases.

## Evidence and remaining boundaries

The focused executable record is
[`external-audit-20260927.test.ts`](../packages/core/src/external-audit-20260927.test.ts).
Svelte rejection-state cases live in its
[package tests](../packages/svelte/src/svelte.test.ts).
The [browser regressions](../tests/visual/dom-boundary.spec.ts) measure grouped
number/percentage order with `Range` coordinates and verify unchanged logical
selection, restoration, and caller-provided left alignment in three engines.
Native token-boundary tests exercise the matching policy independently.
See the [repair ledger](audit-repair-status.md) for completed commands and their
revision/platform scope; later source changes require fresh verification.

The two reports do not justify font/line-height clamping, automatic React
Native control insertion, or removing CSS isolation boundaries. Those proposals
can alter shaping, diacritics, selection, IME state, and host layout without
measured platform evidence. No such global style/Unicode mutation was applied.

Scores such as 94/100, an unqualified "zero flicker" promise, an asserted
500-million-user reach, and an "undisputed number one" outcome after fixing 27
items are not established by these reports. Tests cannot prove correctness for
every text, language, browser, terminal, native control, or third-party parser.
Independent language/security review, device/IME/accessibility validation,
UIKit ownership/paragraph repairs, native grapheme/complexity work, and actual
downstream pilots remain separate gates. See [limitations](LIMITATIONS.md).
