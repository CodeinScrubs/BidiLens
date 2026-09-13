# Bidirectional Clipboard Operations & Rich Text Editors

## Introduction

Copy-pasting bidirectional text between web browsers, code editors, and word processors is fraught with hidden hazards. Users often inadvertently copy invisible bidi controls, or paste text whose direction conflicts with the receiving document.

---

## 1. The Logical Copy Rule

The HTML standard and UAX #9 dictate that **copying text must always copy characters in logical memory order**, never visual display order.

When rendering isolated tokens with BidiLens:
- Prefer semantic HTML tags (`<bdi>`, `<span dir="...">`) over raw Unicode bidi controls (`LRI`, `RLI`, `PDI`).
- Screen selection across `<bdi>` boundaries produces clean logical Unicode when pasted into standard text editors.

---

## 2. Sanitizing Clipboard Ingestion

When users paste external content into a rich text editor or comment box:

```ts
import { scanBidiSecurity, sanitizeBidiControls } from '@bidilens/core';

function handlePaste(event: ClipboardEvent) {
  const rawText = event.clipboardData?.getData('text/plain') ?? '';
  const audit = scanBidiSecurity(rawText);

  if (audit.hasBidiControls) {
    event.preventDefault();
    // Strip malicious or extraneous bidi formatting controls
    const cleanText = sanitizeBidiControls(rawText);
    document.execCommand('insertText', false, cleanText);
  }
}
```

---

## 3. Integration with ProseMirror and Lexical

In ProseMirror / TipTap:
- Register a custom Node or Mark attribute for `dir`.
- Attach an auto-detection plugin that calls `detectDirection(node.textContent)` on block mutation.
