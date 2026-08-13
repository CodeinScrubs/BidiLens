# Bidi security model

## Assets and trust boundaries

BidiLens can process untrusted chat messages, Markdown, filenames, source-like
text, logs, and model output. The scanner is offline and deterministic. It
does not execute input, fetch links, or infer intent.

## Threats addressed

1. directional overrides or embeddings that make logical and visual code
   order diverge;
2. unbalanced or cross-boundary formatting stacks;
3. isolate/mark controls hidden in identifiers, links, filenames, or prompts;
4. zero-width spaces disguising machine-readable tokens;
5. direction leakage from untrusted inline content into neighboring text;
6. clipboard contamination caused by inserting invisible controls in markup
   channels.

## Scanner modes

- `off`: do not scan;
- `audit`: return all findings without a blocking recommendation;
- `warn`: recommend blocking high-severity findings;
- `strict`: recommend blocking any finding.

Each finding contains a stable code, severity, human message, remediation,
UTF-16 range, code-point range, and control metadata when applicable. The CLI
can emit human, JSON, or SARIF results with UTF-16 line/column semantics.

Detected categories include ALM/LRM/RLM, LRE/RLE/LRO/RLO/PDF,
LRI/RLI/FSI/PDI, deprecated U+206A–U+206F formatting controls, unmatched
pops/openers, formatting that crosses an isolate boundary, and U+200B.

## Secure defaults

- source is preserved and scanning never strips characters;
- sanitization requires an explicit command or API call;
- HTML serialization escapes source before inserting semantic markup;
- the Web Component builds DOM nodes and does not assign untrusted HTML;
- Markdown examples keep dangerous raw HTML disabled;
- markup adapters prefer `<bdi>`/`dir` to invisible control insertion;
- terminal isolate insertion is opt-in and carries a warning;
- recursive CLI scanning skips symbolic links.
- raw-text math delimiter discovery is a single forward scan; repeated
  unmatched delimiters cannot trigger polynomial regular-expression work.
- the optional Unicode download command accepts only two source/destination
  pairs pinned in repository code and verifies each exact SHA-256 before a
  write; untrusted text never reaches that build-time path.

## False-positive policy

Ordinary Persian ZWNJ (U+200C), Arabic/Hebrew combining marks, emoji ZWJ
sequences, and normal RTL letters are not security findings. Dedicated core
tests and corpus cases enforce this. ZWNJ/ZWJ is reported only when embedded
between ASCII identifier characters. U+200B, U+2060, and a midstream U+FEFF
are reported separately because they can disguise machine tokens or
boundaries; a leading U+FEFF is accepted as a decoded byte-order signature.

`sanitizeBidiControls` removes every recognized directional control by default.
Callers can combine risk selection with `removeGroups` to preserve directional
marks or complete isolate/PDI pairs while removing the `embedding-override`
family and deprecated formatting. PDF stays in the atomic embedding/override
family and PDI stays in the isolate family so the sanitizer does not preserve
an opener while silently removing its closer. When groups are supplied, risk
selection uses the family's maximum risk (`high` for embedding/override,
`medium` for isolate/deprecated, and `low` for marks); risk-only calls retain
the original per-control behavior.

## Non-goals

The scanner is not a full compiler, malware detector, confusable/homoglyph
engine, language identifier, or source-language-aware Trojan Source parser.
It cannot decide whether every control is malicious. Host applications should
combine structured findings with file type, syntax, user trust, and review
policy.

## Responsible disclosure

The repository-level `SECURITY.md` records the current reporting channel. A
private reporting channel must exist before public publication.
