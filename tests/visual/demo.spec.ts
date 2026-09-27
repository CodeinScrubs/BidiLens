import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { expectBidiBlock } from '../../packages/playwright/src/index.js';

const DEMO_ORIGIN = 'http://127.0.0.1:4173';
const FLAGSHIP = 'React یک کتابخانه جاوااسکریپت بسیار محبوب است.';
const SHARED = 'The Persian word کتاب means “book”.';

test('responsive panel headers do not clip controls in either UI language', async ({ page }) => {
  await page.goto(DEMO_ORIGIN);
  for (const language of ['en', 'fa']) {
    if (language === 'fa') await page.getByRole('button', { name: 'فارسی' }).click();
    for (const width of [320, 390, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      const clipped = await page.locator('.panel-title').evaluateAll((headers) => headers.flatMap((header) => {
        const bounds = header.getBoundingClientRect();
        return [...header.querySelectorAll('button, input, select')].flatMap((control) => {
          const rect = control.getBoundingClientRect();
          return rect.left < bounds.left - 1 || rect.right > bounds.right + 1
            || rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1
            ? [control.getAttribute('aria-label') ?? control.textContent?.trim()] : [];
        });
      }));
      expect(clipped, `${language} at ${width}px`).toEqual([]);
    }
  }
});

test('selected policy drives the rendered Markdown preview', async ({ page }) => {
  await page.goto(DEMO_ORIGIN);
  await page.getByLabel('Load a mixed-direction preset').selectOption('flagship');
  const paragraph = page.locator('.markdown-body p');
  await expect(paragraph).toHaveCSS('direction', 'rtl');
  await page.getByLabel('Direction policy').selectOption('first-strong');
  await expect(paragraph).toHaveCSS('direction', 'ltr');
  await page.getByLabel('Direction policy').selectOption('content-majority');
  await expect(paragraph).toHaveCSS('direction', 'rtl');
});

test('English content stays LTR inside the Persian-language UI', async ({ page }) => {
  await page.goto(DEMO_ORIGIN);
  await page.getByLabel('Input Markdown').fill('Ordinary English prose.');
  await page.getByRole('button', { name: 'فارسی' }).click();
  await expect(page.locator('main')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('[data-case="toolkit-live"]')).toHaveCSS('direction', 'ltr');
  await expect(page.locator('.markdown-body p')).toHaveCSS('direction', 'ltr');
});

test('completed streams reconcile direction and the demo renders without app errors', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  const source = `Ordinary English ${'این جمله فارسی است و باید راست به چپ باشد. '.repeat(3)}`;
  await page.goto(DEMO_ORIGIN);
  await expect(page).toHaveTitle(/BidiLens/);
  await expect(page.locator('.hero h1')).toBeVisible();
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  await page.getByLabel('Input Markdown').fill(source);
  await page.getByRole('slider', { name: 'Chunk size' }).fill('4');
  await page.getByRole('slider', { name: 'Delay (ms)' }).fill('1');
  await page.getByRole('button', { name: 'Simulate stream' }).click();
  await expect(page.getByRole('button', { name: 'Simulate stream' })).toBeEnabled();
  await expect(page.locator('.stream-output')).toHaveText(source);
  await expect(page.locator('.stream-output')).toHaveCSS('direction', 'rtl');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: resolve(tmpdir(), `bidilens-demo-audit-${testInfo.project.name}-desktop.png`) });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator('.hero h1')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: resolve(tmpdir(), `bidilens-demo-audit-${testInfo.project.name}-mobile.png`) });
  expect(errors).toEqual([]);
});

test('falls back when the browser clipboard API never settles', async ({ page }) => {
  // This case intentionally waits for two clipboard timeout paths. Leave room
  // for a cold Vite startup on slower hosted Windows/browser combinations.
  test.setTimeout(60_000);

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        readText: () => new Promise<string>(() => undefined),
        writeText: () => new Promise<void>(() => undefined)
      }
    });
  });
  await page.goto(DEMO_ORIGIN);
  await page.getByLabel('Load a mixed-direction preset').selectOption('flagship');

  const status = page.locator('.action-status');
  await page.getByRole('button', { name: 'Copy share link' }).click();
  await expect(status).toHaveText('Share state added to the address bar; copy the URL manually.', {
    timeout: 5_000
  });

  await page.getByRole('button', { name: 'Verify logical copy' }).click();
  await expect(status).toHaveText(
    'Logical selection matches the immutable source; clipboard readback is unavailable.',
    { timeout: 5_000 }
  );
});

