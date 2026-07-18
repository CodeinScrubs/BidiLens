# Contributing

Thank you for improving BidiLens. Correctness claims must be backed by source,
tests, corpus fixtures, or reproducible commands.

## Development

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm run check
pnpm run test:visual
```

Run package examples with:

```bash
pnpm -r --if-present run example
```

## Change requirements

Direction-policy changes require:

1. a regression template in `scripts/generate-corpus.ts` or a clearly
   documented user-provided fixture;
2. focused unit tests for every affected policy;
3. streaming/batch coverage if the result can change while chunks arrive;
4. adapter tests if markup or isolation plans change;
5. confirmation that the source string is preserved exactly.

Every public package must retain a real implementation, at least 25 meaningful
assertions in its own test suite, a runnable example, a package README, and a
packed license. A package that cannot meet those gates belongs in the roadmap,
not in the published workspace.

Security-sensitive changes must update `docs/SECURITY.md`, include ordinary
RTL false-positive tests, and never silently strip controls by default.

## Generated files

- Change corpus templates, then run `pnpm run corpus:generate`.
- Change Unicode data only through the documented process in `unicode/README.md`.
- Do not hand-edit `packages/core/src/generated/bidi-ranges.ts`.
- Do not commit `dist`, coverage, Playwright reports, or package tarballs.

## Native-language review

Use the checklist in `corpus/README.md`. Set `nativeSpeakerReviewed: true`
only for a language you personally read fluently and list the reviewed template
IDs in the pull request.

## Pull requests and releases

Keep changes scoped, explain the user-visible behavior, and include a
Changesets entry for a public API or behavior change. Before a release run:

```bash
pnpm run check
pnpm run test:visual
pnpm run packages:types
pnpm run deps:audit
pnpm run release:check
pnpm run sbom
pnpm run sbom:check
```

Node.js 22.12 is the minimum supported server runtime. React 18–19, Vue 3.5+, and
Svelte 4–5 are the declared peer ranges and must be validated before expanding
them.
