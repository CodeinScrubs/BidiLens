# Internationalization (i18n) Best Practices for Bidirectional Applications

## Introduction

Building a world-class application that supports both Left-to-Right (LTR) languages (English, French, Spanish) and Right-to-Left (RTL) languages (Arabic, Persian, Hebrew, Urdu) requires a cohesive strategy encompassing translation management, CSS architecture, and dynamic content handling.

---

## 1. CSS Logical Properties

Never use directional physical properties (such as `margin-left`, `padding-right`, or `float: left`) in modern applications. Always use **CSS Logical Properties**:

| Deprecated Physical Property | Modern CSS Logical Equivalent |
|---|---|
| `margin-left` | `margin-inline-start` |
| `margin-right` | `margin-inline-end` |
| `padding-left` | `padding-inline-start` |
| `padding-right` | `padding-inline-end` |
| `left: 10px` | `inset-inline-start: 10px` |
| `right: 10px` | `inset-inline-end: 10px` |
| `text-align: left` | `text-align: start` |
| `border-left` | `border-inline-start` |

---

## 2. Parameterized Translation Strings

### The Problem
When dynamic variables (such as user names, numbers, or brand names) are interpolated into translations, neutral boundaries can cause the variable to jump to the wrong side of adjacent punctuation:

```json
// en.json
"welcome": "Welcome, {name}!"

// fa.json (Naive)
"welcome": "خوش آمدید، {name}!"
```
If `{name}` is `"Alice"`, the exclamation mark can flip between `Alice` and the Persian greeting.

### The Solution: Isolate Variables
Use BidiLens inline isolation or wrap dynamic placeholders in `<bdi>`:
```tsx
import { BidiText } from '@bidilens/react';

function Greeting({ username }: { username: string }) {
  return (
    <p dir="rtl">
      خوش آمدید، <bdi>{username}</bdi>!
    </p>
  );
}
```

---

## 3. Font Stacks by Script

Do not rely on a single global font family. Arabic and Persian scripts require specialized fonts with OpenType cursive features:

```css
:root {
  --font-latin: 'Inter', system-ui, -apple-system, sans-serif;
  --font-arabic: 'Vazirmatn', 'Noto Sans Arabic', system-ui, sans-serif;
  --font-hebrew: 'Heebo', 'Noto Sans Hebrew', system-ui, sans-serif;
}

[dir="rtl"][lang="fa"],
[dir="rtl"][lang="ar"] {
  font-family: var(--font-arabic);
}

[dir="rtl"][lang="he"] {
  font-family: var(--font-hebrew);
}
```
