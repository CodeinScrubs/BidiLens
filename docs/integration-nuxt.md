<!-- SPDX-License-Identifier: Apache-2.0 -->
# Nuxt 3 & Vue 3 SSR Integration

## Installation

```bash
pnpm add @bidilens/vue @bidilens/core
```

---

## Nuxt 3 Plugin Registration

Create a plugin to register the `v-bidi` directive globally:

```ts
// plugins/bidilens.ts
import { vBidi } from '@bidilens/vue';

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('bidi', vBidi);
});
```

---

## Usage in Components (`<script setup>`)

```vue
<script setup lang="ts">
import { useBidi } from '@bidilens/vue';

const message = ref('این یک پیام آزمایشی است: npm install @bidilens/vue');
const { direction, isolations } = useBidi(message);
</script>

<template>
  <div v-bidi class="chat-message">
    {{ message }}
  </div>
</template>
```
