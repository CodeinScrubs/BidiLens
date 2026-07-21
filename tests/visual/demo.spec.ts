import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { expectBidiBlock } from '../../packages/playwright/src/index.js';

const DEMO_ORIGIN = 'http://127.0.0.1:4173';
const FLAGSHIP = 'React یک کتابخانه جاوااسکریپت بسیار محبوب است.';
const SHARED = 'The Persian word کتاب means “book”.';

test('exercises the offline bilingual playground, controls, corpus, copy, and exports', async ({ page }) => {
  const initialHash = new URLSearchParams({ text: SHARED }).toString();
  await page.goto(`${DEMO_ORIGIN}/#${initialHash}`);

  const input = page.getByLabel('Input Markdown');
  const direction = page.locator('.metric').filter({ hasText: 'Direction' }).locator('strong');
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
  await expect(page.getByRole('button', { name: 'English' })).toBeVisible();
});
