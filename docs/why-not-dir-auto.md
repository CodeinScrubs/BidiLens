<!-- SPDX-License-Identifier: Apache-2.0 -->
# Why not `dir="auto"`?

> A side-by-side comparison of what `dir="auto"` gets wrong and what BidiLens gets right.

`dir="auto"` is the browser's built-in solution for mixed-direction text. It uses the first-strong-character rule from the Unicode Bidirectional Algorithm (UAX #9) to estimate the direction of a block. While convenient for simple homogeneous strings, it breaks down in several critical scenarios encountered in modern AI chat interfaces, technical documentation, and mixed-language applications.

---

## 1. English URL inside Persian/Arabic text

**Input:** `سایت ما را ببینید: https://example.com/api/v1 واقعا عالی است`

- **`dir="auto"`:** The browser sets the block direction to RTL (first strong character is Persian/Arabic). However, the inline URL is not isolated. Slashes, colons, dots, and trailing paths get pulled into RTL reordering, rendering the URL reversed, fragmented, or unclickable.
- **`BidiLens`:** Detects the paragraph as RTL, identifies technical tokens (URLs, paths, protocols), and wraps them in an isolated LTR `<bdi>` island. The URL renders left-to-right exactly as intended while the surrounding prose maintains natural RTL flow.

```html
<!-- Native dir="auto" -->
<div dir="auto">سایت ما را ببینید: https://example.com/api/v1 واقعا عالی است</div>

<!-- BidiLens -->
<div dir="rtl" data-bidilens-block>
  سایت ما را ببینید: <bdi dir="ltr" data-bidilens-isolate data-bidilens-kind="url">https://example.com/api/v1</bdi> واقعا عالی است
</div>
```

---

## 2. Technical Code Snippets and Commands

**Input:** `برای نصب پکیج دستور npm install @bidilens/core را اجرا کنید.`

- **`dir="auto"`:** Code tokens containing slashes, `@` symbols, flags, or CLI parameters interact unpredictably with adjacent neutral punctuation and whitespace.
- **`BidiLens`:** Automatically classifies shell commands, package names, identifiers, and flags as technical tokens, isolating them with proper LTR boundary markers.

---

## 3. Punctuation Spill and Exclamation Marks

**Input:** `This model is awesome! سلام` vs `سلام! Hello`

- **`dir="auto"`:** Exclamation marks, question marks, and parentheses are neutral characters (`ON` or `ES` in UAX #9). When placed at boundaries between LTR and RTL spans, neutral characters frequently jump to the opposite visual margin.
- **`BidiLens`:** Evaluates structural paragraph boundaries and run boundaries, preventing punctuation drift and ensuring sentence-ending punctuation adheres to the enclosing paragraph flow.

---

## 4. LLM Streaming Jitter and Mid-Stream Direction Flipping

**Scenario:** An LLM streams a response starting with an English greeting or code snippet (`Sure! Here is the response: ...`) followed by Persian or Arabic paragraphs.

- **`dir="auto"`:** As new tokens arrive, every DOM update causes the browser to re-evaluate the first strong character of the paragraph. If the initial token is English, the block begins LTR; when RTL text arrives or when introductory text is replaced, the entire layout violently snaps from left to right.
- **`BidiLens`:** The streaming engine (`BidiStreamSession`) employs directional hysteresis. It maintains paragraph-level state stability and prevents visual layout oscillation during token delivery.

---

## 5. Trojan Source and Hidden Bidirectional Overrides

- **`dir="auto"`:** Has zero security awareness. Attackers can embed invisible bidirectional controls (e.g., `U+202E` RLO, `U+2066` LRI) to visually alter code, URLs, or prompts while executing something entirely different.
- **`BidiLens`:** Includes an integrated Trojan Source security scanner (`scanBidiSecurity`) that inspects strings for unclosed overrides, directional spoofing, and dangerous control character combinations before rendering.

---

## Summary Matrix

| Feature / Behavior | Native `dir="auto"` | BidiLens |
|---|:---:|:---:|
| First-strong character detection | ✅ Yes | ✅ Yes (with majority weighting & tie-break) |
| Embedded URL & path isolation | ❌ No | ✅ Automatic `<bdi>` isolation |
| Technical token & CLI isolation | ❌ No | ✅ Comprehensive regex & boundary detection |
| Neutral punctuation stability | ⚠️ Prone to spill | ✅ Run-aware isolation |
| Streaming hysteresis (no jitter) | ❌ Layout jumps | ✅ Multi-chunk hysteresis cache |
| Trojan Source security scanner | ❌ None | ✅ 18 control types scanned & validated |
| Multi-framework adapters | ❌ DOM-only | ✅ React, Vue, Svelte, Web Component, iOS, Android, .NET, Rust |
