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
which controls the `@bidilens` npm scope. On 2026-07-26 all 12 `0.1.0`
packages were published with SLSA provenance, exact registry-integrity
verification, and per-package GitHub OIDC trusted publishing. Trademark
clearance remains separate from namespace control.

## Decision

- Use `CodeinScrubs/BidiLens` as the canonical source, issue, and documentation
  identity and record its real maintainer metadata.
- Keep `@bidilens/*` under the verified maintainer-controlled npm organization.
- Treat trademark review and final cross-registry collision checks as separate
  legal/adoption gates.
- Use the protected `publish.yml` workflow for registry mutation and migrate
  from the one-time bootstrap credential to per-package OIDC trusted
  publishing immediately after the initial versions exist. This migration was
  completed for `0.1.0`.

## Consequences

Source can be distributed under MIT from the canonical GitHub repository.
Registry control and the initial publication are complete. Immutable future
versions still require provenance-capable publication and explicit approval.
