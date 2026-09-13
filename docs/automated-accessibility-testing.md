# Automated Accessibility Testing for Bidirectional Web Applications

## Overview

Automated accessibility testing with **axe-core** and **Pa11y** catches up to 50% of WCAG compliance violations before code reaches production.

---

## 1. Custom axe-core Rule: Missing Direction Attribute

Check that all major block-level containers in RTL locales declare an explicit `dir` attribute:

```ts
import axe from 'axe-core';

axe.configure({
  rules: [
    {
      id: 'bidi-explicit-direction',
      selector: 'article, section, main, [role="region"]',
      any: ['has-explicit-dir'],
      metadata: {
        description: 'Ensures container elements declare an explicit dir attribute',
        help: 'Container elements must have dir="ltr" or dir="rtl"'
      }
    }
  ],
  checks: [
    {
      id: 'has-explicit-dir',
      evaluate: (node) => node.hasAttribute('dir')
    }
  ]
});
```

---

## 2. Pa11y CI Configuration for RTL Pages

In `.pa11yci`:
```json
{
  "defaults": {
    "standard": "WCAG2AA",
    "runners": ["axe", "htmlcs"],
    "chromeLaunchConfig": {
      "args": ["--no-sandbox"]
    }
  },
  "urls": [
    "http://localhost:3000/fa/docs",
    "http://localhost:3000/ar/chat"
  ]
}
```
