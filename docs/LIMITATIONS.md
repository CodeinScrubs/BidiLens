# Limitations

BidiLens fixes application-level direction and isolation structure. It does
not guarantee identical pixels across all hosts.

## Rendering boundaries

- browsers and operating systems still perform Unicode bidi reordering,
  shaping, font fallback, line breaking, selection, and cursor movement;
- proprietary chat surfaces cannot be changed unless they expose a DOM,
  renderer hook, or upstream integration point;
- terminals vary widely in isolate support and Arabic shaping;
- PDF engines can differ from browser layout and are not validated here;
- fonts can contain missing or incorrect glyph shaping;
- model grammar, translation, spelling, and source logical order are outside
  this toolkit's scope.

## Heuristic boundaries

`content-majority` is a deterministic application policy, not a language
detector. Domain-specific prose dominated by identifiers may need an explicit
direction or the `technicalIdentifiers` option. Very short or neutral blocks
use the configured fallback or inherited direction.

Separating an acronym from an emphasized word is decided by shape and block
context, not by a dictionary: a short all-capital token is treated as an
identifier unless capitals are the block's prose style. A block written only in
short all-capital words remains acronym-shaped by default; an uppercase prose
style requires at least one longer capitalized word. A hyphenated product name
whose segments are all outside the technical vocabulary counts as natural
language. Both boundaries are addressable with `technicalIdentifiers` or an
explicit direction.

The scanner identifies suspicious structure, not malicious intent. It does
not implement whole-script confusable analysis or language-specific source
parsing.

Rich Markdown streaming uses a caller-supplied Markdown-It instance. Live
direction state is updated after every push and reconciled to Markdown block
semantics at each rich revision, while AST/HTML/security revisions are
deliberately checkpointed by source growth and structural boundaries; inspect
`pendingSourceRange` before treating a
live `document` as current. `finish()` is the exact batch-equivalence boundary.
Unified/remark/rehype transforms remain supported as batch plugins, not as a
stateful unified streaming backend. The adapter source is built against
Markdown-It 15, and the compatibility matrix exercises representative
Markdown-It releases 13.0.2, 14.3.1, and 15.0.1 with packed strict TypeScript
consumers. The peer range covers 13.x, 14.x, and 15.x, but the matrix does not
claim every patch release. Markdown-It 15's host parser may
intentionally produce different linkification HTML because its upstream
`linkify-it` major changed, while BidiLens semantic block/isolation/security
reports remain equivalent. Other parser major versions are not a supported or
tested claim.

## Validation boundaries

- the corpus contains broad authored template matrices, but currently records
  zero native-speaker-certified templates;
- the automated accessibility checks do not replace screen-reader laboratory
  testing;
- visual snapshots cover three browser engines but only the committed test
  fixtures and test environment;
- native Android has JVM, Robolectric, and API 35/36 emulator evidence, but no
  physical-device OEM matrix, TalkBack lab, or downstream production pilot;
- the Swift core/UIKit/SwiftUI and .NET core/WPF implementations have
  shared-corpus and platform build gates, but no physical iOS device,
  VoiceOver, Windows screen-reader, IME matrix, registry release, or downstream
  production pilot;
- the native Rust core has shared-corpus and three-OS compiler gates, but no
  crates.io release, editor-specific adapter, independent audit, downstream
  product pilot, or claim of adoption by Zed or another Rust host;
- Swift and .NET currently inventory bidi controls and high-risk overrides,
  but do not yet claim parity with the richer JavaScript/Android
  balance-and-context security findings;
- SwiftUI has a UIKit-backed read-only `BidiText` renderer. Generic editable
  SwiftUI integration remains unclaimed until marked-text composition,
  dictation, selection, and third-party IMEs have dedicated validation;
- WinUI 3, Windows Forms, MAUI, Flutter, React Native, Electron, VS Code, and
  PDF adapters are not implemented;
- no external security audit or downstream production pilot has occurred;
- source and all 12 JavaScript packages are public, but no downstream
  production deployment or company adoption is claimed.

Public issues, discussions, and integration pull requests are listed in the
[outreach log](OUTREACH_LOG.md). One native implementation merged in Streamdown;
the remaining open submissions prove that review was requested, not that any
host adopted the BidiLens dependency, deployed it, or endorsed BidiLens.

## Compatibility

The automatic LTR fast path is context-sensitive, not a universal promise that
English never receives metadata. English under an RTL parent must establish an
LTR base. DOM integrations can inspect ancestors; SSR/framework callers should
pass `inheritedDirection="rtl"` when that context is not otherwise visible.
Explicit `intervention: 'always'` also disables the fast path by design.

Android Views hosts must declare `android:supportsRtl="true"`. BidiLens does
not inject that application-wide manifest flag because enabling it can mirror
unrelated layouts. Compose and Views preserve logical values, but final cursor,
font, shaping, OEM IME, and accessibility behavior remains Android-version and
device dependent.

Alignment and direction are separate policies. `physicalLeft`/`left` keeps
Persian or other RTL text on the left side while preserving an RTL paragraph
base. Content-relative `start` remains the default in most adapters. BidiLens
does not mirror an entire screen or override unrelated layout containers.

UIKit adapters preserve the source string and editable selection. Applying
paragraph style to a `UILabel` necessarily produces an attributed display
value, although its `.string` is unchanged. SwiftUI `BidiText` owns a private
UIKit label, does not alter the surrounding SwiftUI layout direction, and
restores its previous intervention before every update. WPF adapters preserve
`Text` and selection and restore the original
`FlowDirection`/`TextAlignment` when an intervention is no longer required.

Imperative adapter ownership is determined from observable property changes.
A same-value assignment made while BidiLens already renders that exact value
cannot be distinguished from no assignment. Before intentionally transferring
ownership, call `restoreBidi(root)` on the DOM, `view.restoreBidiLens()` on
Android Views, `BidiUIKit.restore(...)` on editable UIKit controls, or
`BidiWpf.Restore(control)` on WPF. WPF uses binding-preserving dependency
property updates; the application binding remains attached while BidiLens is
active and after restoration.

UIKit exposes editable base direction through a text position, so that value
can change when the text changes even without a property handoff. BidiLens
therefore adopts an observable UIKit direction change only while the source is
unchanged. Call `BidiUIKit.restore(...)` before replacing both text and its
authored direction.

Public packages are ESM-only. CommonJS consumers must use dynamic `import()`
or an ESM bridge. Node.js 22.12 is the declared minimum. React 18–19, Vue 3.5+, and
Svelte 4–5 are the tested/declarative peer families; older or future majors are
not implied.
