# @bidilens/markdown

## 0.3.2

### Patch Changes

- 5eb8595: Reject non-finite detection and stream options instead of allowing NaN to
  silently disable direction decisions or stream locking.
- 5eb8595: Expand the optional Markdown-It peer range to cover 13.x, 14.x, and the current
  15.x host line without exposing any parser's types through the public API. The
  adapter now uses a version-neutral structural runtime boundary instead of
  private `markdown-it/lib/*` declarations, and its own source build runs against
  Markdown-It 15. A packed strict TypeScript/peer consumer gate runs all 932
  canonical cases plus host-structure fixtures through all three parser lines.
  Markdown-It 13 and 14 require identical full reports; Markdown-It 15's upstream
  linkifier is allowed its documented HTML difference while BidiLens block,
  security, and isolation reports remain identical. Each host also passes the
  adapter's finalized batch/stream-equivalence check.
- Updated `@bidilens/core` to `0.3.2`.

## 0.3.1

### Patch Changes

- Updated dependencies [35b2ce6]
- Updated dependencies [61aa9f6]
  - @bidilens/core@0.3.1

## 0.3.0

### Patch Changes

- Updated dependencies [85b80c0]
  - @bidilens/core@0.3.0

## 0.2.0

### Patch Changes

- Updated dependencies [bd39a0d]
  - @bidilens/core@0.2.0

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
