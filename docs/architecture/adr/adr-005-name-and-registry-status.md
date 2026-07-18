# ADR-005: Provisional BidiLens name and registry status

## Status

Provisional; external ownership is unresolved.

## Context

The source inherited the BidiLens name and `@bidilens/*` package identifiers.
Registry queries in this environment returned no published packages for the
chosen scoped names, but a 404 does not prove ownership of the npm scope,
trademark availability, GitHub organization control, or availability in every
ecosystem.

The collision audit was repeated on 2026-07-18 against the npm registry search
and package endpoint, PyPI JSON API, pub.dev package API, crates.io API, Maven
Central search, and GitHub repository search. Each returned either HTTP 404 or
zero exact `bidilens` results at that time. The local checkout has no Git remote
and the local npm client is not authenticated, so this is collision evidence,
not ownership evidence.

## Decision

- Keep BidiLens and `@bidilens/*` for local release preparation.
- Do not add fabricated repository URLs, badges, authors, or organization
  metadata.
- Treat npm scope ownership, public repository creation, trademark review, and
  final cross-registry collision checks as external publication gates.
- Rename all packages atomically if the human maintainer cannot prove control.

## Consequences

Artifacts can be built and tested locally, but they are not publishable by an
unidentified automation agent. Documentation must say “prepared, not
published” until a human completes the gates.
