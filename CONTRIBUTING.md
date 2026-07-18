# Contributing

Thank you for improving BidiLens.

## Development

```bash
npm install
npm run check
npm run demo
```

Changes to direction heuristics must include:

1. a regression fixture in `corpus/cases.json`;
2. unit tests covering the expected direction and confidence;
3. an explanation of whether the change affects first-strong, majority, or both;
4. confirmation that code blocks and identifiers remain isolated.

Security-sensitive changes involving bidi controls should also update `docs/SECURITY.md`.

## Compatibility policy

- Node.js: maintained LTS releases, minimum Node 20 for v1.
- Browsers: current and previous major releases of Chromium, Firefox, and Safari.
- React: 18 and 19 through peer dependency compatibility.
- Unicode: algorithms are versioned and corpus results are recorded; no release silently changes heuristics.

## Pull requests

Keep pull requests narrowly scoped. Include tests, user-facing documentation, and a changeset-style summary in the PR description. Do not commit generated `dist` directories.
