<!-- SPDX-License-Identifier: Apache-2.0 -->
# Choosing a Bidi Library: BidiLens vs Alternatives

A practical guide to when to use `@bidilens/*` vs `direction`, `bidi-js`, or native `dir="auto"`.

---

## Quick Decision Tree

```
Do you need bidirectional text handling?
├── No — my app is 100% LTR (English, code-only)
│   └── You don't need any library. Use plain HTML elements.
│
├── Yes — I just need to know if text is RTL or LTR
│   ├── Simple detection only (first-strong heuristic)
│   │   └── Use `direction` (npm: direction, ~1M weekly DL, 20 LOC, 0 deps)
│   └── Need detection + why (evidence, confidence, per-paragraph)
│       └── Use `@bidilens/core` — analyzeText() returns direction + evidence + confidence
│
├── Yes — I need to RENDER mixed RTL/LTR text correctly
│   ├── Just set dir on a container (browser handles the rest)
│   │   └── Use dir="auto" on the container element. Works for homogeneous text.
│   │       Known issues: punctuation drift, code block direction inheritance,
│   │       streaming layout jumps, no per-paragraph direction in one block.
│   │
│   ├── Need correct inline isolation (code, URLs, numbers within RTL prose)
│   │   └── Use `@bidilens/react` / `@bidilens/vue` / `@bidilens/html` / `@bidilens/svelte`
│   │       Wraps LTR tokens in <bdi dir="ltr">, sets dir per block,
│   │       handles punctuation boundaries and technical token syntax.
│   │
│   └── Need full visual glyph reordering (UAX #9 in canvas/terminal/raster)
│       └── Use `bidi-js` (npm: bidi-js, full UAX #9 reordering engine)
│
├── Yes — I'm streaming text (LLM chat UI, terminal output)
│   └── Use `@bidilens/core` (createBidiStream) — hysteresis direction-lock prevents
│       mid-stream layout jumps.
│
├── Yes — I need Trojan Source / bidi security detection
│   └── Use `@bidilens/core` (scanBidiSecurity) — scans for all 18 Unicode controls,
│       unclosed overrides, and directional spoofing.
│
└── Yes — I need Markdown/remark integration
    └── Use `@bidilens/markdown` — remark and markdown-it plugins that
        annotate AST nodes with dir attributes and isolate inline code.
```

---

## Feature Comparison Matrix

| Feature | `dir="auto"` | `direction` | `bidi-js` | `BidiLens` |
|---|:---:|:---:|:---:|:---:|
| Direction detection | Browser first-strong | First-strong heuristic | None | Content-majority + first-strong |
| Inline token isolation | None | None | None | Automatic (<bdi> for URLs, code, math) |
| Streaming hysteresis | None (layout jumps) | None | None | Multi-chunk hysteresis cache |
| Security scanner | None | None | None | 18 controls + Trojan Source audit |
| Framework components | None | None | None | React, Vue, Svelte, Web Component |
| Native SDKs | None | None | None | Swift iOS, Android Kotlin, C# .NET, Rust |
| Bundle size overhead | 0 KB | ~0.5 KB | ~12 KB | ~7 KB (core, zero-dependency) |
