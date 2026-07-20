# BidiLens GitHub Action

This bundled JavaScript action runs the same source-preserving security audit
and conformance engine as `@bidilens/cli`. It does not install a package from a
registry, access a network service, use `eval`, or construct a shell command.

Pin third-party actions to a reviewed full commit SHA in production:

```yaml
- name: Audit bidirectional controls
  id: bidi
  uses: <owner>/<repository>/action@<full-commit-sha>
  with:
    command: audit
    paths: |
      src
      docs
    mode: strict
    fail-on: high
    format: sarif
    sarif-file: reports/bidilens.sarif
```

`report` contains the workspace-relative SARIF path. Uploading it to a code
scanning service is a separate, permission-sensitive step controlled by the
host repository.

Run the canonical direction corpus shipped in the action repository:

```yaml
- uses: <owner>/<repository>/action@<full-commit-sha>
  with:
    command: test
    format: json
```

Callers may pass `corpus` to test their own compatible JSON file. The action
propagates CLI exit codes: `0` success, `1` conformance/configuration failure,
and `2` an audit finding at or above the configured threshold. Audit never
modifies source. SARIF output is constrained to `GITHUB_WORKSPACE`.

The repository gate builds `dist/index.cjs`, checks the bundle for unresolved
workspace imports, and executes the built artifact against both safe and
malicious files. Do not edit generated files in `dist/` by hand.
