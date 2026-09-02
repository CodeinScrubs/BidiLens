# @bidilens/cli

## 0.3.3

### Patch Changes

- Updated dependencies [f74139f]
  - @bidilens/core@0.3.3
  - @bidilens/html@0.3.3

## 0.3.2

### Patch Changes

- 5eb8595: Treat every Unicode 17 `Bidi_Class=Paragraph_Separator` character as a default
  batch and streaming boundary, with matching React, Android, and Rust behavior.
- Updated `@bidilens/core` and `@bidilens/html` to `0.3.2`.

## 0.3.1

### Patch Changes

- Updated dependencies [35b2ce6]
- Updated dependencies [61aa9f6]
  - @bidilens/core@0.3.1
  - @bidilens/html@0.3.1

## 0.3.0

### Patch Changes

- Updated dependencies [85b80c0]
  - @bidilens/core@0.3.0
  - @bidilens/html@0.3.0

## 0.2.0

### Patch Changes

- Updated dependencies [bd39a0d]
  - @bidilens/core@0.2.0
  - @bidilens/html@0.2.0

## 0.1.1

### Patch Changes

- Publish the synchronized 0.1.1 reliability patch. Neutral-only content now
  inherits host direction consistently across adapters, DOM reapplication
  restores authored inline direction, the Web Component preserves current author
  light DOM when taking ownership, and the CLI validates empty input, corpora,
  versions, and SARIF paths more defensively. Unchanged packages advance with the
  fixed release group so every BidiLens package stays version-aligned.
- Updated dependencies
  - @bidilens/core@0.1.1
  - @bidilens/html@0.1.1
