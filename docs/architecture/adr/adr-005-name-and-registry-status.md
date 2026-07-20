# ADR-005: BidiLens repository identity and provisional registry status

## Status

Accepted for the GitHub source identity; npm and other registries remain unresolved.

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
`https://github.com/CodeinScrubs/BidiLens`. The local npm client is not
authenticated, so registry searches remain collision evidence, not ownership
evidence.

## Decision

- Use `CodeinScrubs/BidiLens` as the canonical source, issue, and documentation
  identity and record its real maintainer metadata.
- Keep `@bidilens/*` for package release preparation, without implying that the
  npm scope is owned or that any package is published.
- Treat npm scope ownership, trademark review, and final cross-registry
  collision checks as external package-publication gates.
- Rename all packages atomically if the human maintainer cannot prove control.

## Consequences

Source can be distributed under MIT from the canonical GitHub repository.
Package artifacts remain “prepared, not published” until the maintainer proves
registry control and completes provenance and release approval.
