# ADR-003: Content-majority block direction

## Status

Accepted

## Context

`dir="auto"` and first-strong detection classify a paragraph beginning with a
Latin technical token as LTR. That fails for Persian-majority AI output such
as `React یک کتابخانه جاوااسکریپت بسیار محبوب است.`. The stored sentence is
already in the correct logical order; the defect is the block base direction.

## Decision

The default detector is `content-majority`:

1. Identify technical ranges such as inline code, URLs, paths, versions,
   identifiers, and hashes.
2. Exclude those ranges from natural-language direction evidence.
3. Count Unicode strong LTR (`L`) and RTL (`R`/`AL`) characters.
4. Select the dominant direction. On ties or no evidence, use first-strong
   after technical-token exclusion and then the configured fallback.
5. Preserve the source string and expose inline isolation ranges for adapters.

`first-strong`, `strict-uax9`, and explicit direction overrides remain
available for compatibility. This project chooses the base direction only; it
does not reimplement the Unicode Bidirectional Algorithm's visual reordering.

## Consequences

- The flagship Persian-majority sentence is RTL even though its first word is
  `React`.
- English-majority paragraphs remain LTR when they contain Persian words.
- Technical-only blocks need an explicit or inherited fallback because they do
  not contain natural-language evidence.
- The heuristic requires a maintained technical-token recognizer and corpus;
  it must not be described as a language detector.
