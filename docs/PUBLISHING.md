# Publishing checklist

This checkout prepares artifacts but does not publish them. A human maintainer
must complete every external prerequisite and approve the release.

## External prerequisites

- create the canonical public repository and set its real URL;
- verify ownership of the `@bidilens` npm organization/scope, or rename every
  package before release;
- add real `repository`, `homepage`, `bugs`, author/maintainer, and optional
  funding metadata to every public package;
- enable a monitored private vulnerability-reporting channel;
- configure npm trusted publishing/provenance and least-privilege CI
  permissions;
- protect the release environment and require human approval;
- complete native-speaker corpus review appropriate for the release claim;
- decide whether the ESM-only boundary is acceptable for target adopters.

Do not invent placeholder URLs or identities to make metadata validators
green. Missing real-world identity is safer than publishing false metadata.

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

Changesets configuration is committed, but automatic publishing intentionally
is not enabled until repository identity, scope ownership, provenance, and
secrets exist. Once configured:

1. require all CI jobs and an approved changeset;
2. run the local gate above on the release commit;
3. generate and retain the CycloneDX SBOM;
4. publish packages in dependency order or use a verified Changesets action;
5. confirm registry contents and provenance before creating the tag;
6. create a signed/annotated `v0.1.0` tag only for the exact published commit;
7. record real package URLs and checksums in the release notes.

Nothing in this document authorizes the automated creation of accounts,
publishing, tagging, or external pull requests.
