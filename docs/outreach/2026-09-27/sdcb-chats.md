Hi Chats maintainers and users. I maintain [BidiLens](https://github.com/CodeinScrubs/BidiLens), an MIT toolkit for mixed RTL/LTR messages. Chats' React Markdown frontend seems like a relevant place to share it; this proposal does not change your .NET AI gateway or model providers.

I reviewed the [Markdown renderer](https://github.com/sdcb/chats/blob/main/src/FE/components/Markdown/MarkdownRenderer.tsx) and [memoized React Markdown wrapper](https://github.com/sdcb/chats/blob/main/src/FE/components/Markdown/MemoizedReactMarkdown.tsx). A useful optional pilot is per-paragraph direction at that render boundary, including mixed Persian, Arabic and Hebrew output in a Chinese/English UI.

For example:

```text
React یک کتابخانه جاوااسکریپت بسیار محبوب است.
API זה הסבר בעברית.
This paragraph quotes سلام and should remain LTR.
```

The first two can be intended as RTL prose despite their Latin first word. `dir="auto"` chooses the first strong character; an optional majority policy or user direction override serves a different need. BidiLens supplies that application policy and semantic isolation, not a replacement for browser Unicode reordering/shaping.

The [0.4.0 web release](https://github.com/CodeinScrubs/BidiLens/releases/tag/v0.4.0) includes React/Markdown tools; npm packages declare Node >=22.12.0, so a dependency needs a runtime/build compatibility check first. Alternatively, use the [versioned corpus](https://github.com/CodeinScrubs/BidiLens/blob/v0.4.0/corpus/cases.json) for a native implementation. Our .NET/WPF source is **not** an Avalonia adapter or published NuGet package, and is not needed for this web frontend.

I would start with one feature-flagged message component: preserve Markdown/math/code and original copy text, leave pure-LTR content in an LTR scope unchanged, measure streaming rendering cost, and keep rollback trivial. This is a review invitation, not a reproduced Chats defect or completed integration.

Would host-native tests or a small opt-in example be useful? [Limitations and review boundaries](https://github.com/CodeinScrubs/BidiLens/blob/v0.4.0/docs/LIMITATIONS.md).

Prepared with AI assistance; the cited frontend sources and published versions were checked.
