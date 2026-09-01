# Screenshot-derived mixed-direction cases

This document turns the user-supplied ChatGPT screenshots into repeatable,
non-clinical rendering evidence. The screenshots show Persian medical study
notes interleaved with English labels, abbreviations, arrows, emoji, Markdown
lists, block quotes, and tables. The wording is used only as text-shape and
boundary material; it is not medical guidance and BidiLens does not validate
the medical claims.

## What the renderer must preserve

The source is always kept in logical order. For example, the source sequence

```text
React یک کتابخانه جاوااسکریپت بسیار محبوب است.
```

has the word order `React=1`, `یک=2`, through `است=7`, then `.=8`. BidiLens
chooses the paragraph base from natural-language evidence, isolates the Latin
technical run, and lets the browser's Unicode Bidirectional Algorithm perform
visual reordering. It never reverses the string, inserts hidden controls into
the stored value, or changes the caller's alignment.

The fixture in
[`scripts/fixtures/chatgpt-mixed-direction.ts`](../scripts/fixtures/chatgpt-mixed-direction.ts)
covers the following boundaries from the screenshots:

- Persian-majority headings and paragraphs containing `CN IX`, `CN X`, `ICH`,
  `SAH`, `CT`, `CSF`, arrows, and emoji;
- the Persian combining-mark word `مثلاً` immediately beside the English phrase
  `right vagus lesion:`;
- English-majority lines such as `Uvula runs away from the lesion.` inside an
  otherwise RTL document;
- list items, block quotes, Markdown tables, inline code, and punctuation;
- a long Persian/English context sentence similar to an AI session summary.

## Acceptance invariants

Every adapter and host integration should preserve these invariants:

1. `textContent`, selection, clipboard, logs, prompts, and serialized source
   remain byte-for-byte/logically identical to the input.
2. A Persian combining mark stays attached to its word; `مثلاً` must not become
   `مثلا` plus a detached mark.
3. Compact technical labels are isolated as units (`CN X`, `CN IX`, `HR/BP`)
   without treating ordinary prose such as `I am a developer.` as a label.
4. Direction metadata is semantic and block-local. It must not emit
   `text-align`, overwrite authored `left`/`right` alignment, or mutate an
   ancestor's layout. An RTL paragraph may intentionally remain physically
   left-aligned.
5. A fully LTR scope with no RTL strong characters or bidi controls remains a
   no-op unless the caller explicitly requests stable annotation.
6. Code, URLs, paths, identifiers, and user-supplied raw HTML follow their
   documented safety policies rather than being guessed as natural language.

## Verification

The unit and Markdown adapter regression tests exercise the fixture directly:

```bash
pnpm exec vitest run packages/core/src/core.test.ts
pnpm exec vitest run packages/markdown/src/markdown.test.ts
```

The cross-version gate renders it through all supported Markdown-It host lines
(13.0.2, 14.3.1, and 15.0.1) and compares the resulting BidiLens reports:

```bash
pnpm run markdown-it:compat
```

The Playwright suite additionally checks DOM direction, isolation text, and
source text in Chromium, Firefox, and WebKit:

```bash
pnpm run test:visual
```

These checks prove the adapter contract, not every browser font, IME,
accessibility service, terminal emulator, or proprietary host renderer. A
downstream product should still run the same fixture on its target devices and
keep its own explicit alignment policy.
