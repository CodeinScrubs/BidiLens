Hello Translate You community — I maintain [BidiLens](https://github.com/CodeinScrubs/BidiLens), an MIT toolkit for source-preserving mixed-direction text, including Kotlin/Compose. Sharing a resource rather than reporting an unverified app bug.

Your [StyledTextField](https://github.com/you-apps/TranslateYou/blob/master/app/src/main/java/com/bnyro/translate/ui/components/StyledTextField.kt) already sets `TextDirection.Content`. That is a sensible native baseline, and I would not replace it globally.

One optional policy to investigate is Latin technical names followed by mostly RTL prose:

```text
React یک کتابخانه جاوااسکریپت بسیار محبوب است.
API هذا شرح باللغة العربية.
This sentence contains سلام but remains English.
```

First-strong direction and content-majority direction answer different questions. A user override or bounded majority policy may help when the intended base differs from the first word, but automatic inference is not always right. A translator also knows the selected/detected language, which may be preferable to inference when reliable.

Our [Android guide](https://github.com/CodeinScrubs/BidiLens/blob/v0.4.0/android/README.md) documents native core/Views/Compose modules published on Maven Central at 0.1.2. The [shared corpus](https://github.com/CodeinScrubs/BidiLens/blob/v0.4.0/corpus/cases.json) can also be used without installing our library. Direction and physical alignment are separate; copying/sharing should use the original logical source, not a visually reordered string.

The smallest useful contribution might be fixtures for editable source, read-only translation, and history, including English text in an RTL UI and Persian/Arabic digits. I have not tested Translate You on a device. Our emulator/package evidence does not establish OEM keyboard, IME, TalkBack or production correctness.

Would a fixtures-only contribution be useful, or do the existing tests already cover these cases? No new dependency or global layout change is proposed without your agreement.

Prepared with AI assistance; your current content-direction setting was checked before posting.
