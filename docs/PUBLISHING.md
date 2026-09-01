# Publishing checklist

The canonical source is published at
[`CodeinScrubs/BidiLens`](https://github.com/CodeinScrubs/BidiLens). This
checklist records the completed web/npm `0.3.1` and Android/Maven `0.1.1`
releases and the controls required for future releases.

## Android distribution boundary

The three Android `0.1.1` libraries under `android/` are signed and public on
Maven Central. They can also be verified locally with
`./android/gradlew -p android publishToMavenLocal`. The
[`android-v0.1.1` GitHub release](https://github.com/CodeinScrubs/BidiLens/releases/tag/android-v0.1.1)
retains the exact release assets and public verification evidence. The verified
[`android-v0.1.0` GitHub release](https://github.com/CodeinScrubs/BidiLens/releases/tag/android-v0.1.0)
remains the immutable pre-Central fallback tied to commit `85b80c0`.

GitHub Packages is not the default public distribution route because even
public packages impose authentication friction on Gradle consumers.

The `io.github.codeinscrubs` Central namespace is verified. Signing material is
kept outside the repository in the protected `maven-release` GitHub
environment, and its public fingerprint is
[`B635C6985216FC5DEB5DDCDD68BE2D5CE18F72C6`](https://keyserver.ubuntu.com/pks/lookup?op=get&search=0xB635C6985216FC5DEB5DDCDD68BE2D5CE18F72C6).
The release gate creates and checks the AAR, POM, Gradle metadata, sources jar,
documentation jar, and detached signature for all three coordinates; compiles
a clean consumer against an isolated Maven repository; retains SHA-256
evidence; and only then uploads. The libraries must not be described as
publicly available from Maven Central until Central accepts the deployment and
a clean consumer resolves it from the public repository. Android `0.1.1`
completed both gates on 2026-07-28.

### Android release workflow

The manual `publish-android.yml` workflow is restricted to `main` and the
protected `maven-release` environment. It requires the exact version and exact
`PUBLISH ANDROID <version>` confirmation, rejects a version already visible on
Central, and has read-only repository permissions. Registry credentials and
the private signing key are exposed only to the specific steps that require
them.

Android `0.1.1` completed this workflow:

1. all 13 protected CI checks passed in
   [`30337482079`](https://github.com/CodeinScrubs/BidiLens/actions/runs/30337482079);
2. `publish-android.yml` was dispatched with version `0.1.1` and confirmation
   `PUBLISH ANDROID 0.1.1`;
3. the protected `maven-release` deployment was approved and
   [`30339097846`](https://github.com/CodeinScrubs/BidiLens/actions/runs/30339097846)
   published Central deployment `82599fc9-fc43-44ba-8268-f7bd6c68a9a6`;
4. all three exact coordinates synchronized publicly;
5. a clean public-only consumer with an empty Maven Local resolved and built
   all three modules; all 15 primary files, 15 signatures, and 30 Central
   checksums independently verified;
6. annotated tag and immutable release `android-v0.1.1` were created on exact
   published commit `c59a5b674482081980fc886f6d38036f88af5dc8`, retaining the
   Maven inputs, sample APK, public evidence, signing key, and checksums.

Maven Central versions are immutable. A failed or partially visible release is
never repaired by replacing `0.1.1`; the next corrected source must use a new
version.

## Completed repository prerequisites

- canonical public repository and real package source/homepage/issue metadata;
- verified `shayanay80` owner access to the `bidilens` npm organization and
  `@bidilens` scope;
- identified bootstrap maintainer and CODEOWNERS;
- strict `main` protection requires all 24 verification contexts: the 19 CI
  jobs (including the Markdown-It 13/14/15 packed compatibility gate, Android
  library/sample build, API 35 UI-test gate, Apple and Windows compiler gates,
  and three-platform Rust gate) plus five CodeQL
  language analyses for JavaScript/TypeScript, Kotlin, C#, Swift, and Rust. The
  branch must be up to date and use linear history, while force-pushes and
  branch deletion are blocked; repository administrators are also subject to
  these checks, so CI-outage recovery requires an explicit, auditable
  protection-setting change;
- GitHub Private Vulnerability Reporting and least-privilege workflow defaults;
- MIT project license plus Unicode and imported-corpus notices;
- human-controlled release preparation and protected npm publication
  workflows;
- all 12 `@bidilens/*@0.3.1` packages published publicly with SLSA provenance;
- retained release tarballs whose SHA-512 values match the public registry;
- per-package GitHub OIDC trusted publishers bound to `publish.yml` and the
  protected `npm-release` environment;
- token-based publishing disabled through npm's recommended
  `Require two-factor authentication and disallow tokens` package setting;
- annotated `v0.3.1` tag and immutable GitHub release for the exact published
  source commit, with all package tarballs, release manifest, and SBOM attached;
- signed Android `0.1.1` artifacts published under the verified
  `io.github.codeinscrubs.bidilens` namespace, with protected release evidence,
  public-only consumer verification, annotated `android-v0.1.1` tag, and
  immutable GitHub release.

## Remaining external adoption prerequisites

- complete native-speaker corpus review appropriate for the release claim;
- complete independent security and accessibility review appropriate to the
  deployment risk;
- decide whether the ESM-only boundary is acceptable for target adopters.

On 2026-09-01, protected publication run
[`33473857928`](https://github.com/CodeinScrubs/BidiLens/actions/runs/33473857928)
published all 12 version `0.3.1` packages from exact commit
`7bd93c83e43b91923e7f8cf6685264b433c662b8` through GitHub OIDC trusted
publishing. Every package then resolved as `latest@0.3.1` with matching
registry SHA-512 integrity and SLSA provenance. The retained tarball SHA-256
values matched the publication manifest, and the annotated
[`v0.3.1`](https://github.com/CodeinScrubs/BidiLens/releases/tag/v0.3.1) tag
resolves to the same commit. Its immutable release contains the 12 exact
tarballs, release manifest, and validated CycloneDX 1.7 SBOM; GitHub records a
SHA-256 digest for every attached asset.

On 2026-07-28, the exact published source commit passed
[all 15 CI jobs](https://github.com/CodeinScrubs/BidiLens/actions/runs/30352957959),
and protected publication run
[`30352982906`](https://github.com/CodeinScrubs/BidiLens/actions/runs/30352982906)
published all 12 version `0.3.0` packages. Before publication, the exact-commit
packed-consumer gates built, packed, installed, imported, and exercised all 12
release artifacts in clean consumers. After publication, independent
verification matched the retained tarball SHA-256 values, release-manifest
registry SHA-512 values, npm integrity metadata, `latest` tags, and SLSA
provenance for every package. The annotated
[`v0.3.0`](https://github.com/CodeinScrubs/BidiLens/releases/tag/v0.3.0) tag
resolves to that commit, and the immutable release retains the 12 exact
tarballs, release manifest, validated CycloneDX SBOM, and SHA-256 checksum
manifest.

An earlier protected attempt,
[`30296472757`](https://github.com/CodeinScrubs/BidiLens/actions/runs/30296472757),
stopped before registry mutation because the version bump had not regenerated
the tracked Action bundle. PR
[#13](https://github.com/CodeinScrubs/BidiLens/pull/13) corrected that generated
artifact and repeated the complete matrix before the successful publication.

Registry availability, provenance, and the published Android surface are
verified facts. Adoption, independent review, additional native-platform
support, and company endorsement remain unclaimed.

## Reproducible local gate

From a clean checkout with Node.js 22.12+ or 24 and pnpm 10.27.0:

```bash
npm install --global corepack@0.34.1
corepack enable
pnpm install --frozen-lockfile
pnpm run verify:production
git status --short
```

`verify:production` expands to the quality, three-browser visual, package type,
packed Markdown-It 13/14/15 compatibility, dependency-audit, SBOM, and
clean-release gate set that CI and release preparation enforce as separate
steps.

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
