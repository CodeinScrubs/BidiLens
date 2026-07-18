# ADR-004: ESM-only packages and MIT project license

## Status

Accepted for the 0.1.0 candidate; re-evaluate after downstream pilot feedback.

## Context

The repository needs an honest module boundary and a permissive license that
can be adopted inside varied AI/web products. Producing dual ESM/CommonJS
artifacts increases conditional-export and test surface. Current source and
dependencies are ESM-oriented. Unicode-derived data has separate upstream
terms that must remain visible.

## Decision

- Public JavaScript packages are ESM-only and require Node.js 22.12+ for
  server-side use. Node 20 compatibility was verified during development but
  is not a production support claim after that release line reached EOL.
- Export maps provide ESM and declarations; CommonJS consumers use dynamic
  `import()` or an ESM bridge.
- Package structure is checked with Are the Types Wrong using its ESM-only
  profile and with a strict clean consumer.
- Original BidiLens code uses MIT to minimize integration friction.
- Unicode data attribution and terms are preserved in
  `THIRD_PARTY_NOTICES.md` and the core package notice.

## Tradeoffs

ESM-only reduces ambiguous packaging and duplicated builds, but excludes
legacy synchronous `require()` consumers. MIT is concise and permissive, but
does not include Apache-2.0's express patent grant. A future governance body
may adopt dual output or relicense only with contributor and legal review.
