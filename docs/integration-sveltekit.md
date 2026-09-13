<!-- SPDX-License-Identifier: Apache-2.0 -->
# SvelteKit & Svelte Integration

## Installation

```bash
pnpm add @bidilens/svelte @bidilens/core
```

---

## Basic Usage with Svelte Store

```svelte
<script lang="ts">
  import { createBidiMessage } from '@bidilens/svelte';

  export let text = 'کتابخانه جدید @bidilens/svelte منتشر شد!';
  const message = createBidiMessage(text);
</script>

<div dir={$message.direction} class="message">
  {$message.text}
</div>
```

---

## Streaming Messages in SvelteKit

```svelte
<script lang="ts">
  import { createStreamingBidiMessage } from '@bidilens/svelte';

  const stream = createStreamingBidiMessage();

  export function onTokenReceived(chunk: string) {
    stream.push(chunk);
  }
</script>

<div dir={$stream.direction} class="streaming-box">
  {$stream.currentParagraph.text}
</div>
```
