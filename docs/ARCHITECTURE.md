# Architecture

## Boundary

BidiLens chooses semantic base direction and isolation structure. It does not
perform glyph reordering, shaping, line breaking, cursor movement, or bracket
mirroring; the host's Unicode Bidirectional Algorithm implementation remains
responsible for those operations.

```text
source string
  -> technical-token ranges
  -> Unicode bidi evidence
  -> per-block direction + confidence
  -> inline isolation + security plans
  -> adapter-specific semantic output
  -> browser / OS text engine
```

The source string is immutable throughout this flow.

## Non-interference boundary

`needsBidiIntervention` is the shared adapter gate. The default `auto` mode
returns false when a scope has no RTL strong character or bidi formatting
control and its inherited direction is LTR. Adapters then preserve the host
tree/attributes/styles and omit inline isolation plans. This is tested as
structural equality for DOM and Markdown and as marker/style absence for HTML,
React, Vue, and the Web Component.

An LTR string under an RTL parent is not safe to pass through because neutral
punctuation can inherit the wrong paragraph context. Callers can provide
`inheritedDirection: 'rtl'`; the DOM adapter also recognizes an RTL ancestor.
`intervention: 'always'` is the explicit compatibility mode for applications
that use stable `dir` or `data-bidilens-*` attributes as selectors. Hidden bidi
formatting controls disable the fast path so visually English text cannot use
the optimization to evade bidi-aware handling or auditing.

`@bidilens/spec` defines the language-neutral boundary for this flow. Its
versioned JSON Schemas describe block analysis, security reports, and stream
snapshots using stable URN identifiers. Both evidence and isolation ranges
carry half-open UTF-16 and Unicode code-point offsets; the legacy top-level
`start`/`end` isolation offsets remain equivalent to the UTF-16 pair for
JavaScript ergonomics. The schema tests validate real core output so the
cross-language contract cannot silently drift from the implementation.

## Core analysis

`@bidilens/core` has no DOM dependency and exposes four related levels:

- `detectDirection` returns the block base direction;
- `analyzeText` returns counts, confidence, paragraphs, and isolation ranges;
- `collectDirectionEvidence` records UTF-16 and code-point evidence ranges;
- `analyzeBlock` combines evidence, isolation, and security findings.

Unicode strong classes and natural-letter membership come from generated
binary-search range tables pinned to `DerivedBidiClass.txt` and
`DerivedGeneralCategory.txt` 17.0.0. Both source files, SHA-256 values, the
generator, and generated output are committed so normal builds remain offline
and do not inherit the host JavaScript runtime's Unicode version.

## Direction policy

The default `content-majority` policy:

1. identifies technical ranges;
2. removes those ranges from natural-language evidence;
3. counts Unicode `L` versus `R`/`AL` strong code points;
4. chooses the dominant side when thresholds are met;
5. resolves ambiguity with first-strong after exclusions and then fallback.

This deliberately differs from `dir="auto"` for a Persian-majority paragraph
beginning with `React`. Available alternatives include `first-strong`,
`strict-uax9`, explicit `ltr`/`rtl`, and `inherit`. The name `strict-uax9`
means strict first-strong base-direction selection; it does not claim a second
implementation of the complete UAX #9 reordering algorithm.

Technical recognition is deterministic and deliberately conservative. It
includes code spans, URLs, email, paths, packages, identifiers, model/product
tokens, versions, commands, environment variables, hashes, IP addresses,
phones, dates, times, and numeric expressions. Domain-specific false positives
can be controlled through options.

## Streaming

The core streaming state machine stores completed paragraphs separately from
the current open paragraph. Completed snapshots are copied and never mutated.
The default open paragraph can revise its provisional direction at bounded
evidence checkpoints as more text arrives. Irreversible live locking is limited
to the explicit `first-strong` and `sticky-majority` strategies; `finish()`
always reconciles the open paragraph with batch analysis.

