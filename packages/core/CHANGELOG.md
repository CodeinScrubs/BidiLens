# @bidilens/core

## 0.3.0

### Patch Changes

- 85b80c0: Keep whitespace-joined opposite-direction phrases such as `page 97` in source
  order while preserving hard punctuation as semantic fragment boundaries.

## 0.2.0

### Minor Changes

- bd39a0d: Add atomic control-family sanitization, contextual invisible-character
  diagnostics, broad representative RTL-script coverage, and multiline fenced
  code recognition inside surrounding raw-text prose.

## 0.1.1

### Patch Changes

- Publish the synchronized 0.1.1 reliability patch. Neutral-only content now
  inherits host direction consistently across adapters, DOM reapplication
  restores authored inline direction, the Web Component preserves current author
  light DOM when taking ownership, and the CLI validates empty input, corpora,
  versions, and SARIF paths more defensively. Unchanged packages advance with the
  fixed release group so every BidiLens package stays version-aligned.
