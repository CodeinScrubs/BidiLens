# Native HTML or BidiLens?

Use the smallest solution that fits your content. BidiLens complements UI
components and the browser's Unicode rendering engine; it does not replace them.

| Your situation | Start with |
|---|---|
| A known Persian label or paragraph | Explicit `dir="rtl"` and `lang="fa"` on that text boundary |
| A known English token inside Persian prose | Native `<bdi dir="ltr">` around that token |
| Unknown text where first-strong direction matches your product policy | Native `dir="auto"` |
| User/AI prose whose first word may be an English identifier but whose paragraph is Persian | Evaluate BidiLens's content-majority policy, with an explicit caller override |
| Mixed Markdown, several paragraphs, or streamed messages | A scoped BidiLens adapter plus regression tests in your actual renderer |
| An LTR-only app that never renders RTL text | You may not need BidiLens at all |

## A native baseline, with no dependency

```html
<p lang="fa" dir="rtl" style="text-align: left">
  <bdi dir="ltr">React</bdi> یک کتابخانه جاوااسکریپت بسیار محبوب است.
</p>
```

Here the author already knows the paragraph and token directions. Reading
direction is RTL; physical alignment is left. The DOM text remains in logical
order. Do not reverse text or persist invisible bidi controls to imitate this.

Native `dir="auto"` uses the first strong directional character, excluding
isolated descendants such as `<bdi>`; it is not majority-language detection.
An **unisolated** leading `React` in a plain-text paragraph can therefore
choose LTR for otherwise Persian prose. The explicit example above avoids
that ambiguity without a library.

## Where BidiLens helps

Applications cannot always author every paragraph and inline fragment by hand.
BidiLens provides reusable direction policies, technical-token isolation,
streaming state, Markdown adapters, and bidi-control auditing. Its default
policy is a deterministic heuristic, not a semantic oracle: short, balanced,
or ambiguous text still needs a caller choice or product-specific policy.

Start with the [one-message integration guide](GETTING_STARTED.md). Keep
direction overrides, preserve logical source, and test both LTR and RTL hosts.
For an LTR host with no RTL strong characters or bidi formatting controls, the
default intervention policy emits no direction/isolation markup. This does
not mean zero execution cost or a universal no-regression guarantee.

## Keep your existing component library

A library such as [PersianLabs UI](https://github.com/persianlabs/ui) supplies
controls, layout, themes, and Persian-specific UI. BidiLens handles a different
layer: direction policy and isolation for the text inside those controls.
Neither replaces the other, and known content may only need native markup.

Keep the avatar, bubble placement, page layout, and design tokens under your
component library's control. Put a rendering adapter inside the message-content
boundary, not around the entire application. Text alignment is an independent
product choice. For block-level adapters, use a container that permits block
children; do not nest a rendered paragraph inside another `<p>`.

## Before shipping

- Check Persian beginning with Latin text, English containing Persian, pure
  English, URLs/code, punctuation, and narrow-line wrapping.
- Check explicit directions and physical left alignment in both host directions.
- Compare copied text with the original input, including after streamed updates.
- Test screen readers, selection, and editing/IME in your actual platform.
- Read [limitations](LIMITATIONS.md), [accessibility guidance](ACCESSIBILITY.md),
  and [integration/rollback checks](GETTING_STARTED.md).

Terminal glyph shaping and arbitrary editor integration are not automatically
solved by a web adapter. See the platform-specific guide before selecting one.