Batch reconciliation occurs at `finish()`. Exponential evidence checkpoints
avoid rescanning a long neutral or incomplete technical token after every
single-character push, while deterministically seeded property tests cover
random boundaries, CRLF splits, surrogate pairs, Markdown fences, and URLs. A trailing UTF-16 high
surrogate remains visible in the logical snapshot but is not classified until
its low half, a non-low successor, paragraph completion, or `finish()` arrives;
this keeps live decisions invariant even when callers split a supplementary
Unicode character between code units.

The optimized default separator completes paragraphs incrementally for the
complete Unicode 17 `Bidi_Class=Paragraph_Separator` set: CR, LF, CRLF, NEL,
U+001C–U+001E, and U+2029. U+2028 is a line separator (`WS`) and therefore stays
inside the current bidi paragraph. Custom JavaScript regular expressions are
evaluated once at `finish()` because an arbitrary match may depend on future
input through lookarounds, anchors, or an extendable match. Before finalization,
the unresolved custom-separated source remains one open paragraph. This
explicit tradeoff preserves arbitrary chunk-boundary invariance and linear
append behavior.

Framework streaming APIs are adapters over the same state machine:

- React `useBidiStream`;
- Vue `useBidiStream`;
- Svelte `createStreamingBidiMessage`.

Each adapter's reset operation replaces the current source atomically through
`reset(initialText)`. It does not emit a transient empty snapshot before the
replacement text, which matters when an AI response is regenerated or a view
is reused for a different conversation.

The rich `@bidilens/markdown` session layers a caller-owned Markdown-It parser
over that fast direction stream. It does not invoke a batch parser after every
token. Instead, AST/HTML/security revisions occur at geometrically spaced
source checkpoints and structural Markdown boundaries, and expose both
replacement (`dirtyRegions`) and unparsed
suffix (`pendingSourceRange`) ranges. The complete source is parsed exactly
once at `finish()`, using the same function exported as `analyzeBidiMarkdown`,
which makes final batch/stream equality directly testable.

Only self-contained plain-paragraph prefixes that already carry stable
intervention metadata advance `stableThrough`. Future-sensitive constructs,
including reference links, lists, tables, fences, and HTML, remain provisional.
A later link definition can therefore correctly dirty an earlier reference;
the API never labels that earlier AST as immutable.

## Markup adapters

- `@bidilens/html` escapes untrusted text and serializes `<p dir>` plus `<bdi>`
  isolation without `innerHTML` input paths; LTR-only input remains unannotated.
- `@bidilens/dom` annotates semantic blocks, replaces eligible text ranges
  with DOM-created `<bdi>` nodes, supports idempotence/restoration, and can
  observe mutations.
- `@bidilens/markdown` supports both unified (`remarkBidi`, `rehypeBidi`) and
  markdown-it. Raw HTML is not trusted or interpreted by the plugin.
- React, Vue, Svelte, and the Web Component consume core analysis directly.
  The Web Component builds nodes rather than interpolating HTML.

The Web Component has two deliberate distribution modes. Its normal entry
leaves `@bidilens/core` external so application bundlers can deduplicate it.
Its `standalone`/CDN entry bundles core into one browser-loadable module for
no-build pages and is minified with a source map. The duplication in the
standalone artifact is an intentional installation tradeoff, not a second
implementation of direction policy.

Code-like elements stay LTR and isolated. Block direction is computed for
paragraphs, headings, list items, blockquotes, and table cells rather than once
for an entire response.

## Native Android

The native implementation mirrors the same boundary in Kotlin:

```text
String
  -> :core immutable BidiAnalysis
  -> :views metadata or :compose TextStyle/VisualTransformation
  -> Android Minikin/ICU text layout
```

`:core` is independent of Compose and Android widgets. Its Unicode 17 range
tables and 932-case fixtures are generated from the same canonical inputs as
the TypeScript core. Kotlin APIs report both UTF-16 and code-point offsets so
editable/selection integrations do not reinterpret Java string indices.

`:views` modifies only `textDirection`, `textAlignment`, and horizontal
gravity when intervention is required. It saves the original widget state,
restores it when text becomes ordinary LTR or a controller detaches, and never
replaces an `Editable`. The host must declare `android:supportsRtl="true"`;
the library deliberately does not merge this application-wide flag because
that could change unrelated layouts.

