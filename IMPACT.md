# Impact evidence

## Measured in this repository

- 10 public JavaScript packages with implementations, declarations, README,
  license, runnable example, and package-local assertion coverage;
- 722 schema-validated direction fixtures with numbered logical words;
- 0 fixtures currently certified by a native-language reviewer;
- property-based stream/source/range checks;
- 127 unit/property tests with 91.48% overall and 93.65% core line coverage;
- 18 visual checks spanning Chromium, Firefox, and WebKit, including structured
  Markdown and real Chromium clipboard verification;
- reproducible Unicode 17.0.0 source and generated tables;
- clean tarball installation, strict consumer type-check, runtime imports, and
  execution of the exact examples extracted from all 10 tarballs;
- no known dependency vulnerabilities at the recorded audit;
- a validated CycloneDX 1.7 SBOM with 584 components and 596 dependency
  relationships;
- all 10 tarballs installed and exercised in a strict isolated consumer.

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
