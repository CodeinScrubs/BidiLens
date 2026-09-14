---
"@bidilens/dom": patch
---

Keep DOM restoration within adapter-owned boundaries: do not normalize
unrelated text nodes, and track generated isolates by node identity rather
than marker attributes. Preserve excluded editor selection anchors and
author-supplied or cloned marker-like markup during reapplication and cleanup.