`:compose` applies an explicit paragraph `TextDirection` and content-relative
alignment. Display-only isolation uses a transient visual string while
accessibility semantics retain the original source. Editable isolation uses a
`VisualTransformation` with monotonic original/transformed offset maps; the
state value, IME callbacks, copy source, validation, and storage remain free of
controls. The pure-LTR fast path returns the caller's original `TextStyle`
instance and adds no BidiLens semantics.

## Native Apple

The Swift Package uses generated copies of the canonical Unicode 17 ranges:

```text
String
  -> immutable BidiAnalysis / BidiPresentation
  -> SwiftUI BidiText -> private UIKit label
  -> UIKit base-writing-direction + independent NSTextAlignment
  -> TextKit/Core Text rendering
```

The core has no UIKit dependency. UIKit adapters preserve logical strings and
editable selection. `UITextView` and `UITextField` use the native
`UITextInput.setBaseWritingDirection` API; `UILabel` uses a copied paragraph
style whose base direction and alignment are separate fields. The adapter does
not force the layout direction of a screen or mirror sibling controls.
`BidiText` is a read-only `UIViewRepresentable` that owns its label, restores
prior BidiLens state before each SwiftUI update, reapplies caller styling, and
then assigns and analyzes the immutable source. Editable SwiftUI bridging is
deferred until native marked-text and IME behavior have dedicated evidence.

## Native Windows

The `net8.0` core is independent of WPF and uses generated copies of the same
Unicode tables:

```text
String
  -> immutable BidiAnalysis / BidiPresentation
  -> WPF FlowDirection + independent TextAlignment
  -> Windows text rendering
```

The WPF layer supports `TextBlock` and `TextBox`, saves original state in a
weak table, preserves source and selection, and restores authored properties
when content returns to the pure-LTR no-op path. Physical-left and
content-relative-start alignment are explicit policies rather than consequences
of direction detection.

## Native Rust

The `bidilens-core` crate is an independent native implementation with no
JavaScript runtime or UI-framework dependency:

```text
&str
  -> immutable Analysis + SecurityReport
  -> host-owned direction/alignment metadata or transient isolate controls
  -> editor, terminal, GUI, or browser engine text layout
```

Generated copies of the canonical Unicode 17 tables drive binary-search
classification. Public ranges report Rust byte offsets, UTF-16 code units, and
Unicode scalar-value offsets so hosts can map results without guessing index
semantics. The crate validates the same 932 direction fixtures and all declared
isolation/security fixtures as the other native cores.

Direction and alignment remain separate. The Rust core returns semantic text
direction only; a GUI host may deliberately place an RTL paragraph at physical
left without changing that result. Ordinary LTR text in an LTR context returns
no isolation plan and its display helper returns the exact original value.
The crate does not include a Zed/editor adapter and does not claim that a host
has adopted it.

## Plain text and terminals

Markup is preferred whenever it exists. `@bidilens/terminal` preserves plain
text by default and can emit an annotated diagnostic view. Unicode isolate
insertion is opt-in because invisible controls can leak into logs, clipboard
content, prompts, and source files, and because terminal emulator support is
not uniform.

## Security

The scanner has `off`, `audit`, `warn`, and `strict` modes. Findings include
dual offsets, code, severity, message, and remediation. It recognizes
directional marks, embeddings/overrides, isolates/pops, deprecated formatting
controls, unbalanced stacks, cross-isolate formatting, and hidden U+200B.
Ordinary Persian ZWNJ and Arabic/Hebrew combining marks are explicitly tested
as non-findings.

## Complexity

Core classification and directional-run planning are linear in code points
plus recognized technical ranges. Inline-isolation planning uses a monotonic
range cursor. Streaming re-analysis uses evidence checkpoints instead of
full-document analysis per token. Performance budgets are regression guards,
not universal latency promises; see `docs/PERFORMANCE.md`.
