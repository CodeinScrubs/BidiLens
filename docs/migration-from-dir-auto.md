<!-- SPDX-License-Identifier: Apache-2.0 -->
# Migrating from `dir="auto"` to BidiLens

> You already have `dir="auto"` on your chat UI. Here's how to adopt BidiLens without breaking existing behavior.

## Why migrate?

If `dir="auto"` works satisfactorily for your use case, keep it! BidiLens adds value when:

- Users paste URLs, code snippets, or file paths that get visually scrambled inside RTL paragraphs
- You stream LLM responses and the layout snaps from left to right as tokens arrive
- You need to detect Trojan Source attacks or directional spoofing in user input
- You need mobile parity (React Native, iOS, Android) with identical isolation rules
- You want correct sentence-ending punctuation placement without punctuation drift

---

## Migration Paths

### 1. Drop-in Replacement with Web Component (< 5 minutes)

Replace existing `dir="auto"` container elements with the custom element:

**Before:**
```html
<div dir="auto" class="chat-message">${message}</div>
```

**After:**
```html
<script type="module" src="https://unpkg.com/@bidilens/web-component/dist/standalone.js"></script>

<bidi-message>${message}</bidi-message>
```

### 2. React Migration

**Before:**
```tsx
function ChatBubble({ message }: { message: string }) {
  return <div dir="auto" className="bubble">{message}</div>;
}
```

**After:**
```tsx
import { BidiBlock } from '@bidilens/react';

function ChatBubble({ message }: { message: string }) {
  return (
    <BidiBlock className="bubble">
      {message}
    </BidiBlock>
  );
}
```

### 3. Progressive Enhancement with Core API

Keep existing HTML markup and only use BidiLens for analysis:

```ts
import { analyzeText, planInlineIsolation } from '@bidilens/core';

const analysis = analyzeText(userInput);
element.dir = analysis.direction;
```
