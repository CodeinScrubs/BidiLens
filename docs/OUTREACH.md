# Maintainer outreach kit

BidiLens web `0.3.3` and signed Android `0.1.2` are published for source review
and bounded pilots. Android has emulator and public-consumer evidence;
physical-device/OEM/IME/TalkBack and production validation remain pending.
Neither availability is evidence of adoption. Contact maintainers with one
concrete renderer and one reproducible failure rather than a request to replace
every bidi layer at once.

The dated [public outreach log](OUTREACH_LOG.md) records actual submissions,
deliberate deferrals, state vocabulary, and the follow-up policy. Do not copy a
template into unrelated repositories or treat an open thread as adoption.

## Suggested subject

Mixed Persian/English AI output: tested application-level bidi toolkit for a
small renderer pilot

## Email template

Hello [team or maintainer],

I maintain [BidiLens](https://github.com/CodeinScrubs/BidiLens), an MIT-licensed
TypeScript and Android toolkit with SwiftUI/UIKit and .NET/WPF source adapters
for mixed RTL/LTR AI messages. It fixes a common failure in which a technically
named sentence such as `React یک کتابخانه … است.` receives the wrong paragraph
direction, while leaving ordinary LTR content free of BidiLens attributes,
wrappers, styles, or source changes.

The repository includes Unicode 17-derived classification, per-block direction,
semantic isolation, streaming reconciliation, bidi-control auditing, adapters
for major web renderers, native Kotlin/Views/Compose modules, compiler-tested
SwiftUI/UIKit and .NET/WPF adapters, 932 direction fixtures, three-browser
tests, and Android/iOS simulator tests. Twelve public npm packages include provenance;
three signed Maven Central modules, source-only Apple/Windows distribution, and
missing external validation are documented explicitly.

Would you be open to reviewing a small, reversible pilot in [specific renderer
or component]? I can provide a focused integration patch and host-specific
fixtures; no data migration or model-output rewriting is required.

Thank you,
[name]

## Links to include

- Problem and quick start: [README](../README.md)
- Published packages: [`@bidilens` on npm](https://www.npmjs.com/org/bidilens)
- Versioned web release: [`v0.3.3` on GitHub](https://github.com/CodeinScrubs/BidiLens/releases/tag/v0.3.3)
- Versioned Android release: [`android-v0.1.2` on GitHub](https://github.com/CodeinScrubs/BidiLens/releases/tag/android-v0.1.2)
- Native Android integration: [Android guide](../android/README.md)
- Apple integration: [SwiftUI/UIKit guide](../apple/README.md)
- Windows integration: [.NET/WPF guide](../windows/README.md)
- Exact boundaries: [Limitations](LIMITATIONS.md)
- Pilot and rollback criteria: [Adoption strategy](ADOPTION.md)
- Architecture and threat model: [Architecture](ARCHITECTURE.md) and
  [Security](SECURITY.md)
- Reproducible package/release gate: [Publishing checklist](PUBLISHING.md)
- Public CI history: [GitHub Actions](https://github.com/CodeinScrubs/BidiLens/actions)

## Reviewer fast path

```bash
npm install --global corepack@0.34.1
corepack enable
pnpm install --frozen-lockfile
pnpm run check
pnpm run test:visual
pnpm run release:check
```

For an initial web review, install `@bidilens/core@0.3.3`; for Android, use one
exact `io.github.codeinscrubs.bidilens:*:0.1.2` coordinate. Ask for confirmation
of the host bug, feedback on the API boundary, or permission to prepare a small
draft pull request. Do not claim universal rendering, zero defects,
native-platform coverage beyond the documented Android, SwiftUI/UIKit, and WPF
surfaces, physical Apple/Windows validation, adoption, or company endorsement.
Registry availability is verifiable, but adoption is not. Browser/OS layout
engines still perform
Unicode reordering and shaping; BidiLens supplies the application structure and
policy they need.

## Pilot scope

The lowest-risk pilot is one web message component behind a feature flag. Run
analysis in shadow mode first, compare logical copy/source equality, enable
semantic markup for mixed messages, measure UI-thread cost, and retain a
one-commit rollback. Require native-language and accessibility review before a
broad rollout.
