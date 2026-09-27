Hi Open WebUI community — I maintain [BidiLens](https://github.com/CodeinScrubs/BidiLens), an MIT toolkit and fixture corpus for mixed-direction text. Sharing this as a renderer resource, not a claim that Open WebUI lacks RTL support.

I looked at your [MarkdownTokens.svelte](https://github.com/open-webui/open-webui/blob/main/src/lib/components/chat/Messages/Markdown/MarkdownTokens.svelte): headings and paragraphs already use `dir="auto"`. One useful extra case is a paragraph that begins with a Latin technical name but continues in RTL prose:

```text
React یک کتابخانه جاوااسکریپت بسیار محبوب است.
API هذا شرح باللغة العربية.
This paragraph quotes سلام and should remain LTR.
```

HTML auto direction uses the first strong character. An optional content-majority policy can help the first two cases when the author intends RTL; it is a heuristic, not a replacement for author intent or Unicode layout. An explicit Auto/LTR/RTL choice is still needed for ambiguous text.

The lowest-risk experiment would be one paragraph/list-item renderer, keeping your Marked token structure, code/URLs, sanitization and stored Markdown intact. Keep physical alignment independent, compare source-copy equality, and check streaming transitions plus narrow-width wrapping. No backend/model change or global RTL CSS is needed.

[Guide with before/after examples](https://github.com/CodeinScrubs/BidiLens/blob/v0.4.0/docs/MIXED_DIRECTION_TEXT.md) · [versioned corpus](https://github.com/CodeinScrubs/BidiLens/blob/v0.4.0/corpus/cases.json) · [limitations](https://github.com/CodeinScrubs/BidiLens/blob/v0.4.0/docs/LIMITATIONS.md).

Web packages are published at 0.4.0 and declare Node >=22.12.0. A fixtures-only/native implementation is also an option; I have not run an Open WebUI pilot or verified full application behavior. Would a small fixture contribution or optional-renderer example be useful?

Prepared with AI assistance; source paths and publication status checked before posting.
