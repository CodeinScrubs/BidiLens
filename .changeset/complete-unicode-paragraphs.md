---
'@bidilens/core': patch
'@bidilens/react': patch
'@bidilens/cli': patch
---

Treat every Unicode 17 `Bidi_Class=Paragraph_Separator` character as a default
batch and streaming boundary, with matching React, Android, and Rust behavior.
