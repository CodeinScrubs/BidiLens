# Publishing checklist

The canonical source is published at
[`CodeinScrubs/BidiLens`](https://github.com/CodeinScrubs/BidiLens). This
checklist records the completed `0.2.0` minor release and the controls
required for future releases.

## Android distribution boundary

The Android modules under `android/` are configured as Maven publications and
can be verified with `./android/gradlew -p android publishToMavenLocal`.
Release AARs and sources jars are built by CI. The verified
[`android-v0.1.0` GitHub release](https://github.com/CodeinScrubs/BidiLens/releases/tag/android-v0.1.0)
contains the CI AARs, an external-consumer-tested Maven repository bundle, a
sample APK, an SBOM, and SHA-256 checksums tied to commit `85b80c0`. These
artifacts must not be described as Maven Central artifacts until all of the
following are complete:

- Central namespace ownership for `io.github.codeinscrubs.bidilens`;
- GPG/signing material managed outside the repository;
- signed POM, sources, and documentation artifacts accepted by Central;
- a clean external Gradle consumer that resolves all three coordinates from
  the public repository;
- checksum retention and a GitHub release tied to the exact source commit.

GitHub Packages is not the default public distribution route because even
public packages impose authentication friction on Gradle consumers. Until a
signed Central release exists, the [Android guide](../android/README.md)
documents source checkout, Maven Local, and release-AAR use without implying
registry publication.

## Completed repository prerequisites

- canonical public repository and real package source/homepage/issue metadata;
- verified `shayanay80` owner access to the `bidilens` npm organization and
  `@bidilens` scope;
- identified bootstrap maintainer and CODEOWNERS;
- strict `main` protection requires all 13 CI job contexts, including the
  Android library/sample build and API 35 UI-test gate, on an up-to-date
  branch and linear history, while blocking force-pushes, branch deletion, and
  unresolved review conversations; the sole-maintainer administrative bypass
  remains available for CI-outage recovery;
- GitHub Private Vulnerability Reporting and least-privilege workflow defaults;
- MIT project license plus Unicode and imported-corpus notices;
- human-controlled release preparation and protected npm publication
  workflows;
- all 12 `@bidilens/*@0.2.0` packages published publicly with SLSA provenance;
- retained release tarballs whose SHA-512 values match the public registry;
- per-package GitHub OIDC trusted publishers bound to `publish.yml` and the
  protected `npm-release` environment;
- token-based publishing disabled through npm's recommended
  `Require two-factor authentication and disallow tokens` package setting;
- annotated `v0.2.0` tag and immutable GitHub release for the exact published
  source commit, with all package tarballs, release manifest, and SBOM attached.

## Remaining external adoption prerequisites

- complete native-speaker corpus review appropriate for the release claim;
- complete independent security and accessibility review appropriate to the
  deployment risk;
- decide whether the ESM-only boundary is acceptable for target adopters.

On 2026-07-27, the exact published source commit passed
[all 11 CI jobs](https://github.com/CodeinScrubs/BidiLens/actions/runs/30297267976),
and protected publication run
[`30297697861`](https://github.com/CodeinScrubs/BidiLens/actions/runs/30297697861)
published all 12 version `0.2.0` packages. Independent verification matched the
retained tarball SHA-256 values, release-manifest registry SHA-512 values, npm
integrity metadata, `latest` tags, and SLSA provenance for every package. A
clean external consumer then installed the complete exact-version set from
npm, imported all 12 packages, exercised mixed Persian/English and pure-LTR
runtime behavior plus the CLI, and reported zero production audit findings
with current peers. The annotated
[`v0.2.0`](https://github.com/CodeinScrubs/BidiLens/releases/tag/v0.2.0) tag
resolves to that commit, and the immutable release retains the 12 exact
tarballs, release manifest, and validated CycloneDX SBOM.

An earlier protected attempt,
[`30296472757`](https://github.com/CodeinScrubs/BidiLens/actions/runs/30296472757),
stopped before registry mutation because the version bump had not regenerated
the tracked Action bundle. PR
[#13](https://github.com/CodeinScrubs/BidiLens/pull/13) corrected that generated
artifact and repeated the complete matrix before the successful publication.

Registry availability and provenance are verified facts. Adoption, independent
review, native support, and company endorsement remain unclaimed.

## Reproducible local gate

From a clean checkout with Node.js 22.12+ or 24 and pnpm 10.27.0:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm run verify:production
git status --short
```

`verify:production` expands to the quality, three-browser visual, package type,
dependency-audit, SBOM, and clean-release gate set that CI and release
preparation enforce as separate steps.

`release:check` rejects a dirty tree, packs each public package, checks files
and dependency protocols, installs all local tarballs into a temporary strict
consumer, type-checks with `skipLibCheck: false`, and runs runtime assertions
for the core, DOM, HTML, Markdown, React, Svelte, terminal, Vue, Web Component,
spec, Playwright-import, and CLI surfaces. Its packed-adapter probes enforce
that ordinary LTR content remains observably untouched. It also extracts and
executes the exact `examples/basic.mjs` shipped in every tarball with
documented host/peer dependencies installed in that consumer.

## Release workflow

Changesets configuration and a manual `publish.yml` workflow are committed.
The workflow requires the `npm-release` GitHub environment, an exact
confirmation phrase, the `main` branch, a clean checkout, aligned versions,
the complete quality/release gate, and provenance-capable publication. It
packs on a fixed Linux toolchain, publishes in dependency order, retains the
exact tarballs, and safely skips only an already-published version with
identical registry integrity. Local dry-runs on another operating system may
produce different tarball bytes; real publication retries remain byte-strict on
the release runner.

The first publication used a short-lived granular bootstrap token. Every
package now trusts `CodeinScrubs/BidiLens`, workflow `publish.yml`, environment
`npm-release`, with publish permission. The bootstrap credential and matching
GitHub environment secret were removed after verification, and all packages
disallow traditional publishing tokens. Subsequent releases use short-lived
OIDC credentials.

For each release:

1. require all CI jobs and an approved changeset;
2. run the local gate above on the release commit;
3. generate and retain the CycloneDX SBOM;
4. manually dispatch `publish.yml` with the aligned version and exact
   `PUBLISH @bidilens/* <version>` confirmation;
5. confirm registry contents and provenance before creating the tag;
6. create a signed/annotated `v<version>` tag only for the exact published commit;
7. record real package URLs and checksums in the release notes.

Each future npm publication, release tag, or external integration pull request
still requires a separate maintainer decision.

## Optional public demo

The manual `pages.yml` workflow builds the React demo with relative asset URLs
and deploys it through GitHub Pages. It remains inert until a maintainer sets
the repository variable `BIDILENS_PAGES_ENABLED=true` and manually dispatches
the workflow. Review the public repository identity, Pages environment, and
content before enabling it.

The separate weekly/manual benchmark workflow writes a machine-readable JSON
artifact for the exact commit and retains it for 30 days. It is evidence for
regression comparison, not a cross-machine performance guarantee.
