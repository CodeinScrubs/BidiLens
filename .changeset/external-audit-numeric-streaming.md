---
"@bidilens/core": patch
"@bidilens/svelte": patch
---

Keep compact grouped numbers, Persian/Arabic numeric separators, and percentage
signs in one technical unit. Avoid repeatedly searching numeric suffixes at
every group separator. Recognize closed multiline display math and bracketed
math without crossing generated paragraph controls. Reconcile unfinished
bracketed math at observable stream boundaries, preserve URL lexical context,
and avoid caching incomplete URL schemes as stable paths.

Make Svelte source updates transactional: a rejected append after finish must
not change cached source or publish a new snapshot.
