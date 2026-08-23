---
'@bidilens/markdown': patch
---

Expand the optional Markdown-It peer range to cover 13.x, 14.x, and the current
15.x host line without exposing any parser's types through the public API. A
packed strict TypeScript/peer consumer gate now runs all 932 canonical cases
plus host-structure fixtures through all three parser lines. Markdown-It 13 and
14 require identical full reports; Markdown-It 15's upstream linkifier is
allowed its documented HTML difference while BidiLens block, security,
isolation, and finalized streaming semantics remain identical.
