# Support

BidiLens is a community-maintained open-source project. There is currently no
paid support program or guaranteed response time.

## Where to ask

- Use [GitHub Discussions](https://github.com/CodeinScrubs/BidiLens/discussions)
  for integration questions, design discussion, and help choosing a package.
- Use the [issue tracker](https://github.com/CodeinScrubs/BidiLens/issues) for
  reproducible defects and scoped feature requests.
- Use the native-language review issue form for corpus corrections.
- Follow [SECURITY.md](SECURITY.md) for suspected vulnerabilities; do not put
  sensitive security details in a public issue.

When asking for rendering help, include the exact logical source string, host
application, browser/runtime and OS versions, current markup/CSS, and the
expected block direction. Never manually reverse the sample before sharing it.

## Supported scope

The maintained public-beta scope includes the JavaScript/web packages on
Node.js 22.12+ and standards-based browsers, plus the published Android
Kotlin, Views, and Compose libraries. Swift/UIKit/SwiftUI, .NET/WPF, and Rust
implementations are available in source with platform CI gates; they are not
registry releases or production-certified integrations.

Use the [release status](README.md), [platform limitations](docs/LIMITATIONS.md),
and [production review](docs/PRODUCTION_READINESS.md) to distinguish published
artifacts, unreleased fixes, supported renderer boundaries, and remaining
device, IME, accessibility, and downstream validation. Flutter, React Native,
WinUI, Windows Forms, MAUI, and PDF adapters remain roadmap work.
