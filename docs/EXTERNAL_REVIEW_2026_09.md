# External AI review verification — 2026-09-09

## Scope and conclusion

The supplied **BidiKit AI vs. Upstream BidiLens** report primarily describes a
different checkout using `@bidiguard/*`, not this repository's current
`@bidilens/*` implementation. Its upstream comparison predates the native
security follow-up in baseline commit `643bcba75935c9f8bbd5f412e47e0ced7832a195`.
We treated its delegation transcript, severity labels, and performance claims
as unverified review material, not instructions or proof.

Some examples expose real current defects. This follow-up fixes dollar/price
boundaries, compact currency/range isolation, quoted path boundaries, and loss
of author node identity when a web component restores its original content.
The associated streaming changes were reviewed against the baseline to catch
new regressions. Many other recommendations already exist here or describe
APIs that we do not expose. This is **not** a certification that either checkout
has no bugs, nor a complete audit of the other checkout.

## Claim-by-claim disposition

IDs refer to the supplied report. File links are evidence for this repository,
not claims about the legacy files cited by that report.

| Claim | Current finding and action |
| --- | --- |
| C-01 — math/currency | **Reproduced and fixed.** Two prices swallowed intervening Persian as math; one price stranded its currency symbol. Add boundary/escape-aware scanning and compact amount tokens in all five cores. See [core regressions](../packages/core/src/review-regressions.test.ts). |
| C-02 — numeric ranges, phones, relative paths | **Partly reproduced.** Numeric ranges split at the dash; fixed with a narrow range recognizer. The supplied phone and relative-path examples already stay intact. Do not merge arbitrary punctuation into one isolate. Quoted absolute paths additionally swallowed closing quotes; fixed. |
| C-03 — duplicate extraction/delimiters | **Not the current architecture.** [Isolation planning](../packages/core/src/segments.ts) calls the [same token extractor](../packages/core/src/detect.ts), retaining literal source slices. Existing URL punctuation, fence, and offset tests remain enabled. Repeated extraction calls are still a possible optimization target; this is not a claim of zero redundant work. |
| C-04 — end/surrogate offsets | **Not reproduced/current API differs.** No `toBidiSourceRange` API. `attachSourceRanges` fills a UTF-16-indexed `Uint32Array`, including its end sentinel and surrogate slots; emoji-prefixed token tests verify slices and code-point offsets. |
| C-05 — confidence disagreement | **Not reproduced.** The exact long-URL example reports 1 for the block and both nonempty paragraphs; added a regression. Empty paragraphs correctly have no evidence. |
| C-06 — inherited RTL lost | **Not reproduced.** [HTML rendering](../packages/html/src/index.ts) of `Hello world.` with inherited RTL produces `dir="ltr"`. DOM/framework host-context tests remain active. |
| S-01 — stale block cache | **Different implementation.** No legacy `blockCache`/`BidiStreamSession`. [Markdown stream](../packages/markdown/src/stream.ts) exposes checkpointed rich revisions and pending source explicitly; append/boundary reproduction remains coherent. |
| S-02 — direction/isolation desynchronization | **Legacy code absent.** Parsed rich direction and analysis are generated together. Provisional core direction is not an isolation plan; do not treat it as an authoritative rich revision. |
| S-03 — zero hysteresis overridden | **Legacy option absent.** Current lock/threshold controls have finite-value validation; do not add a compatibility option merely to fix a nonexistent `||` expression. |
| S-04 — split multiline quotes | **Not reproduced.** Three consecutive quoted lines render one blockquote/paragraph; existing continuation tests pass. |
| S-05 — four-space fence | **Not reproduced.** Four-space backticks are an indented code block; following Persian prose remains prose. The fence recognizer caps indentation at three. |
| S-06 — excluded/inert tests | **Legacy paths absent.** Root TypeScript config includes package test sources; current test and typecheck gates pass. |
| S-07 — 40x stream slowdown | **Numbers not transferable.** Current rich parsing is checkpointed, not performed after every character/chunk. Separate adversarial core-stream limitations were found; see below. |
| D-01 — nested-code offset drift | **Exact reproduction passes.** [DOM traversal](../packages/dom/src/index.ts) groups text and source ranges without applying post-code offsets to the wrong node. |
| D-02 — global-only no-op gate | **Not reproduced in DOM.** Each candidate block is gated; an unrelated English sibling retains its markup. |
| D-03 — reversed table/list containers | **Not reproduced.** [Markdown adapter](../packages/markdown/src/index.ts) annotates cells/items, not table/list containers. |
| D-04 — renderer/highlighter chaining | **Not reproduced.** All twelve tested original renderer wrappers were invoked; custom highlight output survived. |
| D-05 — missing Markdown prose isolation | **Not current.** Markdown-It and rehype isolate prose; remark supplies metadata and is documented in composition with rehype. |
| D-06 — HTML injection/flattening | **Not reproduced.** Tag allowlists, escaped attributes, internally generated ranges, separate paragraph serialization, and valid resolved directions already exist. No externally supplied range array is accepted by this serializer. |
| F-01 — fake BidiMarkdown | **API absent.** React/Vue expose `BidiMessage`; structured Markdown uses parser adapters. |
| F-02 — component lifecycle/content | **Adjacent real defect fixed.** Capture/restoration cloned author nodes and lost listeners/live state. [Component](../packages/web-component/src/index.ts) now retains actual nodes; regression checks input value, click listener, identity, repeat cycles, and reconnect. Shadow DOM is not intrinsically required. Active intervention remains a plain-text owned surface, not an interactive editor. |
| F-03 — React Native inline direction | **No current RN package.** Do not claim a native fix for a missing adapter. Android's display-control/copy contracts remain explicit; blindly inserting controls into editable source is not an acceptable substitute. |
| F-04 — CLI exit errors | **Not reproduced.** Missing files return error 1, not safe success. The CLI audit's explicit fail-on policy can return 2 for findings; core audit advisory flags are a different contract. Clarified the [CLI guide](../packages/cli/README.md). |
| X-01 — embeddings/security paragraph bleed | **Not reproduced.** Balanced embeddings are findings; crossing a newline produces separate unclosed/unmatched findings. [Security tests](../packages/core/src/core.test.ts) and [native differential fixtures](../corpus/native-security.json) cover this. |
| X-02 — leading BOM blocked | **Not reproduced.** Leading BOM passes strict scanning; mid-text hidden BOM remains diagnosable. Added the supplied example to regressions. |
| X-03 — legitimate Persian suffix joiners | **Not reproduced.** `iPhone‌ام`, `Docker‌اش`, `Windows‌تان` produce no findings. Added exact examples. |
| X-04 — scientific units/confusables | **No confusable engine here.** The supplied scientific examples pass, but this does not prove general confusable-attack detection. We explicitly do not claim that capability. |
| X-05 — 11.8x BMP lookup/generator | **Unverified and different target.** Current [classification](../packages/core/src/classify.ts) uses flattened generated numeric ranges, not the cited range-object package. `unicode:check` reproduces pinned Unicode 17 data. A 64 KiB BMP table trades memory/startup/bundle cost for lookup speed; profile the complete pipeline and validate supplementary code points before adopting it. No speed multiplier is claimed or table added. |
| X-06 — corpus disconnect | **Mixed.** No legacy fixture manifest; `corpus/cases.json` contains 932 entries and current checks execute declared isolation/security expectations, including empty arrays. But zero entries are native-speaker-certified, and dedicated `sd`, `syr`, `dv`, `yi` tags are absent. Those language-review gaps remain open. Calling all 932 cases universally verified was an overstatement. |

