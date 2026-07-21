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
action for imperative transports.

String content is isolated automatically without injecting invisible controls.
LTR-only string content emits none of BidiLens's attributes or inline styles
by default. Supply `inheritedDirection="rtl"` for an RTL parent that SSR cannot
inspect, or `intervention="always"` when stable markers are required.
For structured children, use `BidiIsolate` and `BidiCode` at semantic
boundaries. The Node SSR example additionally needs
`npm install --save-dev react-dom`.
