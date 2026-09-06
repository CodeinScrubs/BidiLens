# When `dir="auto"` gets the first word right and the paragraph wrong

By Shayan SalehiRad, BidiLens maintainer · 6 September 2026

An English interface can receive an Arabic support message, a Hebrew document
title, or a Persian explanation from an AI assistant. Translating the interface
does not determine how that content should read. Even a single paragraph can
contain words that run in different directions.

Here is a small example, in its original logical order:

```text
React یک کتابخانه جاوااسکریپت بسیار محبوب است.
```

The intended reading is a Persian explanation beginning with the product name
React. The paragraph should run right to left, while the letters in React
continue to run left to right. Its final full stop belongs at the paragraph's
visual end.

Add `dir="auto"`, however, and the browser chooses an LTR paragraph base. React
is the first strong directional text it encounters. That is the documented
behavior of auto direction; it cannot know the author's intended paragraph
language. [HTML direction guidance](https://www.w3.org/International/questions/qa-html-dir)

| Native auto for this example | Explicit RTL base with an isolated LTR name |
|---|---|
| ![Persian explanation given an LTR paragraph base](../tests/visual/__screenshots__/chromium/flagship-auto.png) | ![Persian explanation with RTL base and isolated React](../tests/visual/__screenshots__/chromium/flagship-toolkit.png) |

These are repository regression images for this particular example. They are
not a claim that every mixed sentence needs RTL.

## Three decisions that often get bundled together

**Direction** sets the paragraph's reading base. **Alignment** positions that
paragraph inside its container. **Isolation** keeps an embedded name, URL, or
opposite-direction phrase from influencing surrounding text.

They can be chosen independently. For content whose direction is known, plain
HTML already expresses the important structure:

```html
<p dir="rtl" lang="fa" style="text-align: left">
  <bdi dir="ltr">React</bdi> یک کتابخانه جاوااسکریپت بسیار محبوب است.
</p>
```

This paragraph has an RTL base and is physically left-aligned. The `lang`
attribute identifies its language; it does not set direction. The `<bdi>`
element isolates the English name. [W3C inline bidi guidance](https://www.w3.org/International/questions/qa-bidi-unicode-controls)

Use `text-align: start` when alignment should follow the paragraph direction.
Use physical left alignment when that is an intentional design requirement.
Neither choice requires reversing the source string or mirroring navigation.

## Auto is a useful default, with a specific limitation

An English paragraph containing an RTL word should still have an LTR base:

```text
The Persian word کتاب means book.
```

Setting every message to RTL would mishandle this case. Likewise, one AI answer
may contain a Persian heading, an English quotation, a code block, and a table
whose cells use different languages. The useful unit of direction is usually
the semantic block, not the whole conversation or application.

CSS `unicode-bidi: plaintext` helps when each paragraph should derive its base
from its own first strong character. It has the same ambiguity for the leading
React example. It also derives the base independently of CSS `direction`.
When implementing an explicit LTR/RTL choice, remove `plaintext` from the
directed prose block and apply appropriate isolation. [CSS Writing Modes definition](https://drafts.csswg.org/css-writing-modes-4/#valdef-unicode-bidi-plaintext)

A practical policy is to honor explicit author/user direction first, then
apply the product's automatic policy. First-strong inference is simple and
predictable. A content-majority heuristic can better match technical prose,
but can misread quotations, names, acronyms, or intentionally mixed sentences.
Give readers a way to correct an inference when the product allows it.

## Put the fix at the rendering boundary

Keep the original string as the source of truth. Render direction and isolation
as metadata around it. Copy, export, search, model prompts, and storage should
continue to use logical source order.

For Markdown, apply the policy to parsed paragraphs, headings, list items,
quotes, and table cells. Preserve code blocks' independent policy. A code
block starting with an Arabic comment is a useful test: code does not become
LTR merely because it is nested inside another element.

Avoid rearranging individual words or reversing strings. Besides damaging
source integrity, those transformations interfere with the browser's own
Unicode ordering and shaping. Adding invisible directional controls to stored
text also creates copy and security concerns; semantic markup is available in
HTML renderers. [Unicode Bidirectional Algorithm](https://www.unicode.org/reports/tr9/)

## Trying the application layer with BidiLens

I built the MIT-licensed BidiLens toolkit to supply this direction policy and
isolation layer. Browsers still perform Unicode ordering and glyph shaping.
The HTML adapter accepts plain text, escapes it, and returns semantic markup:

```bash
npm install @bidilens/html@0.3.3
```

```js
import { renderBidiHtml } from '@bidilens/html';

const source = 'React یک کتابخانه جاوااسکریپت بسیار محبوب است.';
const result = renderBidiHtml(source);

console.log(result.blocks[0].direction); // rtl
console.log(result.source === source);  // true
console.log(result.html);               // RTL paragraph, isolated LTR React
```

The default heuristic excludes recognized technical tokens from natural-language
direction evidence. Callers can choose other strategies or explicit direction.
The [interactive demo](https://codeinscrubs.github.io/BidiLens/) lets you compare
policies with your own text. Framework and Markdown integrations are documented
in the [repository](../README.md).

An LTR-only scope in an LTR context receives no added bidi annotations under
the default intervention policy. English embedded in an RTL parent still needs
direction handling. The HTML serializer itself still escapes text and creates
ordinary block markup; “no bidi intervention” does not mean zero processing.

## What a useful regression check includes

Test the original failing sentence, its English counterpart, and adjacent
paragraphs with different directions. Add parentheses, URLs, inline code,
digits, emoji, and line wrapping. Repeat with left alignment and start
alignment. During streaming, compare the completed output with batch rendering.

Check visible order and logical text separately. A screenshot can reveal
misplaced punctuation but cannot prove copied text is intact. A `textContent`
assertion can prove a string survived but cannot prove that it is readable.
Exercise selection, clipboard, editing/composition, keyboard navigation, and
screen readers in the actual host application.

BidiLens has a generated regression corpus and automated browser/native checks,
but the corpus currently has zero native-speaker-certified cases. It does not
promise universal inference, universal terminal shaping, or accessibility
certification. [Current limitations](LIMITATIONS.md)

If you maintain a multilingual renderer, a small reproduction with intended
direction and unchanged logical source is especially useful. If you read an
RTL language fluently, reviewing a few [corpus templates](../corpus/README.md)
can improve the evidence more than adding another hundred generated examples.
