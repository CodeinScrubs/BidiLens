import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

test.describe('flagship mixed-direction rendering', () => {
  test('compares browser defaults, naive RTL, dir=auto, and BidiLens', async ({ page }) => {
    await page.goto(pathToFileURL(resolve('tests/visual/flagship.html')).href);
    await expect(page.locator('[data-case="toolkit"]')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('[data-case="toolkit"]')).toHaveScreenshot('flagship-toolkit.png');
    await expect(page.locator('[data-case="auto"]')).toHaveScreenshot('flagship-auto.png');
  });

  test('keeps a technical first token on the base-direction side', async ({ page }) => {
    await page.setContent(`
      <style>
        p { width: 760px; white-space: nowrap; font: 20px Arial; direction: rtl; text-align: start; }
        bdi { unicode-bidi: isolate; }
      </style>
      <p id="message"><bdi dir="ltr">React</bdi> یک کتابخانه جاوااسکریپت بسیار محبوب است.</p>
    `);
    const paragraph = page.locator('#message');
    const first = page.locator('#message bdi');
    const paragraphBox = await paragraph.boundingBox();
    const firstBox = await first.boundingBox();
    expect(paragraphBox).not.toBeNull();
    expect(firstBox).not.toBeNull();
    expect(firstBox!.x).toBeGreaterThan(paragraphBox!.x + paragraphBox!.width / 2);
    expect(await paragraph.evaluate((element) => getComputedStyle(element).unicodeBidi)).not.toBe('plaintext');
  });
});
