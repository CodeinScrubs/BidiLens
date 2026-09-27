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
stream.reset('یک پاسخ تازه.');
```

Both APIs implement the standard Svelte readable-store subscription contract.
After `finish()`, `push()` and an append through `setText()` throw until reset,
matching the core stream contract. A rejected operation does not change
`getText()` or notify subscribers. Use `reset()` for a fresh message;
replacement (non-prefix) `setText()` also resets the stream.
LTR-only snapshots preserve the source and contain an empty isolation plan, so
an idiomatic renderer has no BidiLens wrapper work to perform.
Run `pnpm --filter @bidilens/svelte example` after building.
