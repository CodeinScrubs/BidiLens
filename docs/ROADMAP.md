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
- 918 schema-validated fixtures and native-review metadata, including 196
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
  sample, generated 918-case corpus, JVM/Robolectric tests, lint/AAR/APK gates,
  API 35 plus local API 36.1 UI tests, signed Maven Central `0.1.1`
  publication, and independently verified public-consumer resolution.

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
- Swift Package for SwiftUI/TextKit;
- generated platform representations of the shared corpus for those remaining
  platforms.

New native and desktop targets are not scaffolded as hollow packages. Each
enters the shipped workspace only with a real implementation, at least 25
meaningful assertions, a runnable example, documentation, and a platform build
report. Android is the first target to meet that implementation gate.

## Research

- script-confusable and mixed-identifier policy;
- source-language-aware Trojan Source parsing;
- terminal/PDF capability matrices;
- public conformance dashboard and real-world regression intake.
