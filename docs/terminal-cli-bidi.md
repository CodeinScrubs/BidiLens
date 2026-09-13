# Bidirectional CLI Tools & Terminal ANSI Sequences

## Overview

Terminal emulators historically assumed a strictly Left-to-Right, monospaced character grid. In recent years, modern terminal emulators (such as Windows Terminal and iTerm2) have adopted partial or complete support for Unicode bidirectional text.

---

## 1. Terminal Support Matrix

| Terminal Emulator | Platform | Bidi Reordering | Cursive Shaping | Notes |
|---|---|---|---|---|
| **Windows Terminal** | Windows 10/11 | Full | Full (DirectWrite) | Native UAX #9 support |
| **iTerm2** | macOS | Partial | Partial | Requires bidi setting enabled |
| **Alacritty** | Cross-platform | Limited | None | Relies on external bidi filter |
| **GNOME Terminal** | Linux | Full | Full (VTE / HarfBuzz) | Standard on modern Linux |

---

## 2. Formatting Tabular CLI Data

When printing tables in CLI tools targeting Arabic or Persian users:

```
┌───────────┬──────────────┬─────────────┐
│ وضعیت     │ نام کاربر    │ شناسه       │
├───────────┼──────────────┼─────────────┤
│ فعال      │ علی رضایی    │ 1042        │
│ معلق      │ سارا مرادی   │ 1043        │
└───────────┴──────────────┴─────────────┘
```

### Key Rules:
1. Pad column widths based on **visual display width** (using `string-width` packages), not UTF-8 byte length or string length.
2. Persian and Arabic characters occupy standard terminal column widths, but diacritics occupy 0 width.
