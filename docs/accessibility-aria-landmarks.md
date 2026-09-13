# Bidirectional Web Accessibility & ARIA Guidelines

## Overview

Ensuring equal access for users of Right-to-Left (RTL) languages requires adhering to both **visual layout mirroring** and **assistive technology semantics**. When bidirectional content is incorrectly marked up, screen readers can mispronounce words, navigate in inverted sequences, or fail to announce dynamic updates.

This document outlines accessibility standards for BidiLens integrations conforming to **WCAG 2.2 Level AA**.

---

## 1. Semantic Isolation vs. Visual-Only CSS

### The Anti-Pattern: CSS `direction: rtl` without HTML Semantics
Applying `direction: rtl` via CSS styling without setting the HTML `dir="rtl"` attribute alters the visual painting on the screen, but assistive technologies (such as VoiceOver and NVDA) rely on the DOM tree's computed accessibility tree:

```html
<!-- ❌ BAD: Screen reader remains in LTR mode, mispronounces Arabic text -->
<div style="direction: rtl; text-align: right;">
  مرحبا بك في موقعنا
</div>

<!-- ✅ GOOD: Both visual engine and screen reader switch speech synthesis voices -->
<div dir="rtl" lang="ar">
  مرحبا بك في موقعنا
</div>
```

> **Rule:** Always emit `dir="rtl"` on the HTML element. BidiLens components (`BidiText`, `renderBidiHtml`, etc.) always generate semantic HTML attributes.

---

## 2. Using `<bdi>` for Untrusted or Mixed-Direction Names

When rendering user names, filenames, or technical strings whose direction is unknown at template render time:

```html
<!-- ✅ Screen reader maintains correct utterance boundaries -->
<li dir="rtl">
  کاربر <bdi>John_Doe_99</bdi> به گروه پیوست.
</li>
```

Without `<bdi>`, underscores or trailing digits in the username leak into the Persian sentence, causing the screen reader to read:
`"کاربر John Doe به گروه پیوست 99"`.

---

## 3. Dynamic Streaming Updates in Live Regions

For AI chat interfaces and streaming token displays:

```html
<div
  role="log"
  aria-live="polite"
  aria-atomic="false"
  dir="rtl"
  lang="fa"
>
  <p dir="rtl">پاسخ در حال تولید است...</p>
</div>
```

### Guidelines:
1. **Set `aria-atomic="false"`:** Screen readers should announce newly arrived tokens without re-reading the entire conversation from the beginning.
2. **Lock paragraph direction early:** Avoid flipping `dir` on an active paragraph while a screen reader is actively reading it.

---

## 4. Keyboard Navigation: Logical vs. Physical Keys

Under an RTL reading context:
- **Tab Key:** Advances focus logically through the reading sequence (Right-to-Left, Top-to-Bottom).
- **Arrow Keys:**
  - Left Arrow (←) moves forward in text reading order in RTL.
  - Right Arrow (→) moves backward in text reading order in RTL.
- **Home / End Keys:**
  - Home moves to the line start (the right margin).
  - End moves to the line end (the left margin).

---

## WCAG 2.2 Checklists

| Criterion | Level | Requirement | BidiLens Compliance |
|---|---|---|---|
| **1.3.1 Info and Relationships** | A | Structure conveyed through presentation is programmatically determined | Emits `dir` and `<bdi>` attributes |
| **1.3.2 Meaningful Sequence** | A | Reading order matches programmatic DOM order | Does not reorder DOM nodes; relies on UAX #9 |
| **3.1.2 Language of Parts** | AA | Human language of each passage can be programmatically determined | Supports granular `lang` attribute emission |
