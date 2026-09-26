# Dependency maintenance review - 2026-09-19

This record separates dependency compatibility from release readiness. Passing
checks are evidence for the tested revision, not a guarantee against all bugs.

## Integration scope

The combined maintenance branch starts from `76e13796ba0ccfe629b00403118ce8255fc1c7c1`.
It incorporates the updates proposed in PRs
[#152](https://github.com/CodeinScrubs/BidiLens/pull/152),
[#153](https://github.com/CodeinScrubs/BidiLens/pull/153),
[#154](https://github.com/CodeinScrubs/BidiLens/pull/154), and
[#156](https://github.com/CodeinScrubs/BidiLens/pull/156):

- Playwright, Vite, ESLint, typescript-eslint, fast-check, and Node types;
- React, React DOM, their types, and Markdown-It;
- SHA-pinned setup-java and pnpm/action-setup actions.

These PRs passed their individual checks but fell behind the protected branch.
The combined tree must pass fresh required checks; individual green checks do
not prove the merged dependency graph works. Peer compatibility ranges and the
Node 22.12.0 runtime floor are unchanged.

## Security update

The locked Svelte development dependency brought in `devalue@5.8.2`.
[GHSA-9rgm-9g3h-6x36](https://github.com/advisories/GHSA-9rgm-9g3h-6x36)
describes denial of service when parsing malicious input. The workspace now
pins `devalue@5.9.2`, the documented patched version, with its registry integrity.
This is within Svelte's declared `^5.8.1` dependency range.

This finding does not establish an exploitable BidiLens runtime path. The
workspace override secures this repository's dependency tree; it does not force
downstream applications' independently managed Svelte dependencies to update.
Consumers should audit and update their own lockfiles.

A weekly read-only dependency audit complements the existing pull-request audit
and weekly CodeQL runs. Newly disclosed advisories can require maintenance even
when the most recent build was green. Registry failures also fail the audit;
they must not be mistaken for a clean security result.

## Deferred Android changes

| PR | Verified reason for deferral | Condition for retry |
| --- | --- | --- |
| [#149](https://github.com/CodeinScrubs/BidiLens/pull/149) | AGP 9.4.0 requires Gradle 9.6.0; the wrapper is 9.5.1. Android builds and documentation checks fail. | Upgrade and validate AGP, Gradle wrapper/checksum, Kotlin compatibility, and documentation together. |
| [#155](https://github.com/CodeinScrubs/BidiLens/pull/155) | The Java/Kotlin CodeQL extractor used by that run rejects Kotlin 2.4.20; documentation also names the previous version. Android libraries/sample and API 35 UI tests passed. | Use an analyzer that supports the selected Kotlin version, synchronize docs, and rerun the full required matrix. |

No required check is disabled to accept these upgrades. Deferred versions should
be reassessed using fresh toolchain evidence, not treated as permanently broken.

## Release boundary

The first combined hosted run passed 24 of 25 checks, but the API 35 clipboard
instrumentation test timed out twice. The follow-up adds explicit window-focus,
selection, and copy-action assertions plus retained emulator diagnostics. These
are test-harness changes, not a production rendering fix. The combined update
must remain unmerged until the native test failure is understood and required
checks pass; local JavaScript and browser results cannot substitute for it.

At review start, the latest GitHub release is `v0.4.0`. The merged source
hardening in PRs #147 and #148 and these dependency updates are not a new npm
publication. Release preparation must consume pending changesets and pass the
protected release workflow before users can obtain that work from a new version.
The device, accessibility, native-speaker, and downstream-pilot evidence gaps in
[the limitations](LIMITATIONS.md) and [roadmap](ROADMAP.md) remain unchanged.
