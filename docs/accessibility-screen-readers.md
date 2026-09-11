<!-- SPDX-License-Identifier: Apache-2.0 -->
# Accessibility Guidelines: Screen Readers and Bidirectional Content

## Overview

Screen readers (such as VoiceOver on Apple platforms, TalkBack on Android, and NVDA/JAWS on Windows) rely on semantic HTML structure and directional cues to pronounce text in the correct sequence. When bidirectional text lacks proper isolation, assistive technologies may announce numbers, punctuation, and mixed phrases in reverse or fragmented order.

---

## WCAG 2.2 Alignment

Applying BidiLens components directly supports:

- **1.3.2 Meaningful Sequence (Level A):** Ensures that when the sequence in which content is presented affects its meaning, a correct reading sequence can be programmatically determined.
- **3.1.2 Language of Parts (Level AA):** Assisting speech synthesizers by pairing correct inline isolation with appropriate language tags.

---

## Screen Reader Behavior with `<bdi>`

The HTML `<bdi>` element (Bidirectional Isolate) tells the browser to isolate a span from the bidirectional formatting of its surrounding text:

```html
<p dir="rtl">
  نام کاربری: <bdi dir="ltr">john_doe_99</bdi> است.
</p>
```

- **Without `<bdi>`:** A screen reader may announce the trailing `99` before the username or mispronounce the surrounding colon.
- **With `<bdi>`:** The screen reader pauses correctly at isolation boundaries and reads the identifier in natural LTR order before resuming the RTL sentence.
