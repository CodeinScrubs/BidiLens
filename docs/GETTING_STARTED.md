# Start with one message, not your whole application

BidiLens helps render mixed RTL/LTR **content**. You do not need to reverse
strings, change your database, switch your whole UI to RTL, or install every
package. Start at one rendering boundary and keep the original text as data.

## 1. Choose the boundary you already have

| Your application renders… | Start here | Important boundary |
|---|---|---|
| Plain text in React | [React recipe below](#react) | Existing React 18/19 app; strings, not a Markdown component |
| Plain text in Vue | [Vue component](../packages/vue/README.md) | Existing Vue 3.5+ app |
| Plain text in Svelte | [Svelte stores](../packages/svelte/README.md) | Svelte 4/5; you render the isolation plan |
| Existing HTML blocks outside framework ownership | [DOM recipe below](#existing-dom) | Observe a bounded message container, not an editor |
| Plain text serialized to HTML | [HTML recipe below](#plain-text-to-html) | Escapes text; does not parse existing HTML |
| Markdown-It output | [Markdown recipe below](#markdown-it) | Preserve your parser, plugins, and source Markdown |
| unified / remark / rehype output | [Markdown pipeline](../packages/markdown/README.md) | Plugins belong in the documented parse/render order |
| A no-build browser page | [Web Component](../packages/web-component/README.md) | Standalone script; no npm build required |
| Android Views / Compose | [Android guide](../android/README.md) | Published Maven artifacts; use native adapters |
| iOS / macOS | [Swift / UIKit / SwiftUI](../apple/README.md) | Source integration, not registry-published |
| Windows .NET / WPF | [Windows guide](../windows/README.md) | Source integration, not NuGet-published |
| Rust | [Rust core](../rust/README.md) | Source integration; analysis, not a terminal renderer |
| Security scanning or terminal output | [CLI](../packages/cli/README.md) / [terminal](../packages/terminal/README.md) | Auditing and terminal rendering are different tasks |

**Use one adapter per boundary.** For example, a React chat that already renders
Markdown should add the Markdown plugin to that pipeline, not flatten the
Markdown into `BidiMessage` and then observe React's DOM.

The JavaScript recipes below work with the published `0.3.3` APIs. They use
ESM; server-side JavaScript and the CLI require Node.js 22.12 or newer. Browser
adapters target current standards-based browsers. Native platforms have their
own requirements in the linked guides. Keep your existing compatible framework
and parser versions: no forced upgrade, global stylesheet, network service, or
account is required by these recipes. npm installation itself uses the network.

## 2. Add one adapter

### React

In an existing React 18/19 project:

```bash
npm install @bidilens/react
```

Save as `Message.tsx`, then render `<Message text={answer} />`:

```tsx
'use client';
import { BidiMessage } from '@bidilens/react';

export function Message({ text, inheritedDirection = 'ltr' }: {
  text: string;
  inheritedDirection?: 'ltr' | 'rtl';
}) {
  return <BidiMessage text={text} inheritedDirection={inheritedDirection}
    style={{ textAlign: 'left' }} />;
}
```

This example deliberately keeps the text physically left-aligned, including
RTL paragraphs. Remove that style to use natural start alignment. If the
surrounding container is RTL, pass `inheritedDirection="rtl"`; SSR cannot
inspect the host's CSS. `'use client'` establishes the boundary in Next.js App
Router; it does not disable SSR. The component is defined outside its caller
and needs no extra effect or DOM observer.

For accumulated AI output, use the documented `StreamingBidiMessage` and set
`completed` when the response ends. These components render plain text, not
Markdown. **Rollback:** render your original component again.

### Existing DOM

```bash
npm install @bidilens/dom
```

Save as `mount-bidi.ts` in your browser application:

```ts
import { observeBidi, restoreBidi } from '@bidilens/dom';

export function mountBidi(root: HTMLElement) {
  const skipSelector = 'input, textarea, select, [contenteditable], [role="textbox"]';
  if (root.closest(skipSelector) || root.querySelector(skipSelector)) {
    throw new Error('Mount BidiLens on an editor-free message container.');
  }
  const watcher = observeBidi(root, { skipSelector });
  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    watcher.disconnect();
    restoreBidi(root);
  };
}
```

After mounting a container with semantic blocks such as `<p>`, `<li>`, or
headings, call `const cleanup = mountBidi(messagesElement)`. The observer
annotates immediately and then handles updates. No separate initial
`applyBidi` call is needed. Keep your existing scoped alignment CSS; this
recipe installs no global stylesheet.

The helper rejects containers inside or containing common editable surfaces.
Keep framework-owned DOM and all editor surfaces outside this scope, including
during later updates. Custom editors may need additional exclusion rules.
**Rollback/unmount:** call `cleanup()` first. This disconnects observation and
restores BidiLens-owned presentation from the current session. See the
[ownership limitations](../packages/dom/README.md) before handing the same
properties to another library. Repeated cleanup is a no-op, including after
remounting; mount only once per root at a time.

### Plain text to HTML

```bash
npm install @bidilens/html
```

Save as `render-message.ts`:

```ts
import { renderBidiHtml } from '@bidilens/html';

export function renderMessage(text: string, inheritedDirection: 'ltr' | 'rtl' = 'ltr') {
  return renderBidiHtml(text, { inheritedDirection }).html;
}
```

Call `renderMessage(answer)` at the intended message boundary. Input is plain
text, including untrusted plain text; existing HTML is escaped, not parsed.
Do not concatenate unescaped user input onto the result. Pass `'rtl'` for an
RTL parent, and control alignment with your own scoped CSS. **Rollback:** use
your previous escaped-text serializer.

### Markdown-It

In an existing Markdown-It 13, 14, or 15 application:

```bash
npm install @bidilens/markdown
```

Save as `message-parser.ts`:

```ts
import MarkdownIt from 'markdown-it';
import { markdownItBidi } from '@bidilens/markdown';

export function createMessageParser(inheritedDirection: 'ltr' | 'rtl' = 'ltr') {
  const parser = new MarkdownIt({ html: false });
  markdownItBidi(parser, { inheritedDirection });
  return parser;
}
```

Create the parser once, then call `parser.render(markdown)` per message. If
you already own a parser, register `markdownItBidi` once on that parser instead
and retain your other plugins. For a new application, also install
`markdown-it`; version 15 includes types, while 13/14 need their matching
`@types/markdown-it` package. See the [compatibility guide](../packages/markdown/README.md).

Keep raw HTML disabled for untrusted Markdown. BidiLens is **not an HTML
sanitizer**; review other plugins and your insertion policy separately.
**Rollback:** recreate the parser without registering BidiLens. Stored Markdown
needs no migration. Visible text selection and raw Markdown copying are
different contracts; your raw-copy button should use the original source.

## 3. Prove the integration in your app

Use your existing feature flag to enable this for one message surface first.
Compare enabled/disabled output with these fixtures:

| Input / check | Expected result |
|---|---|
| `React یک کتابخانه جاوااسکریپت بسیار محبوب است.` | RTL paragraph; `React` remains an isolated LTR token |
| `The Persian word کتاب means book.` | LTR paragraph; Persian inline content is isolated |
| `Plain English remains unchanged.` in an LTR parent | No BidiLens direction attributes, metadata, or isolation nodes |
| The same English text in an RTL parent | Explicit LTR protection; do not expect a no-op here |
| Mixed text with `text-align: left` or `center` | Alignment stays authored while direction/isolation still work |
| Multiple paragraphs, links, code, and punctuation | Correct per-block behavior; code/source order stays logical |
| Stream updates, unmount, and rollback | No leaked observers; original source and host state remain usable |

The four code snippets above are checked against the CLI recipes, compiled
against packed package declarations, and executed by the packed-consumer
release gate. That gate checks mixed text, LTR behavior, inherited RTL, escaping,
left alignment, editable exclusions, observed updates, and DOM restoration.
It does not replace your browser/device, clipboard, screen-reader, or IME tests.
Use [Playwright helpers](../packages/playwright/README.md) and the
[accessibility checklist](ACCESSIBILITY.md) for your host validation.

## Common integration mistakes

- **Text aligns left but reads incorrectly:** alignment is not base direction.
  Keep your alignment choice and configure the direction boundary independently.
- **English breaks under an RTL layout:** pass the actual inherited direction
  to string/SSR renderers. The DOM adapter can inspect ancestors itself.
- **Hydration or editor problems:** do not let a DOM observer mutate nodes
  managed by React/Vue/Svelte or an editor. Use the appropriate adapter instead.
- **Markdown shows literal `**` / links:** a plain-text component does not parse
  Markdown. Integrate at the Markdown parser boundary.
- **Nothing changes on a plain `<div>`:** the DOM adapter scans semantic blocks
  by default. Use `<p>` or configure `blockSelector` / `includeRoot` deliberately.
- **A short, ambiguous sentence chooses the wrong base:** automatic inference
  cannot know author intent. Use the adapter's explicit direction policy.
- **A project cannot accept the runtime/package requirements:** native `dir`
  and semantic `<bdi>` may be sufficient for a known-direction surface. Adoption
  is optional; do not weaken your host's compatibility or security requirements.

## Offline CLI guidance (0.4.0+)

Version `0.4.0` adds the `guide` command; it is **not in `0.3.3`**. Check the
[release status](../README.md) before requesting a version from npm. With CLI
`0.4.0` installed, run `bidilens guide`, `bidilens guide react`, or
`bidilens guide dom --json`. From a source checkout:

```bash
pnpm run build
node packages/cli/dist/bin.js guide
node packages/cli/dist/bin.js guide react
node packages/cli/dist/bin.js guide dom --json
```

It lists 12 adapter/platform routes. Four have copyable recipes; the others
link to their platform instructions. It does not read your project, write
files, install anything, send telemetry, or access the network. JSON has
`schemaVersion: 1`; consumers should allow additive fields. Unsupported targets
exit non-zero. There is no auto-detection or claim that a guide is a diagnosis.

## What remains your decision

BidiLens is MIT-licensed and works offline at runtime. Default auto intervention
avoids annotations for ordinary LTR content in an LTR context; a serializer or
component still creates its normal element and analysis still has a cost.
Measure representative message sizes in your host before a wide rollout.

Direction inference remains heuristic. Native packages have different
distribution/validation maturity. No library can guarantee every renderer,
editor, language mixture, or accessibility stack. See [limitations](LIMITATIONS.md),
[performance](PERFORMANCE.md), and [support](../SUPPORT.md) before adopting.
