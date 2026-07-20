# Governance

BidiLens currently has a single-maintainer bootstrap model. No organization,
technical steering committee, or paid support program is implied.

## Decision making

- small compatible changes are reviewed through pull requests;
- direction-policy, security, Unicode, package-format, and compatibility
  changes require tests, documentation, and an ADR when the tradeoff is
  durable;
- native-language judgments require reviewers fluent in the affected language;
- releases require a human maintainer and all documented release gates;
- no automated agent may publish, tag a release, create an account, or submit
  an external patch without explicit human authorization.

## Maintainer identity

The bootstrap maintainer is Shayan SalehiRad
([`@CodeinScrubs`](https://github.com/CodeinScrubs)). CODEOWNERS records the
current review boundary. Additional maintainers may be nominated after a
sustained record of reviewed technical or language contributions. Changes to
maintainership are public governance decisions; security or conduct details
remain private.

## Conduct

Participation is governed by `CODE_OF_CONDUCT.md`. Security reports follow
`SECURITY.md`; ordinary bugs and proposals use the public issue tracker once
the canonical repository exists.
