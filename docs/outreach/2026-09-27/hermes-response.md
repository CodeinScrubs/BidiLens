The current `main` source still has run reversal without a mirror mapping, so the distinction you describe remains relevant.

Our retained [mirroring PR #101641](https://github.com/NousResearch/hermes-agent/pull/101641) includes the odd-level/UTF-16 cluster repair and real `Output` screen, styles/cache/repaint regressions. It was closed on September 6 after being identified as a duplicate of #101628. That earlier PR URL currently returns 404 to me, so I cannot verify its present state and am not claiming the repair has landed.

The retained branch also has combining-mark-on-bracket and RTL-island cases. Its PR records the **historical local** 12-test focused / 235-test Ink results; I have not rerun those against today's main. If maintainers want an active implementation or a fixtures-only contribution, these can be rebased/transplanted rather than creating another duplicate.

One important acceptance boundary: selection currently reads visual cells, so logical `(אבג)` can be selected as `(גבא)`. Glyph mirroring does not fix that pre-existing source-copy problem, nor does it establish Arabic shaping or full UBA conformance. The separate #72508 concerns paragraph-base policy, not this L4 repair.

Prepared with AI assistance and checked against the current bidi source and the retained public PR history.
