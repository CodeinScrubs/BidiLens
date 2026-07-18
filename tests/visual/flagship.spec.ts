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
});
