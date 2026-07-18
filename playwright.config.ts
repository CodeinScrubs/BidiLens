import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/visual',
  timeout: 30_000,
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.02
    }
  },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{arg}{ext}',
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ]
});
