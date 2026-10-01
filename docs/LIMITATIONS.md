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

The core live stream is also provisional: adversarial overlaps between `$`,
environment identifiers, escapes, and incomplete math can differ from the batch
policy before `finish()`. Repeated ambiguity can trigger exact rescans and
quadratic behavior; there is no universal linear-time streaming guarantee.
An open `\[...\]` display span uses exact analysis at observable push
boundaries because its unfinished contents can contain independent URLs,
paths, or acronyms. Long unclosed spans with character-sized chunks can incur
quadratic total work too. Recognition is not a TeX parser or math renderer.
Use completed paragraph results for authoritative classification and bound or
batch untrusted streams. See the [external-review record](EXTERNAL_REVIEW_2026_09.md).

Unicode classification covers scripts through generated data, but classification
is not a language-quality certification. The current corpus has no dedicated
`sd`, `syr`, `dv`, or `yi` tagged fixtures (Sindhi, Syriac, Divehi/Thaana, Yiddish).
Native-speaker-authored mixed-language examples and review are still needed;
inventing translations or relabeling existing examples would not close that gap.

## Validation boundaries

The current audit branch is not a production certification. The JavaScript
core now validates full extended-grapheme rules against pinned Unicode 17
vectors; native engines currently retain combining marks but do not yet share
those full rules. Do not infer equivalent native cluster boundaries from the
common direction corpus. UIKit multi-paragraph bases/restoration and marked
composition remain open audit repairs. Plain Android Views and WPF
`TextBlock`/`TextBox` adapters use a whole-control base; independent paragraph
policies require a supported paragraph renderer (Compose or WPF documents).

Rich-text isolation spans eligible formatting nodes only when their boundaries
are representable without cloning a partial formatting element. Authored bidi,
code, explicit-direction, and block boundaries are kept separate. An unsupported
partial cross-element token remains unwrapped instead of changing source or
extending the isolate over unrelated prose.

SARIF output rejects symlink/junction parents and replaces the destination
atomically, avoiding truncation through an existing hard link. Portable
pathname APIs cannot eliminate a race against a hostile process concurrently
replacing parent directories; use a trusted workspace for Action outputs.

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
- Swift and .NET source now implement the web scanner's control inventory,
  paragraph-balance and hidden-character rule set; shared differential fixtures
  check codes, severities, inventory, dual offsets, and mode decisions. This is
  not language-aware Trojan Source parsing, confusable analysis, native SARIF
  export, or security certification; see [native security](NATIVE_SECURITY.md);
- SwiftUI has a UIKit-backed read-only `BidiText` renderer. Generic editable
  SwiftUI integration remains unclaimed until marked-text composition,
  dictation, selection, and third-party IMEs have dedicated validation;
- WinUI 3, Windows Forms, MAUI, Flutter, React Native, Electron, VS Code, and
  PDF adapters are not implemented;
- no external security audit or downstream production pilot has occurred;
- source and all 12 JavaScript packages are public, but no downstream
  production deployment or company adoption is claimed.

Public issues, discussions, and integration pull requests are listed in the
[outreach log](OUTREACH_LOG.md). Native contributions merged in Streamdown and
CoderAI; these merges and the remaining open submissions do not prove that any
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
base. Defaults vary by adapter: React, Vue, and the DOM helper stylesheet
inherit host alignment in the unreleased source repairs; native adapters can
use content-relative `start`. Set alignment explicitly when the host contract
requires a particular physical edge. BidiLens does not mirror an entire
screen or override unrelated layout containers.

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
Android Views, `BidiUIKit.restore(...)` on UIKit labels or editable controls, or
`BidiWpf.Restore(control)` on WPF. WPF uses binding-preserving dependency
property updates; the application binding remains attached while BidiLens is
active and after restoration.

UIKit exposes editable base direction through a text position, so that value
can change when the text changes even without a property handoff. BidiLens
therefore adopts an observable UIKit direction change only while the source is
unchanged. Call `BidiUIKit.restore(...)` before replacing both text and its
authored direction.

When a UILabel's source changes during an active intervention, UIKit may carry
its paragraph properties into the replacement text. Restoration uses the new
text's ranges and changes only direction/alignment values that still match
BidiLens's last application. A uniform original paragraph direction can be
restored; mixed original directions cannot be mapped onto new text and fall
back to natural direction. Host-supplied different values remain intact.

Public packages are ESM-only. CommonJS consumers must use dynamic `import()`
or an ESM bridge. Node.js 22.12 is the declared minimum. React 18–19, Vue 3.5+, and
Svelte 4–5 are the tested/declarative peer families; older or future majors are
not implied.
