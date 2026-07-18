# Bidi Security Model

## Threats

1. **Trojan Source-style visual reordering** in code, diffs, prompts, configuration, or logs.
2. **Direction leakage** where untrusted text changes punctuation placement outside its intended span.
3. **Clipboard contamination** caused by invisible controls injected into rendered content.
4. **Prompt ambiguity** where visual and logical orders differ before text is sent to a model.
5. **Identifier spoofing** involving mixed scripts, which is adjacent to but distinct from bidi control attacks.

## Controls

- Prefer semantic HTML isolation over inserted controls.
- Treat LRO, RLO, LRE, RLE, and PDF as high-risk in source-like content.
- Show visible names and indexes for controls in diagnostics.
- Make destructive sanitization explicit and preserve an audit report.
- Force code and machine identifiers to LTR with isolation.
- Never use CSS reversal (`direction: rtl` plus manual string reversal) as a repair.

## Non-goals

BidiLens v1 does not implement full confusable detection, script-mixing policy, source-language parsing, or malware scanning. These can be integrated later through the audit result API.
