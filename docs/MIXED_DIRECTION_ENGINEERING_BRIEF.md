# Mixed-direction AI messages: engineering review packet

This packet offers reproducible **application-level rendering cases**, not a
claim that a model's training, ChatGPT client or another proprietary product
has been repaired. BidiLens is MIT-licensed. A maintainer may prefer native
direction/isolation primitives, the toolkit, or the reusable fixtures alone.

## Why a leading English word exposes the problem

The string below is already in logical order:

```text
Capsule مثل یک روکش لیز و ضدچسب دور باکتری است.
```

For the declared Persian reading intent, `Capsule` belongs at the reading-order
start on the right of its line; the period belongs at the other end. Its Latin
letters still read internally LTR. First-strong paragraph selection instead
chooses LTR. One global RTL rule fails the English mirror and standalone formulas.
Physical left alignment is independent of either reading direction.

This diagnosis is reproducible in the controlled fixtures. Screenshots alone
do **not** establish the original logical source, the host's implementation or
whether the model generated incorrect wording. Direction metadata cannot repair
bad logical word order or grammar.

## Distinct boundaries to review

| Boundary | Required behavior | Regression evidence |
| --- | --- | --- |
| Paragraph policy | Resolve each prose block; honor known author intent instead of claiming perfect inference | English-leading Persian prose, English mirror, explicit-intent case |
| Inline phrases | Isolate `Pyruvate kinase` and `IgM + complement` as ordered LTR units within Persian prose | Core unit tests and 390 px browser geometry |
| Formula blocks | Preserve LTR order and exact arrow/operator characters | Two standalone English formulas in mixed Markdown |
| Code/query syntax | Preserve complete literals, delimiters and logical copy text | `\bTB\b`, `%TB%`, `[[:<:]]TB[[:>:]]` inline/fenced fixtures |
| Alignment/layout | Leave host physical-left or other authored alignment unchanged | Every mobile block retains `text-align:left` |
| Streaming/storage | Reconcile final paragraph intent and preserve the original string | All two-chunk split positions for the unforced curated paragraph cases |

The standards already supply the layout machinery: see [W3C inline bidi
markup](https://www.w3.org/International/articles/inline-bidi-markup/index.en).
The missing layer can be the application structure/policy given to the host
renderer. This is not evidence that Unicode reordering itself is broken.

## Minimal web integration

Apply the actual Markdown adapter to one message component, not the whole page:

```ts
import MarkdownIt from 'markdown-it';
import { markdownItBidi } from '@bidilens/markdown';

const parser = new MarkdownIt({ html: false });
markdownItBidi(parser);
const html = parser.render(originalMarkdown);
// Retain originalMarkdown for persistence and the host's Copy action.
// Keep the host's sanitization/content-security policy and alignment stylesheet.
```

For a single paragraph with **known** Persian intent, use an explicit policy:

```ts
import { renderBidiHtml } from '@bidilens/html';

const result = renderBidiHtml(originalParagraph, { strategy: 'rtl' });
// result.source remains unchanged; result.html is escaped presentation markup.
```

Do not apply that forced policy to the entire response: an English formula or
quote needs its own base. `inheritedDirection` and `fallback` describe context;
neither overrides a non-neutral majority. Caller-specific single-token
`technicalIdentifiers` are another option when the host knows its domain.
Do not silently remove every English word from direction evidence.

## Native host boundary

Porting a classifier is not enough: the host must expose the same paragraph
structure to its layout engine. Do not send an entire multilingual Markdown
response through one forced whole-control direction.

- **Android Compose:** the current source `BidiText` supports independent
  paragraph styles with `isolateRuns = false`. Use a separate read-only block
  for explicit prose/formula intent and `alignToContent = false` to retain
  authored physical alignment; see the [Android guide](../android/README.md).
- **Android Views:** `applyBidiLens()` sets one `textDirection` on the whole
  `TextView`/`EditText` and does not insert isolation controls. It is not an
  independent-base multi-paragraph Markdown renderer. Use one display view per
  block when bases differ. Arbitrary query syntax needs a dedicated LTR code
  view, or an explicit display-only isolation path with source-safe copy.
- **UIKit:** the current `UILabel`/`UITextView` integration still has the
  independent-paragraph/restoration limits recorded in the
  [Apple guide](../apple/README.md) and readiness review. Use separate read-only
  controls for prose, formulas and code until that ownership model is repaired.
  Do not rewrite editable or marked text to get a visual workaround.

These are integration choices, not requirements to mirror an app's entire
layout or to modify stored/model-generated strings. Compiler, emulator and
browser passes are separate evidence; validate the actual downstream surface.

## Review and bounded pilot

Use the [gallery](problem-gallery/README.md), [case documentation](SCREENSHOT_CASES.md),
[HTML source pairs](problem-gallery/index.json) and
[fixture module](../scripts/fixtures/chatgpt-mobile-oct2.ts). The captures use the
current **unreleased source branch**, not a claim about installed registry versions.

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium firefox webkit
pnpm run check
pnpm exec playwright test tests/visual/mobile-study.spec.ts --workers=1
```

Start in shadow mode, then enable one read-only message surface behind a flag.
Require exact source/copy invariants, preserved selection and host layout,
native-language review, screen-reader checks and a one-commit rollback. Do not
mutate editable/IME-controlled DOM, stored chats or prompts. Native ports must
run their own platform gates; browser fixtures do not certify a native app.

Known remaining limits include intent ambiguity, native grapheme differences,
UIKit independent-paragraph/restoration work, adversarial incremental workloads,
and missing physical-device/accessibility/downstream-pilot evidence. See
[production readiness](PRODUCTION_READINESS.md) and [limitations](LIMITATIONS.md).

## ChatGPT support report draft — not submitted by this document

Subject: Mixed Persian/English message rendering: paragraph bases and literal code boundaries

Hello OpenAI Support,

I encountered mixed-direction reading-order problems in the mobile ChatGPT
interface, especially when Persian prose begins with an English term. Five mobile
captures were shared for this investigation on October 2, 2026; they are not
attached to this public draft. The precise app version, device/OS version,
capture time and original copied message still need to be added to this report;
please do not infer them from the screenshots.

A small reproducible logical example is:

```text
Capsule مثل یک روکش لیز و ضدچسب دور باکتری است.
```

Expected: the Persian paragraph reads RTL, `Capsule` remains internally LTR,
and the period appears at the visual left end. A separate English formula such
as `PEP + ADP → Pyruvate + ATP` should remain LTR. Inline query literals such
as `\bTB\b` should preserve both backslashes and logical copy order.

Could you route this to the ChatGPT message-rendering/i18n team? I maintain
[BidiLens](https://github.com/CodeinScrubs/BidiLens), and can offer source-preserving
fixtures or a small reversible renderer pilot. The controlled before/after
captures are not from a modified ChatGPT app, and I am not claiming an OpenAI
integration or that every ambiguous sentence can be inferred automatically.

Thank you.

OpenAI's [official support instructions](https://help.openai.com/en/articles/6614161-how-can-i-contact-support)
currently direct reports through the help-site chat bubble and request reproduction,
timestamps, environment details and screenshots without sensitive data. Add account
details only in that private support channel, never to this public packet. A Codex
GitHub issue concerns a different renderer and is not a ChatGPT bug-report substitute.
