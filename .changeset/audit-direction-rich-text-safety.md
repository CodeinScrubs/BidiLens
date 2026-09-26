---
"@bidilens/core": patch
"@bidilens/dom": patch
"@bidilens/html": patch
"@bidilens/markdown": patch
"@bidilens/playwright": patch
"@bidilens/terminal": patch
"@bidilens/web-component": patch
"@bidilens/cli": patch
---

Repair strict first-strong isolate handling, conservative command detection and
streaming parity; protect isolation boundaries with pinned Unicode 17 extended
grapheme rules. Keep technical recognition bounded on adversarial email/path
inputs and repeatedly trim unmatched mixed URL delimiters.

Isolate complete phrases across supported rich-formatting nodes while retaining
original formatting elements, caller alignment, selection, authored boundaries
and current host CSS direction. Unsupported partial cross-element boundaries
remain unchanged rather than cloning or expanding over unrelated text.
Keep identical Markdown block analyses independently mutable despite internal
caching, and respect case-insensitive authored attributes and CSS bidi boundaries
without treating `unicode-bidi: normal` as a special isolation boundary.

Preserve CR/CRLF HTML source, enforce required Playwright isolates, avoid
injecting controls into incomplete ANSI sequences, and harden SARIF output
paths, atomic writes, source positions and failure preservation.
