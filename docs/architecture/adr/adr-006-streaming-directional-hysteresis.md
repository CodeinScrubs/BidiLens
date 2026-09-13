<!-- SPDX-License-Identifier: Apache-2.0 -->
# ADR-006: Streaming Directional Hysteresis

## Status
Accepted

## Context
When an AI assistant streams an answer token by token (e.g. 1 to 5 characters per chunk), the initial tokens of a paragraph are frequently ambiguous or misleading. For example, a Persian explanation may start with an English greeting (`Sure!`) or code token (`const x = 1;`), followed by a 200-word RTL Persian paragraph.

If the UI recalculates direction on every single chunk using the first-strong-character rule:
1. The container starts in LTR mode.
2. When the first Persian character arrives, the layout abruptly snaps to RTL (visual jitter).
3. If an English acronym arrives later, it may temporarily snap back to LTR.

## Decision
`BidiStreamSession` implements a **directional hysteresis lock**:
1. **Provisional Phase:** While strong characters are below `lockAfterStrongCharacters` (default 8), the direction remains revisable.
2. **Locking Phase:** Once strong characters exceed the threshold by at least `lockMargin` (default 3), the paragraph direction is locked.
3. **Chunk Boundary Invariance:** Completed paragraphs are evaluated authoritatively against the complete accumulated text upon paragraph boundary or `finish()`.

## Consequences
- UI rendering remains visually stable throughout token generation.
- No flickering or margin jumping occurs during streaming.
- Final batch consistency is mathematically guaranteed once a paragraph closes.
