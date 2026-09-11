# Testing Bidirectional Web Applications: A Complete Guide

## Introduction

Testing bidirectional (bidi) web applications requires verifying both **logical behavior** (direction detection, token isolation, security) and **visual presentation** (layout mirroring, icon alignment, punctuation anchoring).

---

## 1. Unit Testing with Vitest

Test direction detection and inline isolation logic directly:

```ts
import { describe, expect, it } from 'vitest';
import { detectDirection, planInlineIsolation } from '@bidilens/core';

describe('bidi logic', () => {
  it('detects technical Persian sentences as RTL', () => {
    const input = 'دستور pnpm install را اجرا کنید.';
    expect(detectDirection(input)).toBe('rtl');
    
    const isolations = planInlineIsolation(input, 'rtl');
    expect(isolations).toEqual([
      expect.objectContaining({ text: 'pnpm install', direction: 'ltr' })
    ]);
  });
});
```

---

## 2. End-to-End Testing with Playwright

Use Playwright to test rendered DOM attributes and computed styles:

```ts
import { test, expect } from '@playwright/test';

test('renders RTL message bubble correctly', async ({ page }) => {
  await page.goto('/chat');
  
  // Submit a Persian prompt
  await page.fill('#prompt-input', 'سلام! چطور می‌توانم کمک کنم؟');
  await page.click('#send-button');

  const bubble = page.locator('.message-bubble').last();
  
  // Assert semantic dir attribute
  await expect(bubble).toHaveAttribute('dir', 'rtl');
  
  // Assert computed text alignment
  const textAlign = await bubble.evaluate((el) => window.getComputedStyle(el).textAlign);
  expect(textAlign).toBe('right');
});
```

---

## 3. Visual Regression Testing

Visual snapshots ensure CSS changes do not inadvertently break flipped layout margins:

```ts
test('visual snapshot matches RTL layout', async ({ page }) => {
  await page.goto('/dashboard?lang=ar');
  await expect(page).toHaveScreenshot('dashboard-arabic.png');
});
```
