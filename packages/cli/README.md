# @bidilens/cli

Inspect direction, render escaped semantic HTML, validate the corpus, audit
hidden/unbalanced bidi controls, emit SARIF, and explicitly sanitize files.

For adding BidiLens to an application, start with the
[integration guide](https://github.com/CodeinScrubs/BidiLens/blob/main/docs/GETTING_STARTED.md).

## Offline integration guidance (0.4.0+)

Version `0.4.0` adds `bidilens guide [target]`; `0.3.3` does not include this
command. With CLI `0.4.0` installed, try:

```bash
bidilens guide
bidilens guide react
bidilens guide dom --json
```

The guide lists 12 adapter/platform routes and prints tested, copyable recipes
for React, DOM, HTML, and Markdown-It. Other routes link to their platform
instructions. Every route includes compatibility, rollout checks, and rollback
advice. It is offline and read-only: no project scanning, file changes,
dependency installs, or telemetry. JSON output uses `schemaVersion: 1`;
allow additive fields. Unknown targets exit non-zero. It is guidance, not
automatic setup or a compatibility diagnosis.

From a built source checkout, use `node packages/cli/dist/bin.js guide` instead.

## Inspection and security commands

```bash
npm install --global @bidilens/cli
bidilens inspect --text "React یک کتابخانه است."
bidilens audit src docs --fail-on high
# Keep legacy annotations even for LTR-only rendered text:
bidilens render --text "Hello world" --intervention always
```

Without a global install:

```bash
npx --package @bidilens/cli bidilens test
```

Programmatic runners can import `runCli` for controlled stdout/stderr and exit
codes. Security modes are `off`, `audit`, `warn`, and `strict`; default audit
never mutates input. Render intervention modes are `auto` (the non-interfering
default) and `always`. Run `pnpm --filter @bidilens/cli example` after building.
