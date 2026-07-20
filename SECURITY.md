# Security policy

## Supported versions

The source repository is public, but no BidiLens package has been published to
npm yet. Once `0.1.x` packages are published, the latest patch release will
receive security fixes; earlier pre-release snapshots will not be supported.

## Reporting a vulnerability

Use [GitHub Private Vulnerability Reporting](https://github.com/CodeinScrubs/BidiLens/security/advisories/new).
Do not disclose a suspected vulnerability in a public issue. The bootstrap
maintainer aims to acknowledge a complete report within seven calendar days,
provide a status update within fourteen days, and coordinate disclosure after
a fix or documented risk decision. These are response targets, not a paid
support SLA.

Include a minimal reproduction, affected package/version, expected impact,
whether untrusted content is required, and any suggested remediation.

## Bidi security scope

Hidden directional controls can change visual order without changing logical
order. BidiLens reports controls, unbalanced formatting, cross-isolate
formatting, and hidden zero-width spaces. Sanitization is explicit because
some controls are legitimate in plain-text protocols. See
`docs/SECURITY.md` for the threat model and non-goals.
