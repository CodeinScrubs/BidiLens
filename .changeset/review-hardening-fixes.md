---
"@bidilens/core": patch
"@bidilens/dom": patch
"@bidilens/markdown": patch
"@bidilens/web-component": patch
---

Keep inline isolation inside paragraph boundaries; improve currency, quoted
path and dollar-math token boundaries; reconcile ambiguous streaming tokens;
and avoid repeated security-stack scans. Preserve host-owned DOM direction,
styles and nodes when reapplying or restoring, and use decoded visible Markdown
prose for block-direction evidence. These fixes originate in the reviewed PR89.
