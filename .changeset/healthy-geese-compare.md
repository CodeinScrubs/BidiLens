---
'@bidilens/markdown': patch
---

Expand the optional Markdown-It peer range to cover 13.x, 14.x, and the current
15.x host line without exposing any parser's types through the public API. The
adapter now uses a version-neutral structural runtime boundary instead of
private `markdown-it/lib/*` declarations, and its own source build runs against
Markdown-It 15. A packed strict TypeScript/peer consumer gate runs all 932
canonical cases plus host-structure fixtures through all three parser lines.
Markdown-It 13 and 14 require identical full reports; Markdown-It 15's upstream
linkifier is allowed its documented HTML difference while BidiLens block,
security, and isolation reports remain identical. Each host also passes the
adapter's finalized batch/stream-equivalence check.
