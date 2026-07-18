# Sibling-project audit and idea traceability

This audit compares the local project folders available on 2026-07-18. It is
not a marketing comparison with external libraries. Counts come from files in
those folders and do not treat README claims as proof.

## Reproducible inventory

| Local project | Public package folders | Package test files | Package `expect(` calls | Visual specs / `expect(` calls | Corpus fixtures present |
|---|---:|---:|---:|---:|---:|
| `v1-cgtt` | 5 | 4 | 38 | 0 / 0 | 16 |
| `v1-Her` | 7 | 7 | 57 | 0 / 0 | 2 |
| `v1.1-Her` | 9 | 9 | 67 | 0 / 0 | 2 |
| `v1.2-Her` | 9 | 9 | 67 | 0 / 0 | 2 |
| canonical BidiLens checkout | 10 | 12 | 556 | 1 / 36 | 722 |

Static assertion counts are only a depth signal; the canonical total is 592
across package and visual tests. The canonical checkout also runs those tests,
coverage thresholds, examples, the three-browser visual suite,
dependency audit, Unicode reproducibility, tarball inspection, and isolated
consumer install. The sibling folders do not provide equivalent passing
release gates.

The retained `bidilens-v1.2.0` folder under `v1.1-cgtt` contains documentation
but no package source. Its claims of 125 fixtures and broader packages cannot
be reproduced from the surviving artifacts and are therefore treated as ideas,
not delivered evidence.

## Material ideas reviewed

| Idea found across siblings | Canonical disposition |
|---|---|
| Content-majority default for the user flagship | Implemented and fixture #001 |
| Unicode range lookup instead of hand-written script ranges | Implemented from pinned Unicode 17 bidi-class and general-category data with checksums/generator |
| Separate `stream` and `security` package proposals | Their useful APIs are implemented in `@bidilens/core`; keeping them together avoids two tiny dependency layers while preserving streaming, scan, sanitize, and SARIF capabilities |
| Block evidence and language-neutral offsets | Implemented in `analyzeBlock` with UTF-16 and code-point ranges |
| Technical-token exclusion and inline planning | Implemented with monotonic range traversal and expanded token classes |
| Semantic HTML compiler | Implemented as an escaped package with a conservative non-executable tag allowlist |
| DOM mutation support | Implemented with custom selectors, idempotence, restoration, and isolation |
| unified plus markdown-it support | Implemented in one deep Markdown package |
| React SSR and streaming | Implemented with duplicated-initial-text regression coverage and explicit SSR/client completion |
| Vue and Svelte adapters | Implemented idiomatically with stream APIs |
| Sibling `BidiMarkdown` framework wrappers | Replaced by composition with the real AST-based Markdown package; the sibling wrappers only split plain-text blocks despite their name and therefore were not copied |
| Framework-independent custom element | Implemented with DOM node construction and side-effect metadata |
| Chunk-boundary-invariant streaming | Implemented for final and live decisions with source-position checkpoints, property tests, and completed-paragraph immutability |
| Trojan-Source-style scanner | Implemented with balance/cross-isolate checks, modes, dual offsets, and SARIF |
| Conservative terminal behavior | Implemented with complete ECMA-48 CSI/string-control masking; control insertion remains opt-in |
| CLI inspection/audit/render/test/sanitize | Implemented with deterministic directory filtering, unconditional explicit-file scans, and symlink skipping |
| Corpus schemas and numbered words | Implemented with JSON Schema, semantic technical-span numbering, and 722 cases |
| Package/release evidence | Implemented with examples executed from all tarballs, licenses, ESM type analysis, pack/install consumer, audit, and SBOM command |
| Target matrices and upstream contribution dossiers | Reviewed as archival research; their issue/PR routing principle is retained in adoption guidance, but dated product-policy claims are not presented as current or ready-to-submit integrations |
| Honest limitations and publishing guide | Implemented; false badges and fake repository metadata rejected |

## Ideas deliberately deferred

The sibling documents mention Android, Flutter, React Native, SwiftUI, VS Code,
Electron, PDF, editor integrations, and upstream product dossiers. Every local
sibling source/package surface and the retained integration dossiers were
reviewed, but no sibling contains enough tested source to transplant these
honestly. Creating empty folders would violate the anti-hollow rule, so they
remain explicit roadmap items until a real implementation, at least 25
meaningful assertions, example, README, and executable platform gate can be
supplied. Upstream dossiers must also be re-researched against current product
architecture and contribution policy before submission.

Likewise, the sibling's fake passing badge, “enterprise-grade” label, and
unreproducible release/corpus counts were rejected rather than copied.

## Comparative conclusion

Within the JavaScript/web scope that exists as executable source, the canonical
checkout is objectively more complete and better verified than every sibling:
more real packages, package-local test depth, a much larger validated corpus,
generated current Unicode data, property/visual/security coverage, safe
serialization, and clean tarball consumers.

It is not “100% better” in every conceivable dimension: some sibling documents
describe a wider future platform vision. This repository records that wider
vision without calling unbuilt platforms complete. That distinction is a
quality improvement, not a missing marketing claim.
