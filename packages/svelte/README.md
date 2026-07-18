# @bidilens/svelte

Svelte 4/5 stores for whole-message analysis and incremental AI streaming.
Snapshots include inline-isolation plans for idiomatic `{#each}` rendering.

```bash
npm install @bidilens/svelte svelte
```

```ts
import { createBidiMessage, createStreamingBidiMessage } from '@bidilens/svelte';

const message = createBidiMessage('React یک کتابخانه است.');
const stream = createStreamingBidiMessage();
stream.push('React ');
stream.push('یک کتابخانه است.');
```

Both APIs implement the standard Svelte readable-store subscription contract.
Run `pnpm --filter @bidilens/svelte example` after building.
