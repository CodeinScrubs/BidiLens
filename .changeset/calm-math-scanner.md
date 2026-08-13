---
'@bidilens/core': patch
---

Replace the raw-text math delimiter regular expression with a forward scanner
so repeated unmatched `\(` input stays linear instead of triggering
polynomial backtracking.
