# @bidilens/cli

Inspect direction, render escaped semantic HTML, validate the corpus, audit
hidden/unbalanced bidi controls, emit SARIF, and explicitly sanitize files.

```bash
npm install --global @bidilens/cli
bidilens inspect --text "React یک کتابخانه است."
bidilens audit src docs --fail-on high
```

Without a global install:

```bash
npx --package @bidilens/cli bidilens test
```

Programmatic runners can import `runCli` for controlled stdout/stderr and exit
codes. Security modes are `off`, `audit`, `warn`, and `strict`; default audit
never mutates input. Run `pnpm --filter @bidilens/cli example` after building.
