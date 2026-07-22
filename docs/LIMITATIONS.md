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

The scanner identifies suspicious structure, not malicious intent. It does
not implement whole-script confusable analysis or language-specific source
parsing.

## Validation boundaries

- the corpus contains broad authored template matrices, but currently records
  zero native-speaker-certified templates;
- the automated accessibility checks do not replace screen-reader laboratory
  testing;
- visual snapshots cover three browser engines but only the committed test
  fixtures and test environment;
- Android, Flutter, React Native, SwiftUI, Electron, VS Code, and PDF packages
  are not implemented in this repository;
- no external security audit or downstream production pilot has occurred;
- source is public on GitHub, but no npm package or production deployment is
  claimed.

## Compatibility

The automatic LTR fast path is context-sensitive, not a universal promise that
English never receives metadata. English under an RTL parent must establish an
LTR base. DOM integrations can inspect ancestors; SSR/framework callers should
pass `inheritedDirection="rtl"` when that context is not otherwise visible.
Explicit `intervention: 'always'` also disables the fast path by design.

DOM ownership is determined from observable attribute/property changes. A
same-value inline-style assignment made while BidiLens already owns that exact
value cannot be distinguished from no assignment; call `restoreBidi()` before
intentionally transferring ownership of such a property to application code.

Public packages are ESM-only. CommonJS consumers must use dynamic `import()`
or an ESM bridge. Node.js 22.12 is the declared minimum. React 18–19, Vue 3.5+, and
Svelte 4–5 are the tested/declarative peer families; older or future majors are
not implied.
