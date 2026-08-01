# Security policy

## Supported versions

The public `0.3.x` npm line and `0.1.x` Android line are supported. The latest
patch release on each line receives security fixes; earlier source snapshots
and superseded patches are not supported.

## Reporting a vulnerability

Use [GitHub Private Vulnerability Reporting](https://github.com/CodeinScrubs/BidiLens/security/advisories/new).
Do not disclose a suspected vulnerability in a public issue. The maintainer
aims to acknowledge a complete report within seven calendar days,
provide a status update within fourteen days, and coordinate disclosure after
a fix or documented risk decision. These are response targets, not a paid
support SLA.

Include a minimal reproduction, affected package/version, expected impact,
whether untrusted content is required, and any suggested remediation.

## Automated security verification

Pull requests, pushes to `main`, and weekly scheduled runs use CodeQL's
`security-extended` queries for JavaScript/TypeScript, Kotlin, C#, Swift, and
Rust. Compiled Kotlin and Swift analysis uses explicit production-relevant
build commands so those sources are extracted rather than silently skipped.
The regular CI workflow also performs the pinned dependency audit and validates
the generated CycloneDX SBOM. These automated gates supplement, but do not
replace, independent security review or private vulnerability reports.

## Bidi security scope

Hidden directional controls can change visual order without changing logical
order. BidiLens reports controls, unbalanced formatting, cross-isolate
formatting, and hidden zero-width spaces. Sanitization is explicit because
some controls are legitimate in plain-text protocols. See
`docs/SECURITY.md` for the threat model and non-goals.
