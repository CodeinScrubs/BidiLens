# Right-to-Left (RTL) Localization QA & Inspection Guide

## Overview

This guide provides a systematic quality assurance (QA) inspection protocol for verifying bidirectional user interfaces before production release.

---

## The 25-Point RTL Inspection Checklist

### 1. Direction & Alignment
- [ ] Paragraphs in Arabic/Persian/Hebrew are right-aligned (`text-align: start`).
- [ ] Trailing punctuation marks (periods, question marks, exclamation marks) rest on the left margin.
- [ ] English code snippets (`npm install`, URLs) remain Left-to-Right without letter reversal.
- [ ] Multi-line sentences do not break in the middle of a cursive word cluster.

### 2. Form Controls
- [ ] Input labels align to the right margin.
- [ ] Email, URL, phone number, and password fields maintain `dir="ltr"` for input.
- [ ] Form input clear buttons (X) anchor to the left margin.
- [ ] Form error messages align to the right and display icons on the right side of text.

### 3. Navigation & Mirrored Components
- [ ] Main navigation items flow from right to left.
- [ ] Breadcrumb navigation arrows point to the left (`Home ← Settings ← Profile`).
- [ ] Drawer menus and sidebar navigation slide in from the right edge.
- [ ] Pagination previous/next chevrons are reversed.

### 4. Media & Icons
- [ ] Video/audio player controls (Play, Pause, Progress Bar) remain Left-to-Right.
- [ ] Directional icons (back arrows) are flipped.
- [ ] Symmetrical icons and brand logos are NOT flipped.

### 5. Assistive Technology & Copying
- [ ] VoiceOver / NVDA screen reader reads paragraphs in the correct sentence order.
- [ ] Selecting and copying text from the browser pastes clean logical text without reversed characters.
- [ ] Embedded bidi controls are sanitized to prevent Trojan Source vulnerabilities.

---

## Pseudo-Localization for Bidirectional Readiness

Before translated strings are available, test UI components using **Pseudo-RTL**:
- Prepend `[!!! ` and append ` !!!]` to test boundaries.
- Add Arabic/Hebrew strong characters to Latin text to test mixed-script layouts:
  ```
  [!!! ‮Welcome to your account‬ !!!]
  ```