test('exercises the offline bilingual playground, controls, corpus, copy, and exports', async ({ page }) => {
  const demoManifest = JSON.parse(
    await readFile(new URL('../../apps/demo/package.json', import.meta.url), 'utf8')
  ) as { version: string };
  const corpusFixtures = JSON.parse(
    await readFile(new URL('../../corpus/cases.json', import.meta.url), 'utf8')
  ) as unknown[];
  const initialHash = new URLSearchParams({ text: SHARED }).toString();
  await page.goto(`${DEMO_ORIGIN}/#${initialHash}`);

  const input = page.getByLabel('Input Markdown');
  const direction = page.locator('.metric').filter({ hasText: 'Direction' }).locator('strong');
  await expect(page.locator('.eyebrow')).toHaveText(`BidiLens v${demoManifest.version}`);
  await expect(page.locator('.corpus-panel .panel-title small')).toHaveText(
    `Search all ${corpusFixtures.length.toLocaleString('en-US')} bundled cases and load one into the playground.`
  );
  await expect(input).toHaveValue(SHARED);
  await expect(direction).toHaveText('ltr');

  await page.getByLabel('Load a mixed-direction preset').selectOption('flagship');
  await expect(input).toHaveValue(FLAGSHIP);
  await expect(direction).toHaveText('rtl');
  expect(await page.locator('.evidence-list li').count()).toBeGreaterThan(0);
  await expect(page.locator('.isolation-list li').first()).toContainText('React');
  const toolkit = page.locator('[data-case="toolkit-live"]');
  await expectBidiBlock(toolkit, {
    text: FLAGSHIP,
    direction: 'rtl',
    isolations: [{ text: 'React', direction: 'ltr', kind: 'identifier', tagName: 'bdi' }]
  });

  await page.getByLabel('Direction policy').selectOption('first-strong');
  await expect(direction).toHaveText('ltr');
  await expect(toolkit).toHaveAttribute('dir', 'ltr');
  await page.getByLabel('Direction policy').selectOption('content-majority');
  await expect(direction).toHaveText('rtl');

  await page.getByRole('button', { name: 'Copy share link' }).click();
  await expect.poll(() => page.evaluate(() => new URLSearchParams(location.hash.slice(1)).get('text')))
    .toBe(FLAGSHIP);
  await expect(page.locator('.action-status')).not.toBeEmpty();

  await page.getByRole('button', { name: 'Verify logical copy' }).click();
  await expect(page.locator('.action-status')).toContainText(/Logical selection/);

  await page.getByLabel('Load a mixed-direction preset').selectOption('security');
  expect(await page.locator('.finding-list li').count()).toBeGreaterThan(0);
  await page.getByLabel('Security mode').selectOption('off');
  await expect(page.locator('.finding-list li')).toHaveCount(0);
  await page.getByLabel('Security mode').selectOption('strict');
  expect(await page.locator('.finding-list li').count()).toBeGreaterThan(0);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('bidilens-analysis.json');
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const payload = JSON.parse(await readFile(downloadPath!, 'utf8')) as {
    source: string;
    analysis: { direction: string };
    security: { findings: unknown[] };
  };
  expect(payload.source).toContain('hidden');
  expect(payload.security.findings.length).toBeGreaterThan(0);
  expect(payload).toHaveProperty('ast');

  const search = page.getByLabel('Search fixture ID, description, tag, or text');
  await search.fill('fa-flagship-001');
  await expect(page.locator('.corpus-case')).toHaveCount(1);
  await expect(page.locator('.corpus-case')).toContainText('fa-flagship-001');
  await expectBidiBlock(page.locator('.corpus-case p'), {
    text: FLAGSHIP,
    direction: 'rtl',
    isolations: [{ text: 'React', direction: 'ltr', kind: 'identifier', tagName: 'bdi' }]
  });
  await page.locator('.corpus-case').getByRole('button', { name: 'Load' }).click();
  await expect(input).toHaveValue(FLAGSHIP);

  await page.getByRole('slider', { name: 'Chunk size' }).fill('32');
  await page.getByRole('slider', { name: 'Delay (ms)' }).fill('1');
  await page.getByRole('button', { name: 'Simulate stream' }).click();
  await expect(page.locator('.stream-output')).toHaveText(FLAGSHIP, { timeout: 10_000 });

  const htmlDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export semantic HTML' }).click();
  const htmlDownload = await htmlDownloadPromise;
  expect(htmlDownload.suggestedFilename()).toBe('bidilens-semantic.html');
  const htmlPath = await htmlDownload.path();
  expect(htmlPath).not.toBeNull();
  const semanticHtml = await readFile(htmlPath!, 'utf8');
  expect(semanticHtml).toContain('dir="rtl"');
  expect(semanticHtml).toContain('>React</bdi> یک کتابخانه جاوااسکریپت بسیار محبوب است.');

  await page.getByLabel('Dark theme').check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'فارسی' }).click();
  await expect(page.locator('main')).toHaveAttribute('lang', 'fa');
  await expect(page.locator('main')).toHaveAttribute('dir', 'rtl');
  const persianVersion = demoManifest.version
    .replaceAll('.', '٫')
    .replace(/\d/gu, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]!);
  await expect(page.locator('.eyebrow')).toHaveText(`BidiLens نسخهٔ ${persianVersion}`);
  await expect(page.locator('.corpus-panel .panel-title small')).toHaveText(
    `در هر ${corpusFixtures.length.toLocaleString('fa-IR')} نمونه جست‌وجو کنید و یکی را در محیط بارگذاری کنید.`
  );
  await expect(page.getByRole('button', { name: 'English' })).toBeVisible();
});
