# @bidilens/playwright

Reusable Playwright assertions for mixed-direction rendering. The helpers test
the properties that screenshot diffs alone cannot prove: explicit block
direction, exact logical `textContent`, ordered inline isolation, selection,
clipboard text, and the physical start edge of a logical token.

```bash
npm install -D @bidilens/playwright @playwright/test
```

```ts
import { test } from '@playwright/test';
import {
  expectBidiBlock,
  expectLogicalSelection,
  expectTokenAtBaseStart
} from '@bidilens/playwright';

const source = 'React یک کتابخانه جاوااسکریپت بسیار محبوب است.';

test('renders the flagship case', async ({ page }) => {
  await page.goto('/chat');
  const message = page.getByTestId('answer');
  await expectBidiBlock(message, {
    text: source,
    direction: 'rtl',
    isolations: [
      { text: 'React', direction: 'ltr', kind: 'identifier', tagName: 'bdi' }
    ]
  });
  await expectLogicalSelection(message, source);
  await expectTokenAtBaseStart(message, 'React', 'rtl');
});
```

`expectLogicalClipboard` additionally sends the platform copy shortcut and
reads `navigator.clipboard`. Grant clipboard read/write permission for the test
origin first. Clipboard support remains browser/OS dependent, so projects
should keep selection assertions on every browser and run real clipboard
assertions where their CI environment supports them.

`validateBidiSnapshot` is reporter-independent: it returns structured issue
codes without launching a browser. The packaged example demonstrates that API;
the repository's Playwright suite exercises the browser-bound helpers on
Chromium, Firefox, and WebKit.

An LTR expectation with no expected isolates accepts the default unannotated
pass-through. Set `requireExplicitDirection: true` and
`requireBlockMarker: true` when testing an `intervention: 'always'` integration.

After building the repository, run the packaged example with
`pnpm --filter @bidilens/playwright example`.
