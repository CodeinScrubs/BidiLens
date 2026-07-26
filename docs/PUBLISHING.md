# Publishing checklist

The canonical source is published at
[`CodeinScrubs/BidiLens`](https://github.com/CodeinScrubs/BidiLens). This
checklist concerns package and release publication; source availability alone
does not mean npm artifacts exist.

## Completed repository prerequisites

- canonical public repository and real package source/homepage/issue metadata;
- verified `shayanay80` owner access to the `bidilens` npm organization and
  `@bidilens` scope;
- identified bootstrap maintainer and CODEOWNERS;
- GitHub Private Vulnerability Reporting and least-privilege workflow defaults;
- MIT project license plus Unicode and imported-corpus notices;
- human-controlled release preparation and protected npm publication
  workflows.

## External prerequisites

- configure npm trusted publishing/provenance and least-privilege CI
  permissions;
- protect the release environment and require human approval;
- complete native-speaker corpus review appropriate for the release claim;
- decide whether the ESM-only boundary is acceptable for target adopters.

A public `npm view @bidilens/core` lookup returned E404 on 2026-07-20. That
means no public package was visible at the time of this audit; it does **not**
reserve the scope, prove organization ownership, or rule out a private package.
The maintainer must claim/control the scope immediately before publication or
perform a complete, reviewed rename.

Do not invent registry ownership, package URLs, or adoption to make validators
green. The GitHub repository is real; the npm scope is still unverified.

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
publishes deterministic tarballs in dependency order and safely skips only an
already-published version with identical registry integrity.

The first publication uses a short-lived granular token stored only as the
`NPM_TOKEN` secret in the protected `npm-release` environment. Immediately
after all packages exist, configure each package's npm trusted publisher for
`CodeinScrubs/BidiLens`, workflow `publish.yml`, environment `npm-release`,
then revoke the bootstrap token. Subsequent releases select
`trusted-publishing` and use short-lived OIDC credentials.

For each release:

1. require all CI jobs and an approved changeset;
2. run the local gate above on the release commit;
3. generate and retain the CycloneDX SBOM;
4. manually dispatch `publish.yml` with the aligned version and exact
   `PUBLISH @bidilens/* <version>` confirmation;
5. confirm registry contents and provenance before creating the tag;
6. create a signed/annotated `v0.1.0` tag only for the exact published commit;
7. record real package URLs and checksums in the release notes.

Nothing in this document authorizes npm publication, release tagging, or
external integration pull requests without a separate maintainer decision.

## Optional public demo

The manual `pages.yml` workflow builds the React demo with relative asset URLs
and deploys it through GitHub Pages. It remains inert until a maintainer sets
the repository variable `BIDILENS_PAGES_ENABLED=true` and manually dispatches
the workflow. Review the public repository identity, Pages environment, and
content before enabling it.

The separate weekly/manual benchmark workflow writes a machine-readable JSON
artifact for the exact commit and retains it for 30 days. It is evidence for
regression comparison, not a cross-machine performance guarantee.
