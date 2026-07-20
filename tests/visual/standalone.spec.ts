import { test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expectBidiBlock } from '../../packages/playwright/src/index.js';

const FLAGSHIP = 'React یک کتابخانه جاوااسکریپت بسیار محبوب است.';
const ORIGIN = 'https://bidilens.test';

test('loads the standalone web component without a bundler or import map', async ({ page }) => {
  const bundle = await readFile(resolve('packages/web-component/dist/standalone.js'), 'utf8');

  await page.route(`${ORIGIN}/standalone.js`, async (route) => route.fulfill({
    contentType: 'text/javascript; charset=utf-8',
    body: bundle
  }));
  await page.route(`${ORIGIN}/fixture`, async (route) => route.fulfill({
    contentType: 'text/html; charset=utf-8',
    body: `<!doctype html>
      <meta charset="utf-8">
      <script type="module" src="/standalone.js"></script>
      <bidi-message text="${FLAGSHIP}"></bidi-message>`
  }));

  await page.goto(`${ORIGIN}/fixture`);
  await page.evaluate(() => customElements.whenDefined('bidi-message'));

  const message = page.locator('bidi-message');
  await expectBidiBlock(message, {
    text: FLAGSHIP,
    direction: 'rtl',
    tagName: 'bidi-message',
    isolations: [{ text: 'React', direction: 'ltr', kind: 'identifier', tagName: 'bdi' }]
  });
});
