# Security Policy

Report suspected vulnerabilities privately to the project maintainers before public disclosure. Include a minimal reproduction, affected versions, and expected impact.

BidiLens treats hidden Unicode directional controls as security-relevant because they may alter visual ordering without changing logical character order. The CLI reports overrides and embeddings as higher risk than isolates. Sanitization is opt-in because some controls can be legitimate in plain-text protocols.
