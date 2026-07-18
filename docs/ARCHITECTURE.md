# Architecture

## Objective

BidiLens provides the application-level behavior that browsers, Markdown pipelines, and AI streaming clients usually leave to ad hoc CSS. The system is layered so applications can adopt only what they need.

## Layer 1: Core analysis

`@bidilens/core` operates on Unicode strings and has no DOM dependency.

- `analyzeText` counts strong RTL and LTR characters, records first-strong direction, and returns confidence.
- `detectDirection` supports `first-strong` and `majority` policies.
- `segmentDirectionalRuns` partitions mixed text into directional spans for plain-text exports or custom renderers.
- `isolateText` uses Unicode isolate controls when markup is unavailable.
- `findBidiControls` identifies embeddings, overrides, marks, and isolates with severity metadata.

The detector intentionally does not claim to implement UAX #9. It chooses a base direction; the platform text engine performs reordering.

## Layer 2: Streaming state

`BidiStream` solves direction flicker while model tokens arrive.

- `first-strong` locks after the first strong character.
- `majority` updates continuously and is useful for analytics or completed content.
- `sticky-majority` may change once from fallback/neutral and then remains stable.
- completed paragraphs are emitted independently, allowing per-paragraph direction in long answers.

## Layer 3: Markup adapters

`@bidilens/markdown` supplies both AST-time and rendered-tree integration.

- `remarkBidi` annotates block nodes before Markdown-to-HTML conversion.
- `rehypeBidi` inspects final element text and applies semantic `dir` attributes.
- code, preformatted content, keyboard input, samples, and machine-readable identifiers are forced LTR and isolated.

`@bidilens/dom` applies the same policy to arbitrary HTML and can observe streaming mutations.

## Layer 4: Framework primitives

`@bidilens/react` exposes low-level components rather than imposing a chat design system:

- `BidiMessage` for semantic message blocks;
- `BidiText` for polymorphic text containers;
- `BidiIsolate` for names, paths, versions, and inline entities;
- `useBidiDirection` and `useBidiStream` hooks.

## Direction policy

The default policy is first-strong with an LTR fallback. This aligns with common `dir=auto` behavior while remaining deterministic in environments that cannot inspect computed direction. Majority mode is available for completed paragraphs with leading neutral characters or quoted metadata.

## Copy and paste

Displayed HTML should use `dir`, `<bdi>`, and `unicode-bidi:isolate`. Unicode control insertion is reserved for plain-text channels because invisible controls can leak into clipboard content, logs, source code, search indexes, and model context.

## Extension points

All adapters accept selectors or node-type policies. Applications can override direction for domain-specific blocks, ignore hidden accessibility text, and attach analytics without forking the detector.
