# @bidilens/react

SSR-safe React components and hooks for mixed-direction messages, inline code,
and stable model-token streaming. React 18 and 19 are supported.

```bash
npm install @bidilens/react react
```

```tsx
import { BidiMessage, StreamingBidiMessage } from '@bidilens/react';

export function Answer({ text, streaming }: { text: string; streaming: boolean }) {
  return <StreamingBidiMessage text={text} completed={!streaming} />;
}
```

`completed` performs batch-equivalent final reconciliation, including during
SSR. The lower-level `useBidiStream` hook also returns an explicit `finish()`
action for imperative transports. Accumulated text whose paragraphs resolve to
different directions is rendered as independent block-like spans so the last
paragraph never changes the base direction of earlier paragraphs.

String content is isolated automatically without injecting invisible controls.
LTR-only string content emits none of BidiLens's attributes or inline styles
by default. Supply `inheritedDirection="rtl"` for an RTL parent that SSR cannot
inspect, or `intervention="always"` when stable markers are required.
Alignment is inherited from the host stylesheet unless the caller supplies it.
Normal React `style` ownership is preserved, so
`style={{ textAlign: 'left' }}` keeps an RTL paragraph physically left
aligned while BidiLens still applies direction and isolation, including when
streamed paragraphs have different base directions. A class or parent with
`text-align: left` works too. To choose content-relative alignment explicitly,
use `style={{ textAlign: 'start' }}`.
For structured children, use `BidiIsolate` and `BidiCode` at semantic
boundaries. The Node SSR example additionally needs
`npm install --save-dev react-dom`.