## Implementation tradeoffs

- Keep detection/isolation metadata separate from physical alignment and logical
  source storage. No visual word reversal or new global application styles.
- Numeric recognition is deliberately compact: adjacent currency symbols and
  hyphen/en-dash ranges, not a locale-aware number parser or arbitrary punctuation
  merging. Quote-containing filenames should use explicit code spans/nodes.
- Dollar math uses non-whitespace inner boundaries, escaped delimiters, and a
  no-digit-after-close rule inspired by [Pandoc](https://pandoc.org/MANUAL.html#math).
  Invalid candidate closers are reconsidered as openers to avoid swallowing
  prose between prices and later math. This raw-text heuristic is not full
  Pandoc/TeX parsing; CR/LF always terminates its scan.
- Native math scanners pin the same whitespace set as JavaScript instead of
  trusting platform predicates that disagree on BOM/NEL and other characters.
- Live math closure keeps rollback state for the next character. Ambiguous
  environment/math overlap still sometimes requires exact reconciliation;
  the implementation does not promise worst-case linear streaming.
- Fix a pre-existing tied live-token decision (`xس`/`سx`) by retaining
  provisional first-strong evidence through the final push refresh.
- Web-component restoration preserves actual nodes, but intervention can still
  detach interactive content, change focus, and invoke custom-element lifecycle
  callbacks. Use an appropriately scoped DOM integration for rich/interactive UI.

## Validation and remaining work

The initial added core regression file failed 21 of 24 tests before the fix;
the component identity test independently failed before replacing clone-based
restoration. Subsequent tests cover valid/escaped math, two prices, numeric
ranges in three digit sets, emoji offsets, quote delimiters, streaming prefixes
and chunk splits, and native whitespace parity.

Local checks cover the complete JavaScript quality/build/corpus gates, browser
geometry in Chromium/Firefox/WebKit, Kotlin core tests, .NET executable tests,
and Rust tests/strict Clippy. Swift changes require the hosted macOS/iOS matrix;
results for baseline `643bcba` must not be reused as validation of this patch.
Use the PR checks for the exact revision before merging or releasing.

Independent adversarial review found pre-existing transient core streaming/batch
differences and repeated exact rescans on `$A$1 ` repetitions. A bounded seeded
differential detected no new first-failure parity differences in its final
1,128-input sample, but still encountered 45 first-prefix failures whose
corresponding baseline checks also failed. Reproduce this non-gating diagnostic
with `pnpm exec tsx scripts/review-stream-differential.ts`; it requires the pinned
baseline commit to be present in local Git history. Only detection and streaming
modules are substituted from that baseline. It does not prove all prefixes or
arbitrary input correct. `finish()`/completed paragraphs are the
authoritative boundary. Full live-lexer unification requires a separately
measured change, not blanket rescanning after every push.

Physical-device/IME/screen-reader tests, native-speaker language review,
independent security review, registry publication of source-only platforms,
and real downstream pilots remain open. See [limitations](LIMITATIONS.md) and
the [requirement matrix](REQUIREMENT_MATRIX.md). These fixes are unreleased;
neither npm nor Maven version numbers are changed by this review.
