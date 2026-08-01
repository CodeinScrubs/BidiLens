# Frequently asked questions and troubleshooting

## Why not use `dir="auto"`?

HTML auto direction uses first-strong behavior. It sees the leading Latin word
in the flagship first and chooses LTR, even though the natural-language prose
is Persian-majority. BidiLens defaults to dominant non-technical content.

## Does BidiLens reverse strings?

No. Reversing strings breaks copy, search, selection, accessibility, combining
characters, and source diffs. BidiLens preserves logical source order and adds
direction/isolation structure only.

## What happens in an English-only application?

By default, nothing bidi-specific is added: no direction attribute, isolation
wrapper, BidiLens data marker, inline style, or Unicode control. This fast path
is disabled when RTL text or bidi formatting controls appear, or when the
content inherits RTL direction. Use `intervention: 'always'` only when stable
annotation of every block is an intentional integration requirement.

## Is this a replacement for Unicode UAX #9?

No. Browsers and operating systems still perform shaping and visual bidi
reordering. BidiLens selects the application-level block base and isolation
boundaries that those engines need.

## Why is a short technical-only block neutral?

Technical tokens are excluded from natural-language evidence. Supply an
inherited or explicit direction when a technical-only block needs a fixed base.

## Why did my custom CSS appear to undo the result?

Inspect ancestors for `direction`, `text-align: left/right`, or
`unicode-bidi: bidi-override`. BidiLens defaults use zero-specificity CSS so
authored class or inline alignment wins. Use `start` for content-relative
alignment, or deliberately use `left` when an RTL paragraph must remain on the
physical left. Do not apply a global RTL direction to code or
opposite-direction runs.

## Can Persian text stay left-aligned?

Yes. Paragraph direction controls character ordering; alignment controls where
the paragraph sits. Use `alignToContent = false` with a left-aligned Android
style, `textAlign="left"` or authored CSS on web adapters,
`BidiAlignment.physicalLeft` on Apple, or
`BidiAlignment.PhysicalLeft` on WPF. BidiLens still resolves and applies RTL
direction and inline isolation.

## Can I store the rendered HTML as model output?

Store the original source. Treat semantic HTML as a derived view so logging,
searching, prompts, diffs, and retransmission retain the exact logical string.

## Is raw Markdown HTML safe?

BidiLens does not sanitize arbitrary host HTML. Keep raw HTML disabled or pass
it through a separately maintained sanitizer. The HTML serializer escapes the
plain source it receives.

## Does the terminal adapter fix every terminal?

No. Emulator shaping and isolate support vary. The default mode is conservative
and does not insert hidden controls; compatibility controls are explicit.

## Why can CommonJS not `require()` the packages?

The JavaScript package line is ESM-only. Use ESM or dynamic `import()`. This
reduces conditional-export ambiguity but deliberately excludes synchronous
CommonJS.

## A sentence is classified incorrectly. What should I provide?

Provide the exact logical source, expected base direction, numbered words,
technical tokens, language/script, host renderer, and a minimal screenshot.
Add a corpus fixture and policy regression test; do not patch the stored order.

## Where are Android, Apple, Windows, Rust, Flutter, React Native, VS Code, Electron, and PDF?

Android core, Views, and Compose `0.1.1` are signed and public on Maven Central;
the sample and verification evidence are in the
[`android-v0.1.1` release](https://github.com/CodeinScrubs/BidiLens/releases/tag/android-v0.1.1).
Physical OEM/IME/TalkBack and external product validation remain open; see the
[Android guide](../android/README.md). A source Swift Package with a SwiftUI
`BidiText` renderer and UIKit adapters, plus a .NET 8/WPF implementation, now live in the
[Apple](../apple/README.md) and [Windows](../windows/README.md) guides. They
have build/corpus gates but are not registry-published or physical-device lab
validated. A source-native [Rust core](../rust/README.md) has generated Unicode
17 data, shared direction/isolation/security corpus tests, and three-OS CI, but
it is not published to crates.io and has no editor-specific adapter or adoption
claim. Flutter, React Native, WinUI, Windows Forms, MAUI, VS Code,
Electron, and PDF remain explicit [roadmap](ROADMAP.md) work.
