# @bidilens/vue

Vue 3.5+ message components and reactive direction/stream composables.

```bash
npm install @bidilens/vue vue
```

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { BidiMessage, useBidiStream } from '@bidilens/vue';

const answer = ref('React ');
const stream = useBidiStream(answer);
</script>

<template><BidiMessage :text="answer" /></template>
```

The component emits semantic `dir`, block metadata, and `<bdi>`/`<code>`
isolations when bidi handling is needed. LTR-only content emits no BidiLens
attributes/styles by default; use `inherited-direction="rtl"` or
`intervention="always"` for those explicit contexts. Run
`pnpm --filter @bidilens/vue example` after building.
The Node SSR example additionally needs
`npm install --save-dev @vue/server-renderer`.
