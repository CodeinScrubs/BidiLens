# Unicode 16.0 & UAX #9 Standards Conformance

## Specification Overview

BidiLens implements and extends the formal recommendations defined in **Unicode Standard Annex #9: Unicode Bidirectional Algorithm (UAX #9)**, published by the Unicode Consortium for Unicode 16.0.

This document records the exact conformance guarantees, rule mappings, and algorithmic extensions provided by BidiLens.

---

## Complete Table of Unicode Bidirectional Controls

Unicode defines 18 dedicated bidirectional formatting controls across two major blocks (General Punctuation and Arabic Presentation):

| Abbreviation | Name | Code Point | Bidi Class | Type | Standard Scope |
|---|---|---|---|---|---|
| **ALM** | Arabic Letter Mark | `U+061C` | AL | Mark | Unicode 6.3+ |
| **LRM** | Left-to-Right Mark | `U+200E` | L | Mark | Unicode 1.1+ |
| **RLM** | Right-to-Left Mark | `U+200F` | R | Mark | Unicode 1.1+ |
| **LRE** | Left-to-Right Embedding | `U+202A` | LRE | Explicit Embedding (Deprecated) | Unicode 1.1+ |
| **RLE** | Right-to-Left Embedding | `U+202B` | RLE | Explicit Embedding (Deprecated) | Unicode 1.1+ |
| **PDF** | Pop Directional Format | `U+202C` | PDF | Explicit Pop (Deprecated) | Unicode 1.1+ |
| **LRO** | Left-to-Right Override | `U+202D` | LRO | Explicit Override | Unicode 1.1+ |
| **RLO** | Right-to-Left Override | `U+202E` | RLO | Explicit Override | Unicode 1.1+ |
| **LRI** | Left-to-Right Isolate | `U+2066` | LRI | Isolate Opener | Unicode 6.3+ |
| **RLI** | Right-to-Left Isolate | `U+2067` | RLI | Isolate Opener | Unicode 6.3+ |
| **FSI** | First Strong Isolate | `U+2068` | FSI | Isolate Opener | Unicode 6.3+ |
| **PDI** | Pop Directional Isolate | `U+2069` | PDI | Isolate Closer | Unicode 6.3+ |
| **ISS** | Inhibit Symmetric Swapping | `U+206A` | ON | State Control (Deprecated) | Unicode 1.1+ |
| **ASS** | Activate Symmetric Swapping | `U+206B` | ON | State Control (Deprecated) | Unicode 1.1+ |
| **IAFS** | Inhibit Arabic Form Shaping | `U+206C` | ON | State Control (Deprecated) | Unicode 1.1+ |
| **AAFS** | Activate Arabic Form Shaping | `U+206D` | ON | State Control (Deprecated) | Unicode 1.1+ |
| **NADS** | National Digit Shapes Digit | `U+206E` | ON | State Control (Deprecated) | Unicode 1.1+ |
| **NODS** | Nominal Digit Shapes Digit | `U+206F` | ON | State Control (Deprecated) | Unicode 1.1+ |

---

## UAX #9 Paragraph Level Determination

### Standard Rule P2
> In each paragraph, find the first character of type L, AL, or R while ignoring isolates. If such a character is found, its direction establishes the paragraph embedding level.

### The BidiLens Content-Majority Extension
In modern web applications, user messages and AI responses frequently begin with technical tokens (e.g. `npm`, `git`, `curl`, or URLs). Under strict Rule P2, a paragraph such as:
```
npm install را در ترمینال اجرا کنید.
```
resolves as LTR because `n` is the first strong character.

BidiLens enhances Rule P2 by computing a **weighted strong character majority** across the paragraph:
1. Tokenize technical identifiers, code literals, and URLs.
2. Calculate evidence counts:
   $$\text{Score}_{\text{RTL}} = \sum C_{\text{RTL}}$$
   $$\text{Score}_{\text{LTR}} = \sum C_{\text{LTR (prose)}}$$
3. Assign paragraph direction to `rtl` when $\text{Score}_{\text{RTL}} \ge \text{Score}_{\text{LTR}}$.
4. Isolate internal LTR technical tokens with `<bdi>` or `LRI...PDI`.

---

## Conformance Verification

BidiLens maintains a test corpus of **616 automated fixtures** spanning:
- Arabic, Persian, Hebrew, Urdu, Pashto, Sorani Kurdish, and Dhivehi (Thaana).
- Edge cases from Unicode Consortium UAX #9 BidiTest.txt and BidiCharacterTest.txt.
- Multi-byte UTF-8 sequences, astral plane emojis (SMP), and zero-width joiners.
