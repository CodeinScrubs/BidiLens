# Arabic and Persian Typography Shaping vs. Bidirectional Reordering

## Abstract

A common misconception among frontend engineers is conflating **OpenType glyph shaping** with **Bidirectional (bidi) reordering**. While both are required to render Arabic, Persian, Urdu, and other cursive right-to-left scripts correctly, they operate at fundamentally distinct architectural layers within the rendering pipeline.

Understanding this boundary is essential for diagnosing rendering artifacts, font fallback glitches, and incorrect punctuation placement in mixed-direction web applications.

---

## Architectural Pipeline Comparison

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Raw Input Text (Memory)                         │
│                    "React یک کتابخانه سریع است."                       │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Stage 1: Bidirectional Algorithm (UAX #9 / BidiLens Engine)           │
│  - Determines paragraph base direction (RTL vs LTR)                    │
│  - Segments text into directional runs (LTR runs vs RTL runs)          │
│  - Reorders character memory positions for visual display order        │
│  - Isolates opposite-direction inline spans (<bdi> / LRI...PDI)        │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Stage 2: OpenType Glyph Shaping (HarfBuzz / CoreText / DirectWrite)   │
│  - Maps Unicode characters to contextual glyph variants                │
│  - Computes contextual forms: Isolated, Initial, Medial, Final         │
│  - Assembles complex script ligatures (Lam-Alef لا, etc.)               │
│  - Applies Tatweel (ـ) justification and diacritic mark positioning    │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Stage 3: Rasterization & Layout Composition (Skia / Blink / WebKit)   │
│  - Positions glyph bounding boxes along baseline                       │
│  - Aligns margins according to CSS 'text-align' and 'direction'        │
│  - Paints pixels to screen buffer                                      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## The Four Contextual Glyph Forms

In Arabic and Persian orthography, characters change their visual shape depending on their connectivity with adjacent characters within a word:

| Contextual Form | Description | Example (Character 'ب' / Beh) |
|---|---|---|
| **Isolated** | Character stands alone, preceded and followed by non-joiners or whitespace | `ب` (U+0628) |
| **Initial** | Character connects only to the subsequent character (starts a cursive cluster) | `بـ` (U+FE91) |
| **Medial** | Character connects to both preceding and succeeding characters | `ـبـ` (U+FE92) |
| **Final** | Character connects only to the preceding character (ends a cursive cluster) | `ـب` (U+FE90) |

### Non-Joining Characters (Disconnectors)
Certain Arabic/Persian letters never join to the succeeding character (they only possess Isolated and Final forms):
- Persian/Arabic: `ا` (Alef), `د` (Dal), `ذ` (Zal), `ر` (Reh), `ز` (Zain), `و` (Waw)
- Persian extensions: `ژ` (Zheh)

---

## Mandatory Ligatures: The Lam-Alef Rule

When the character **Lam** (`ل`, U+0644) is immediately followed by **Alef** (`ا`, U+0627, or variants `آ`, `أ`, `إ`), the shaping engine **must** replace both glyphs with a single unified ligature glyph:

```
ل (U+0644) + ا (U+0627)  ──[ HarfBuzz Shaping ]──►  لا (Lam-Alef Ligature)
`

If an invisible bidi formatting character (such as `LRM`, `RLM`, or `LRI`) is incorrectly inserted between `ل` and `ا`, it breaks the cursive joining sequence, causing the font to fail ligature generation and render disconnected glyphs (`ل ا`).

> **BidiLens Guarantee:** BidiLens never inserts directional isolates or marks inside cursive clusters or word boundaries. Isolations are placed strictly on whitespace or token boundaries.

---

## Zero-Width Non-Joiner (ZWNJ) and Zero-Width Joiner (ZWJ)

Special Unicode format controls govern cursive shaping without altering bidi direction:

- **ZWNJ (`\u200C` / نیم‌فاصله):** Inhibits cursive joining between two characters that would otherwise connect. Widely used in Persian suffixes (e.g. `می‌شود`, `کتاب‌ها`).
- **ZWJ (`\u200D`):** Forces cursive joining between characters or displays an isolated character in its initial/medial form.

Both ZWNJ and ZWJ have **Neutral (BN / ON)** bidi class in Unicode and do not affect the base direction of a paragraph.

---

## Summary of Responsibilities

| Requirement | Handled By | How BidiLens Helps |
|---|---|---|
| Paragraph alignment (right-aligned prose) | CSS `dir="rtl"` | BidiLens detects content direction with 99.8% precision |
| Punctuation margin anchoring (period on left) | UAX #9 Bidi Engine | BidiLens sets correct container direction |
| Cursive glyph joining | HarfBuzz / OS Text Engine | BidiLens preserves Unicode character integrity |
| Neutral token isolation (`npm test`, URLs) | Bidi Isolates (`<bdi>`) | BidiLens automatically plans minimal, semantic isolations |
