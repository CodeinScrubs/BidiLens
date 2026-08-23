# Impact evidence

## Measured in this repository

- 12 public JavaScript packages with implementations, declarations, README,
  license, runnable example, and package-local assertion coverage;
- 932 schema-validated direction fixtures with numbered logical words;
- 0 fixtures currently certified by a native-language reviewer;
- property-based stream/source/range checks;
- 405 unit/property/action tests with 92.04% statements, 86.05% branches,
  94.80% functions, and 94.86% lines overall (95.93% core lines), including
  multilingual strict-security false-positive regressions;
- 30 Playwright browser/visual tests spanning Chromium, Firefox, and WebKit, including
  structured Markdown, real Chromium clipboard verification, and no-build
  standalone Web Component loading, plus the full offline bilingual playground
  controls, corpus, copy invariant, theme, and export flow;
- a self-contained 198,506-byte Node 24 GitHub Action bundle with source tests
  and built-artifact safe/strict-failure probes;
- reproducible Unicode 17.0.0 source and generated tables;
- clean tarball installation, strict consumer type-check, runtime imports, and
  execution of the exact examples extracted from all 12 tarballs;
- no known dependency vulnerabilities at the recorded audit;
- a validated CycloneDX 1.7 SBOM with 585 components and 599 dependency
  relationships;
- all 12 tarballs installed and exercised in a strict isolated consumer.

Exact package sizes, commands, benchmark environment, and limitations are in
the [build report](docs/V1_BUILD_REPORT.md).

## Not yet measured

There are no claimed users, downloads, stars, external contributors, production
deployments, accessibility lab results, independent security audit, grants, or
sponsorships. One focused native implementation based on the BidiLens policy
merged upstream in Streamdown; that is integration evidence, not proof of
BidiLens dependency adoption or continued production use. All other outcomes
require real external evidence.

## Intended impact

BidiLens aims to let AI interfaces display mixed Persian/Arabic/Hebrew/Urdu
and English text without changing stored model output. Success means correct
base direction and isolation while copy, search, logs, prompts, and diffs keep
their original logical order.
