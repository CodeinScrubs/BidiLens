I reviewed the added RTL CSS and have a few concrete suggestions before this lands:

1. `direction: auto !important` is not valid CSS (`direction` accepts `ltr`/`rtl` or CSS-wide keywords). The HTML `dir="auto"` attribute is the native first-strong mechanism. See the [CSS direction reference](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/direction#syntax).
2. The new `html[dir="rtl"] div/span/button/...` rule applies `unicode-bidi: plaintext` and `text-align: start !important` broadly. It can override deliberate left/center/right alignment on unrelated controls. Scope text behavior to message paragraphs/list items/table cells; keep layout localization and physical alignment separate.
3. Content in an English UI still needs its own direction. These rules only activate under an RTL root, so please include English UI + Persian/Arabic messages in acceptance testing.
4. First-strong auto direction does not mean every mixed paragraph gets its intended base. Test a Latin-name-first RTL paragraph alongside an English paragraph containing one RTL word:

```text
React یک کتابخانه جاوااسکریپت بسیار محبوب است.
API هذا شرح باللغة العربية.
This paragraph quotes سلام and should remain LTR.
```

For the first two, an explicit author/user override or an optional content-majority policy may be appropriate. Neither inference policy is universally correct. Keep code and URLs isolated and check source-copy equality, streaming changes, narrow wrapping and both UI locales.

Disclosure: I maintain [BidiLens](https://github.com/CodeinScrubs/BidiLens). Its [native-first guide](https://github.com/CodeinScrubs/BidiLens/blob/v0.4.0/docs/MIXED_DIRECTION_TEXT.md) and [versioned corpus](https://github.com/CodeinScrubs/BidiLens/blob/v0.4.0/corpus/cases.json) may help with the tests; a native fix is fine and no dependency is required. Web packages are published at 0.4.0 with a declared Node >=22.12.0 floor, which must be checked against the host before proposing installation.

This feedback was prepared with AI assistance and verified against this PR's CSS diff; I have not built or run Chatbox, so this is not a full-app regression certification.
