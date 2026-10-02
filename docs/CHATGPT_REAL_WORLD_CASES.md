# Real-World ChatGPT Bidirectional Rendering Breakdowns

## Executive Summary

Conversational AI platforms like OpenAI ChatGPT, Anthropic Claude, and Google Gemini
frequently output mixed-script responses in right-to-left languages (Persian, Arabic,
Hebrew, Urdu). In technical, medical, scientific, and software engineering domains,
writers and AI models routinely embed Latin technical terminology within RTL prose.

When rendered using standard browser heuristics (`dir="auto"` or default LTR containers),
these responses suffer severe bidirectional layout breakdowns. The sentences are not
semantically or logically wrong; the underlying string is correct, but standard browser
rendering scrambles the visual presentation.

This document analyzes the root causes of these failures based on authentic transcripts
from OpenAI ChatGPT sessions and documents the BidiLens solution.

---

## The Six Real-World Breakdown Patterns

### 1. Leading English Technical Words in Persian Paragraphs
*Example*:
```text
Capsule مثل یک روکش لیز و ضدچسب دور باکتری است.
Macrophage برای بلعیدن باکتری خیلی بهتر عمل میکند...
1) Splenic macrophages خون از spleen عبور میکند...
Pyruvate kinase یکی از آن enzymeهایی است که برای RBC حیاتی است...
```
- **The Defect**:
  Under Unicode Standard Annex #9 (UAX #9) rules P2 and P3 (which govern HTML `dir="auto"`),
  paragraph direction is determined solely by the **first strong directional character**.
  Because words like `Capsule`, `Macrophage`, and `Pyruvate` begin with Latin characters
  (`C`, `M`, `P`), the browser assigns `dir="ltr"` to the entire paragraph.
- **Visual Consequence**:
  The paragraph is placed on the left side of the screen. The leading English word appears
  on the far left, while the Persian explanation is pushed to the right or wrapped backwards.
  Sentence-final punctuation (periods, question marks) flips across the screen to the opposite
  margin, and list numbers like `1)` detach from the sentence.
- **The BidiLens Solution**:
  BidiLens's `content-majority` detector analyzes the entire paragraph. Latin technical
  identifiers are excluded from natural-language evidence, allowing the true Persian prose
  majority to establish an `rtl` base direction. The leading Latin word is isolated inside
  `<bdi dir="ltr">`, ensuring correct visual flow from right to left.

---

### 2. Biochemical Equations, Process Chains, and Directional Arrows
*Example*:
```text
PEP + ADP → Pyruvate + ATP
IgG / IgM + C3b → phagocytosis ↑
glucose → glycolysis → mitochondria → lots of ATP
ATP ↓ → RBC membrane maintenance/deformability خراب → RBC در spleen گیر میکند → chronic hemolysis
S. pneumoniae ← مهمترین
```
- **The Defect**:
  Arrows (`→` U+2192, `←` U+2190, `↑` U+2191, `↓` U+2193) and mathematical symbols
  (`+`, `/`, `=`, `−`) have the Unicode Bidi Class `ON` (Other Neutral). Under UAX #9 rules
  N1 and N2, neutral characters between opposite-direction runs (LTR and RTL) take the base
  direction of the containing block.
- **Visual Consequence**:
  When a reaction or pathway links Latin medical terms with Persian clinical explanations,
  the arrows jump across the line. In `S. pneumoniae ← مهمترین`, an LTR base misplaces the
  arrow and reverses the visual association between the organism and its clinical importance.
- **The BidiLens Solution**:
  Biochemical formulas and standalone equations are recognized as technical ranges and
  rendered with an explicit LTR base, while mixed pathway chains in Persian context retain
  RTL alignment with isolated Latin nodes.

---

### 3. Mixed-Script Diagnostic and Differential Tables
*Example*:
```markdown
| بیماری | سرنخ |
| --- | --- |
| PK deficiency | chronic DAT− hemolysis، معمولاً no spherocytes، گاهی echinocytes |
| HS | spherocytes + MCHC↑ + EMA abnormal |
| Warm AIHA | spherocytes ولی DAT+ |
| G6PD deficiency | bite cells / Heinz bodies + episodic oxidant trigger |
| Thalassemia | microcytosis شدید + target cells |
| Sickle cell disease | sickled cells / Hb electrophoresis |
```
- **The Defect**:
  Markdown parsers typically output `<table>` elements without a `dir` attribute, inheriting
  the document default (LTR in most web apps). While individual cells might have mixed text,
  the table's structural column order remains LTR: column 1 (`بیماری`) is rendered on the
  left, and column 2 (`سرنخ`) on the right.
- **The BidiLens Solution**:
  The BidiLens Markdown adapter inspects table headers and cells. When column headers or
  majority rows are RTL, the `<table>` element receives `dir="rtl"`, aligning the primary
  diagnostic column (`بیماری`) to the right margin as expected by RTL readers, while
  technical symptom descriptions inside cells maintain individual inline isolation.

