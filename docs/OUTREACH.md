# Maintainer outreach kit

BidiLens `0.2.0` is published for source review and bounded web pilots. Native
Android source modules are implemented and device-tested, with signed Maven
distribution and production validation still pending. Neither availability is
evidence of adoption. Contact maintainers with one concrete renderer and one
reproducible failure rather than a request to replace every bidi layer at once.

The dated [public outreach log](OUTREACH_LOG.md) records actual submissions,
deliberate deferrals, state vocabulary, and the follow-up policy. Do not copy a
template into unrelated repositories or treat an open thread as adoption.

## Suggested subject

Mixed Persian/English AI output: tested application-level bidi toolkit for a
small renderer pilot

## Email template

Hello [team or maintainer],

I maintain [BidiLens](https://github.com/CodeinScrubs/BidiLens), an MIT-licensed
TypeScript and native Android toolkit for mixed RTL/LTR AI messages. It fixes a common failure in
which a technically named sentence such as `React یک کتابخانه … است.` receives
the wrong paragraph direction, while leaving ordinary LTR content free of
BidiLens attributes, wrappers, styles, or source changes.

The repository includes Unicode 17-derived classification, per-block direction,
semantic isolation, streaming reconciliation, bidi-control auditing, adapters
for major web renderers, native Kotlin/Views/Compose modules, 918 direction
fixtures, three-browser tests, and Android emulator tests. Twelve public npm
packages include provenance; Android Maven publication and missing external
validation are documented explicitly.

Would you be open to reviewing a small, reversible pilot in [specific renderer
or component]? I can provide a focused integration patch and host-specific
fixtures; no data migration or model-output rewriting is required.

Thank you,
[name]

## Links to include

- Problem and quick start: [README](../README.md)
- Published packages: [`@bidilens` on npm](https://www.npmjs.com/org/bidilens)
- Versioned web release: [`v0.2.0` on GitHub](https://github.com/CodeinScrubs/BidiLens/releases/tag/v0.2.0)
- Native Android integration: [Android guide](../android/README.md)
- Exact boundaries: [Limitations](LIMITATIONS.md)
- Pilot and rollback criteria: [Adoption strategy](ADOPTION.md)
- Architecture and threat model: [Architecture](ARCHITECTURE.md) and
  [Security](SECURITY.md)
- Reproducible package/release gate: [Publishing checklist](PUBLISHING.md)
- Public CI history: [GitHub Actions](https://github.com/CodeinScrubs/BidiLens/actions)

## Reviewer fast path

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm run check
pnpm run test:visual
pnpm run release:check
```

For an initial review, install `@bidilens/core@0.1.1` and ask for one of these outcomes: confirmation of the host
bug, feedback on the API boundary, or permission to prepare a small draft pull
request. Do not claim universal rendering, zero defects, native support,
adoption, or company endorsement. npm availability is verifiable, but adoption
is not. Browser/OS layout engines still perform
Unicode reordering and shaping; BidiLens supplies the application structure and
policy they need.

## Pilot scope

The lowest-risk pilot is one web message component behind a feature flag. Run
analysis in shadow mode first, compare logical copy/source equality, enable
semantic markup for mixed messages, measure UI-thread cost, and retain a
one-commit rollback. Require native-language and accessibility review before a
broad rollout.
