# @bidilens/core

Framework-independent Unicode direction analysis and security utilities.

The default detector is `content-majority`. It removes technical tokens from
direction evidence before counting Unicode strong characters, so this remains
RTL even though it starts with Latin text:

```ts
import { analyzeText, planInlineIsolation } from '@bidilens/core';

const source = 'React یک کتابخانه جاوااسکریپت بسیار محبوب است.';
const result = analyzeText(source);
// result.direction === 'rtl'
// result.text === source (logical order is unchanged)

const isolations = planInlineIsolation(source, 'rtl');
// React is planned as an LTR identifier isolation.
```

Use `{ strategy: 'first-strong' }` only when compatibility with a host's
legacy `dir="auto"` behavior is explicitly required.
