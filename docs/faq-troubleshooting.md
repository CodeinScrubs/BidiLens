# BidiLens Troubleshooting Playbook & Frequently Asked Questions

This guide provides practical solutions to the most frequent layout, streaming, and direction detection issues encountered when developing bidirectional applications.

---

## 1. Punctuation Marks Appear on the Wrong Side of the Line

### Symptom
An exclamation mark or period in an RTL sentence renders at the right end of the line instead of the left margin:
```
!سلام دنیا (Wrong: exclamation mark stuck on the right)
سلام دنیا! (Correct: exclamation mark resting on the left margin)
```

### Root Cause
Neutral characters (punctuation, spaces, brackets) take on the directional level of the surrounding text or the container's base direction. If the container defaults to `dir="ltr"` (the web default), trailing punctuation is resolved as LTR, pushing it to the right margin.

### Solution
Wrap the text in a container with `dir="rtl"` or use BidiLens to automatically set the direction:
```tsx
import { BidiText } from '@bidilens/react';

<BidiText text="سلام دنیا!" />
// Renders: <span dir="rtl">سلام دنیا!</span>
```

---

## 2. Why Does Native `dir="auto"` Pick the Wrong Direction?

### Symptom
A paragraph starting with an English command (`npm run build`) followed by Arabic or Persian instructions renders entirely Left-to-Right, causing all subsequent RTL sentences to misalign.

### Root Cause
The HTML specification dictates that `dir="auto"` scans only for the **first strong directional character** (Rules P2/P3 of UAX #9). The letter `n` in `npm` is classified as strong LTR (`L`), so the browser locks the entire paragraph to LTR regardless of the remaining content.

### Solution
Use BidiLens content-majority analysis:
```ts
import { detectDirection } from '@bidilens/core';

// BidiLens inspects all strong characters, excluding known technical tokens:
const dir = detectDirection('npm run build را برای ساخت پروژه اجرا کنید.');
console.log(dir); // 'rtl'
```

---

## 3. Streaming Chat Flickering (Hysteresis)

### Symptom
In an LLM chat stream, when an Arabic/Persian assistant begins replying with an English greeting or code snippet, the message container abruptly flips from LTR to RTL mid-sentence.

### Root Cause
Without directional hysteresis, intermediate token batches cause rapid fluctuations between LTR and RTL before the true majority script emerges.

### Solution
Use `createBidiStream()` or `useBidiStream()`. The BidiLens streaming engine implements confidence-weighted hysteresis that holds provisional state until strong directional consensus is established:
```tsx
import { useBidiStream } from '@bidilens/react';

const { snapshot } = useBidiStream({ text: streamingTokenBuffer });
return <div dir={snapshot.direction}>{snapshot.text}</div>;
```

---

## 4. Numbers in RTL Text Render Backwards

### Symptom
Numbers such as `10-15` or phone numbers `+98 912 345 6789` have their components inverted or rearranged.

### Root Cause
Numbers are classified as Weak Directional characters (European Number `EN` or Arabic Number `AN`). Hyphens and plus signs between numbers are treated as European Number Separators (`ES`). When placed inside an RTL block without isolation, neutral punctuation can trigger unexpected run reordering.

### Solution
Isolate numbers and telephone numbers using semantic `<bdi>` elements or BidiLens isolation:
```html
<p dir="rtl">
  شماره تماس: <bdi>+98 912 345 6789</bdi>
</p>
```

---

## 5. Security Alerts: What is "Trojan Source"?

### Symptom
Security scanners flag source code or user submissions containing Unicode characters `\u202E` (`RLO`) or `\u2067` (`RLI`).

### Root Cause
Adversaries use bidirectional override characters to visually disguise executable source code comments or strings, making malicious logic appear benign in code reviews (CVE-2021-42574).

### Solution
Audit untrusted text using BidiLens security scanner:
```ts
import { scanBidiSecurity, sanitizeBidiControls } from '@bidilens/core';

const report = scanBidiSecurity(userInput);
if (report.hasBidiControls) {
  console.warn('Suspicious bidi controls detected:', report.findings);
  const safeText = sanitizeBidiControls(userInput);
}
```
