# Impact evidence

## Measured in this repository

- 12 public JavaScript packages with implementations, declarations, README,
  license, runnable example, and package-local assertion coverage;
- 918 schema-validated direction fixtures with numbered logical words;
- 0 fixtures currently certified by a native-language reviewer;
- property-based stream/source/range checks;
- 179 unit/property/action tests with 92.56% overall and 95.15% core line coverage,
  including multilingual strict-security false-positive regressions;
- 24 browser/visual checks spanning Chromium, Firefox, and WebKit, including
  structured Markdown, real Chromium clipboard verification, and no-build
  standalone Web Component loading, plus the full offline bilingual playground
  controls, corpus, copy invariant, theme, and export flow;
- a self-contained 181,907-byte Node 24 GitHub Action bundle with source tests
  and built-artifact safe/strict-failure probes;
- reproducible Unicode 17.0.0 source and generated tables;
- clean tarball installation, strict consumer type-check, runtime imports, and
  execution of the exact examples extracted from all 12 tarballs;
- no known dependency vulnerabilities at the recorded audit;
- a validated CycloneDX 1.7 SBOM with 584 components and 598 dependency
  relationships;
- all 12 tarballs installed and exercised in a strict isolated consumer.

Exact package sizes, commands, benchmark environment, and limitations are in
the [build report](docs/V1_BUILD_REPORT.md).

## Not yet measured

There are no claimed users, downloads, stars, external contributors, merged
upstream patches, production deployments, accessibility lab results, security
audit, grants, or sponsorships. Those outcomes require real external evidence.

## Intended impact

BidiLens aims to let AI interfaces display mixed Persian/Arabic/Hebrew/Urdu
and English text without changing stored model output. Success means correct
base direction and isolation while copy, search, logs, prompts, and diffs keep
their original logical order.
