# Frequently asked questions and troubleshooting

## Why not use `dir="auto"`?

HTML auto direction uses first-strong behavior. It sees the leading Latin word
in the flagship first and chooses LTR, even though the natural-language prose
is Persian-majority. BidiLens defaults to dominant non-technical content.

## Does BidiLens reverse strings?

No. Reversing strings breaks copy, search, selection, accessibility, combining
characters, and source diffs. BidiLens preserves logical source order and adds
direction/isolation structure only.

## Is this a replacement for Unicode UAX #9?

No. Browsers and operating systems still perform shaping and visual bidi
reordering. BidiLens selects the application-level block base and isolation
boundaries that those engines need.

## Why is a short technical-only block neutral?

Technical tokens are excluded from natural-language evidence. Supply an
inherited or explicit direction when a technical-only block needs a fixed base.

## Why did my custom CSS appear to undo the result?

Inspect ancestors for `direction`, `text-align: left/right`, or
`unicode-bidi: bidi-override`. Prefer `text-align: start` and do not apply a
global RTL direction to code or opposite-direction runs.

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

The 0.1.0 candidate is ESM-only. Use ESM or dynamic `import()`. This reduces
conditional-export ambiguity but deliberately excludes synchronous CommonJS.

## A sentence is classified incorrectly. What should I provide?

Provide the exact logical source, expected base direction, numbered words,
technical tokens, language/script, host renderer, and a minimal screenshot.
Add a corpus fixture and policy regression test; do not patch the stored order.

## Where are Android, Flutter, Swift, React Native, VS Code, Electron, and PDF?

They are not shipped. They remain explicit [roadmap](ROADMAP.md) work because
empty platform folders would create false confidence.
