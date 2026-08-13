# Roadmap

The roadmap separates executable evidence from targets. A target is not an
implementation or adoption claim.

## Implemented and published in the current releases

- reproducible Unicode 17.0.0 bidi data and dual-offset evidence;
- versioned language-neutral block-analysis, security, and stream schemas;
- content-majority core, technical-token isolation, security modes, and SARIF;
- paragraph-aware chunk-invariant streaming and measured incremental behavior;
- checkpointed rich Markdown-It streaming with AST/HTML/isolation/security
  final equivalence, dirty regions, security deltas, and pending-source state;
- safe HTML, restorable/observable DOM, unified, markdown-it, React, Vue,
  Svelte, Web Component, Playwright helpers, conservative terminal, and CLI
  packages;
- real typed framework/renderer integrations, SSR tests, examples, and
  package-local assertion depth;
- 932 schema-validated fixtures and native-review metadata, including 196
  attributed comparison-project seeds awaiting native review;
- Chromium, Firefox, and WebKit visual/geometry/selection tests, structured
  Markdown snapshots, Chromium clipboard verification, and real standalone
  Web Component loading without an import map;
- offline bilingual playground with policy/security and adjustable-stream
  controls, live four-way input, AST/evidence/isolation/security inspection,
  searchable corpus, copy verification, semantic HTML/JSON export, hash state,
  theme, and an opt-in GitHub Pages workflow;
- ESM type-layout analysis, aggregate size budgets, tarball inspection,
  isolated consumer install/runtime/CLI execution, audit, and validated SBOM.
- public npm packages with SLSA provenance, registry-integrity verification,
  an annotated source tag, and a protected human-approved release workflow.
- native Android Kotlin core, Views and Compose adapters, photographed-case
  sample, generated 932-case corpus, JVM/Robolectric tests, lint/AAR/APK gates,
  API 35 plus local API 36.1 UI tests, signed Maven Central `0.1.1`
  publication, and independently verified public-consumer resolution.

## Implemented in source; native release evidence pending

- Swift Package core, UIKit adapters, and a UIKit-backed SwiftUI `BidiText`
  renderer with generated Unicode 17 data, independent direction/alignment
  policy, shared 932-case corpus tests, a runnable core example, macOS
  verification, and iOS Simulator adapter tests;
- .NET 8 core and WPF adapters with generated Unicode 17 data, independent
  direction/alignment policy, shared 932-case executable verification, a
  runnable WPF sample, package builds, and a Windows compiler gate;
- native Rust core with generated Unicode 17 data, byte/UTF-16/code-point
  ranges, shared 932-case direction conformance, declared isolation/security
  conformance, a runnable example, and Linux/macOS/Windows compiler gates.

These are not yet registry releases or downstream production/accessibility
validation claims. The Rust core also has no editor-specific adapter yet.

## Required before broad production recommendation

- native-speaker certification across Persian, Arabic, Hebrew, Urdu, Pashto,
  and Kurdish Sorani corpus templates;
- screen-reader and browser/OS clipboard laboratory results from the
  [accessibility checklist](ACCESSIBILITY.md);
- external security review appropriate to the deployment risk;
- a downstream pilot in a real AI interface with performance and rollback data;
- maintainer review and disposition of the submitted host integration and
  evidence bundles in the [public outreach log](OUTREACH_LOG.md);
- an additional maintainer-controlled private conduct channel if community
  activity expands beyond GitHub.

## Planned web and desktop work

- a stateful unified/remark/rehype streaming backend matching the shipped
  Markdown-It session's final-equivalence contract;
- Monaco and CodeMirror integrations;
- CSP-safe VS Code extension demonstration;
- secure Electron example with clipboard and print/PDF verification;
- browser HTML-to-PDF conformance;
- two additional host-tested patch-quality upstream integrations; the first
  submitted patch and current evidence bundles are recorded in the [outreach
  log](OUTREACH_LOG.md).

The complete specification-to-evidence audit lives in
[REQUIREMENT_MATRIX.md](REQUIREMENT_MATRIX.md).

## Planned native work

- physical-device/OEM/IME and TalkBack validation for the published Android
  libraries;
- Flutter package and golden tests;
- React Native component and platform notes;
- editable SwiftUI integration, iOS sample app, physical-device/VoiceOver
  validation, and Swift package release evidence;
- WinUI 3, Windows Forms, and MAUI adapters plus accessibility/IME validation
  and NuGet release evidence;
- downstream Rust editor integration and crates.io release evidence after API
  review; the source crate is deliberately non-publishable until that review;
- generated platform representations of the shared corpus for Flutter and
  React Native.

New native and desktop targets are not scaffolded as hollow packages. Each
enters the shipped workspace only with a real implementation, at least 25
meaningful assertions, a runnable example, documentation, and a platform build
report. Android is the first published target to meet that gate. Apple,
Windows, and Rust now have hosted source/compiler evidence but still await the
device, accessibility/IME, downstream-integration, and registry-release
evidence applicable to each platform.

## Research

- script-confusable and mixed-identifier policy;
- source-language-aware Trojan Source parsing;
- terminal/PDF capability matrices;
- public conformance dashboard and real-world regression intake.
