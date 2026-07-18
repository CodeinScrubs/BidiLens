# @bidilens/terminal

Best-effort terminal/plain-text formatting with explicit limitations. No
portable API can force every terminal emulator to shape or reorder RTL text,
so the default returns the original logical string unchanged.

```bash
npm install @bidilens/terminal
```

```ts
import { formatTerminalText } from '@bidilens/terminal';

const safe = formatTerminalText(source); // unchanged source
const compatibility = formatTerminalText(source, { mode: 'unicode-isolates' });
console.log(compatibility.text); // explicit, reversible control insertion
```

Never persist the compatibility output or send it to a model; keep
`result.source`. ANSI escape sequences are masked during analysis without
changing offsets. Test each target emulator's display and clipboard behavior.
Run `pnpm --filter @bidilens/terminal example` after building.
