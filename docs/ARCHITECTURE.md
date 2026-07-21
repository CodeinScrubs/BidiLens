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
The open paragraph can move once from provisional fallback to a locked
direction after configurable evidence and margin thresholds.

Batch reconciliation occurs at `finish()`. Exponential evidence checkpoints
avoid rescanning a long neutral or incomplete technical token after every
single-character push, while deterministically seeded property tests cover
random boundaries, CRLF splits, surrogate pairs, Markdown fences, and URLs. A trailing UTF-16 high
surrogate remains visible in the logical snapshot but is not classified until
its low half, a non-low successor, paragraph completion, or `finish()` arrives;
this keeps live decisions invariant even when callers split a supplementary
Unicode character between code units.

The optimized default newline separator completes paragraphs incrementally.
Custom JavaScript regular expressions are evaluated once at `finish()` because
an arbitrary match may depend on future input through lookarounds, anchors, or
an extendable match. Before finalization, the unresolved custom-separated
source remains one open paragraph. This explicit tradeoff preserves arbitrary
chunk-boundary invariance and linear append behavior.

Framework streaming APIs are adapters over the same state machine:

- React `useBidiStream`;
- Vue `useBidiStream`;
- Svelte `createStreamingBidiMessage`.

Each adapter's reset operation replaces the current source atomically through
`reset(initialText)`. It does not emit a transient empty snapshot before the
replacement text, which matters when an AI response is regenerated or a view
is reused for a different conversation.

## Markup adapters

- `@bidilens/html` escapes untrusted text and serializes `<p dir>` plus `<bdi>`
  isolation without `innerHTML` input paths.
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