---

### 4. Persian Grammatical Suffixes Attached to Latin Technical Stems
*Example*:
```text
macrophageها (macrophages)
enzymeهایی (enzymes)
slitهای (slits)
RBCهای (RBCs)
Reticulocyteها (reticulocytes)
complicationهایی (complications)
```
- **The Defect**:
  In Persian scientific writing, plural suffixes (`ها`, `های`, `هایی`) or pronominal suffixes
  (`اش`, `مان`) are often appended directly to Latin loanwords or separated by a zero-width
  non-joiner (ZWNJ `\u200C`). Naive boundary tokenizers break at the Latin-Arabic script
  transition, isolating the Latin root as LTR and treating the Persian suffix as a disconnected
  fragment.
- **The BidiLens Solution**:
  BidiLens preserves grapheme cluster continuity and recognizes loanword suffix bindings,
  ensuring that the affix remains logically and visually coupled to its term without
  corrupting surrounding punctuation.

---

### 5. Leading Emojis, Bullet Points, and Memory Hooks
*Example*:
```text
🔴 Bottom line:
🧠 تصویر ذهنی
🔑 Take-home:
🧭 Big picture
✅ واقعیت: ATP deficiency باعث کاهش بقای RBC و splenic destruction میشود.
```
- **The Defect**:
  Emojis (e.g. `🔴`, `🧠`, `🔑`, `🧭`, `✅`) are neutral characters. In standard engines,
  the scanner advances past the emoji to find the first strong character. When the heading
  label is English (`Bottom line:`) followed by Persian text, or vice versa, the entire block
  can be misaligned.
- **The BidiLens Solution**:
  BidiLens skips leading emoji symbols during boundary classification and evaluates the
  semantic weight of the full block rather than halting at the first strong code point.

---

### 6. Disproportionate Latin Character Volume in Persian Sentences
*Example*:
```text
spherocyte واضح ندارد
target-cell pattern تیپیک thalassemia ندارد
```
- **The Defect**:
  Multi-syllabic English medical words (e.g., `spherocyte` = 10 chars, `thalassemia` = 11 chars)
  have high character counts, whereas Persian function words (`از`, `به`, `در`, `را`, `ندارد`)
  are concise. In short sentences with 1 English term and 2 Persian words, raw character
  counting can yield 10 Latin vs 9 Arabic characters, incorrectly choosing LTR.
- **The BidiLens Solution**:
  BidiLens allows callers to pass domain-specific `technicalIdentifiers` or use semantic
  token weighting, preventing technical loanwords from overriding the grammatical host language.

---

## Integration Guide for OpenAI / LLM Chat Interfaces

To eliminate these breakdowns out-of-the-box, an LLM chat frontend can integrate BidiLens
at any of three layers:

### Layer A: Markdown Parser (Zero UI Code Changes)
```typescript
import markdownIt from 'markdown-it';
import { markdownItBidi } from '@bidilens/markdown';

const md = markdownIt({ html: true });
markdownItBidi(md, {
  strategy: 'content-majority',
  fallback: 'ltr',
  isolateInline: true
});

// Render incoming chat completion markdown:
const safeHtml = md.render(chatGptResponseMarkdown);
```

### Layer B: React Chat Bubble Component
```tsx
import React from 'react';
import { BidiText } from '@bidilens/react';

export function ChatMessage({ content }: { content: string }) {
  return (
    <BidiText
      as="div"
      className="prose chat-message"
      strategy="content-majority"
    >
      {content}
    </BidiText>
  );
}
```

### Layer C: DOM / Web Component Observer
```html
<script type="module" src="https://unpkg.com/@bidilens/web-component/dist/auto.js"></script>
<!-- All <bidi-markdown> and <bidi-text> containers automatically resolve -->
```

## Summary Table: Real-World Conformance

| Encountered Sentence / Pattern | First-Strong (dir="auto") | BidiLens Direction | Visual Integrity |
| :--- | :--- | :--- | :--- |
| `Capsule مثل یک روکش لیز و ضدچسب دور باکتری است.` | ❌ LTR (Broken) | ✅ RTL | Pristine |
| `Macrophage برای بلعیدن باکتری...` | ❌ LTR (Broken) | ✅ RTL | Pristine |
| `1) Splenic macrophages خون از spleen...` | ❌ LTR (Broken) | ✅ RTL | Pristine |
| `Pyruvate kinase یکی از آن enzymeهایی است...` | ❌ LTR (Broken) | ✅ RTL | Pristine |
| `PEP + ADP → Pyruvate + ATP` | ❓ Host dependent | ✅ LTR | Formula preserved |
| `S. pneumoniae ← مهمترین` | ❌ LTR (Flipped) | ✅ RTL | Organism points to rank |
| `بیماری \| سرنخ` table | ❌ LTR table | ✅ RTL table | Primary column at right |
| `«این آشغالِ بیبرق دیگه رد نمیشه.»` | ❓ Quote error | ✅ RTL | Dialogue preserved |
