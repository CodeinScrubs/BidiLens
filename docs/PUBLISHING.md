# Publishing checklist

The canonical source is published at
[`CodeinScrubs/BidiLens`](https://github.com/CodeinScrubs/BidiLens). This
checklist records the completed initial `0.1.0` package release and the controls
required for the synchronized `0.1.1` reliability patch and future releases.

## Completed repository prerequisites

- canonical public repository and real package source/homepage/issue metadata;
- verified `shayanay80` owner access to the `bidilens` npm organization and
  `@bidilens` scope;
- identified bootstrap maintainer and CODEOWNERS;
- GitHub Private Vulnerability Reporting and least-privilege workflow defaults;
- MIT project license plus Unicode and imported-corpus notices;
- human-controlled release preparation and protected npm publication
  workflows;
- all 12 `@bidilens/*@0.1.0` packages published publicly with SLSA provenance;
- retained release tarballs whose SHA-512 values match the public registry;
- per-package GitHub OIDC trusted publishers bound to `publish.yml` and the
  protected `npm-release` environment;
- token-based publishing disabled through npm's recommended
  `Require two-factor authentication and disallow tokens` package setting;
- annotated `v0.1.0` tag for the published source commit.

## Remaining external adoption prerequisites

- complete native-speaker corpus review appropriate for the release claim;
- complete independent security and accessibility review appropriate to the
  deployment risk;
- decide whether the ESM-only boundary is acceptable for target adopters.

The pre-release E404 observation from 2026-07-20 is superseded. On 2026-07-26,
the protected publication run
[`30183018352`](https://github.com/CodeinScrubs/BidiLens/actions/runs/30183018352)
published or byte-verified the complete package set. A clean external consumer
then installed all 12 packages from npm, exercised runtime imports and the CLI,
confirmed the target mixed-direction behavior and pure-LTR no-op, and reported
zero production audit findings with current peers.

Registry availability and provenance are verified facts. Adoption, independent
review, native support, and company endorsement remain unclaimed.

## Reproducible local gate

From a clean checkout with Node.js 22.12+ or 24 and pnpm 10.27.0:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm run check
pnpm run test:visual
pnpm -r --if-present run example
pnpm run packages:types
pnpm run deps:audit
pnpm run release:check
pnpm run sbom
pnpm run sbom:check
git status --short
```

`release:check` rejects a dirty tree, packs each public package, checks files
and dependency protocols, installs all local tarballs into a temporary strict
consumer, type-checks with `skipLibCheck: false`, and runs runtime assertions.
It also extracts and executes the exact `examples/basic.mjs` shipped in every
tarball with documented host/peer dependencies installed in that consumer.

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
