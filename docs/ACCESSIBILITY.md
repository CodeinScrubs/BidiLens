# Accessibility

Direction markup must improve visual order without damaging logical reading
order. BidiLens therefore preserves source text, uses semantic `dir` and
`<bdi>` markup, leaves native selection/cursor behavior to the platform, and
uses logical CSS alignment.

## Automated evidence in this checkout

- Chromium, Firefox, and WebKit verify that rendered `textContent` and selected
  text equal the original flagship source exactly.
- Chromium additionally verifies the actual clipboard result after selecting
  the rendered block and invoking copy.
- Visual tests cover the flagship, its English mirror, independent paragraphs,
  streaming settlement, structured Markdown, dark mode, and 150% zoom.
- Adapter tests preserve heading/list/table/blockquote semantics and avoid
  inserting focusable wrappers.

These checks are valuable but are not a screen-reader certification.

## Manual release checklist

The following must be executed and recorded for any broad production claim:

- NVDA with current Firefox and Chrome on Windows;
- JAWS with a supported Windows browser, if the target organization requires it;
- VoiceOver with Safari on macOS and iOS;
- TalkBack with Chrome on Android for any mobile web deployment;
- keyboard navigation through links, controls, tables, and code without a
  direction-induced focus change;
- character, word, line, and select-all reading order for the flagship and
  mirror fixtures;
- native copy/paste into a plain-text editor on every supported browser/OS;
- 200% and 400% zoom, reflow, high-contrast/forced-colors, and reduced-motion;
- Persian/Arabic/Hebrew font fallback and combining-mark inspection.

No item in that laboratory matrix is claimed complete in this repository.

## Host responsibilities

The host must retain semantic headings/lists/tables, expose meaningful labels,
keep raw model output out of unsafe HTML paths, and avoid CSS that overrides
the adapter's `direction`, `unicode-bidi`, or logical alignment. Direction does
not replace language metadata: use `lang` when the language is known.

See [limitations](LIMITATIONS.md) and [migration guidance](MIGRATION.md).
