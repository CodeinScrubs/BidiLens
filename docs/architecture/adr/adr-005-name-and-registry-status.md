# ADR-005: BidiLens repository and registry identity

## Status

Accepted for the GitHub source identity and maintainer-controlled npm scope;
other ecosystems and trademark review remain unresolved.

## Context

The source inherited the BidiLens name and `@bidilens/*` package identifiers.
Registry queries in this environment returned no published packages for the
chosen scoped names, but a 404 does not prove ownership of the npm scope,
trademark availability, GitHub organization control, or availability in every
ecosystem.

The collision audit was repeated on 2026-07-18 against the npm registry search
and package endpoint, PyPI JSON API, pub.dev package API, crates.io API, Maven
Central search, and GitHub repository search. Each returned either HTTP 404 or
zero exact `bidilens` results at that time. On 2026-07-20, the maintainer
created the canonical public repository at
`https://github.com/CodeinScrubs/BidiLens`. On 2026-07-26, verified npm user
`shayanay80` created and proved owner access to the `bidilens` organization,
which controls the `@bidilens` npm scope. Package publication and trademark
clearance are separate decisions from namespace control.

## Decision

- Use `CodeinScrubs/BidiLens` as the canonical source, issue, and documentation
  identity and record its real maintainer metadata.
- Keep `@bidilens/*` under the verified maintainer-controlled npm organization.
- Treat package publication, trademark review, and final cross-registry
  collision checks as separate release/legal gates.
- Use the protected `publish.yml` workflow for registry mutation and migrate
  from the one-time bootstrap credential to per-package OIDC trusted
  publishing immediately after the initial versions exist.

## Consequences

Source can be distributed under MIT from the canonical GitHub repository.
Registry control no longer blocks the initial release, but immutable package
versions still require provenance-capable publication and explicit approval.
