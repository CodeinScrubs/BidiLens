# Migration from naïve RTL handling

## 1. Preserve source and establish fixtures

Keep model/database text byte-for-byte unchanged. Add the flagship, English
mirror, representative code/URL/path cases, multiple paragraphs, and ordinary
native prose to the host's tests before changing rendering.

## 2. Remove global visual overrides

Remove string reversal, `unicode-bidi: bidi-override`, blanket `direction: rtl`,
and assumptions that a whole response has one direction. Retain language and
semantic markup. Use `text-align: start` rather than left/right.

## 3. Analyze each structural block

Choose direction independently for paragraphs, headings, list items,
blockquotes, table cells, captions, and chat messages. Keep code and technical
blocks LTR and isolated. Do not run one detector over an entire multi-paragraph
response.

## 4. Choose the narrowest adapter

- Plain text to safe semantic HTML: `@bidilens/html`.
- Existing rendered DOM: `@bidilens/dom` with `restoreBidi` for rollback.
- unified/remark/rehype or markdown-it: `@bidilens/markdown`.
- Component applications: the React, Vue, Svelte, or Web Component package.
- Non-markup diagnostics: the conservative terminal adapter.

## 5. Roll out safely

Run analysis in shadow mode first and compare expected direction without
changing user-visible markup. Then enable one surface, verify source/copy/search
invariants, measure stream and rendering latency, and keep a feature flag that
removes the adapter without data migration.

Adapters default to `intervention: 'auto'`. A completely LTR scope in an LTR
host is passed through without BidiLens attributes, wrappers, or styles. Pass
`inheritedDirection: 'rtl'` when rendering into an RTL context that the adapter
cannot inspect (especially SSR). Use `intervention: 'always'` only if existing
host CSS/tests intentionally depend on stable BidiLens markers for every block.

## 6. Add security deliberately

Start the CLI scanner in audit mode. Review ordinary RTL prose and repository
findings before selecting a CI failure threshold. Sanitization is an explicit
workflow, never the default rendering path.

## React example

```tsx
import { BidiMessage } from '@bidilens/react';

export function Message({ text }: { text: string }) {
  return <BidiMessage text={text} as="article" />;
}
```

## DOM rollback example

```ts
import { applyBidi, restoreBidi } from '@bidilens/dom';

applyBidi(messageRoot);
// Feature flag disabled:
restoreBidi(messageRoot);
```

See [adoption criteria](ADOPTION.md) and [limitations](LIMITATIONS.md).
