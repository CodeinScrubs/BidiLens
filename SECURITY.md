# Security policy

## Supported versions

No BidiLens package has been published from this checkout. Once `0.1.x` is
published, the latest patch release will receive security fixes; earlier
pre-release snapshots will not be supported.

## Reporting a vulnerability

A private reporting channel is **not configured in this local repository**.
Before public publication, the maintainer must create the public repository,
enable GitHub Private Vulnerability Reporting (or document another monitored
private address), and replace this paragraph with the exact channel and
response expectations.

Until that channel exists, do not disclose a suspected vulnerability in a
public issue. This missing private contact is an explicit publication blocker,
not something the project silently pretends is configured.

Include a minimal reproduction, affected package/version, expected impact,
whether untrusted content is required, and any suggested remediation.

## Bidi security scope

Hidden directional controls can change visual order without changing logical
order. BidiLens reports controls, unbalanced formatting, cross-isolate
formatting, and hidden zero-width spaces. Sanitization is explicit because
some controls are legitimate in plain-text protocols. See
`docs/SECURITY.md` for the threat model and non-goals.
