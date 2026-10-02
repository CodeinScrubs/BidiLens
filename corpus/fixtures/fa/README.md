# Real-world ChatGPT Persian bidirectional test fixtures

This directory contains 28 schema-validated conformance fixtures derived directly
from real-world OpenAI ChatGPT conversations in Persian and mixed English/Persian.

## Background and problem statement

In real-world LLM chat interfaces (such as ChatGPT, Claude, and Gemini), mixed-direction
Persian text breaks down catastrophically when medical, scientific, or technical terminology
is introduced.

Standard web implementations (such as `<p dir="auto">` or default LTR containers) apply
the Unicode Bidirectional Algorithm's P2/P3 rule ("first strong character"). When an AI
generates a paragraph or sentence that begins with an English technical term, `dir="auto"`
selects LTR. As a result:
- The entire Persian paragraph is laid out left-to-right.
- The leading Latin term appears visually isolated on the far left.
- Persian words flow backwards relative to the paragraph axis.
- Terminal punctuation (periods, question marks, colons) jumps to the opposite margin.
- Neutral arrows (`→`, `←`, `↑`, `↓`) reorder chaotically between RTL and LTR runs.
- Table columns in Markdown invert or misalign.

## Fixture categories

### 1. Leading English terms in Persian paragraphs
- `fa-chatgpt-capsule-001`: `Capsule مثل یک روکش لیز و ضدچسب دور باکتری است.`
- `fa-chatgpt-macrophage-002`: `Macrophage برای بلعیدن باکتری خیلی بهتر عمل میکند...`
- `fa-chatgpt-pyruvate-kinase-003`: `Pyruvate kinase یکی از آن enzymeهایی است...`
- `fa-chatgpt-splenic-macrophages-004`: `1) Splenic macrophages خون از spleen عبور میکند...`
- `fa-chatgpt-spherocyte-005`: `spherocyte واضح ندارد`
- `fa-chatgpt-target-cell-006`: `target-cell pattern تیپیک thalassemia ندارد`
- `fa-chatgpt-reticulocyte-007`: `Reticulocyteها enzyme activity بیشتری...`
- `fa-chatgpt-marginal-zone-028`: `Marginal-zone B cells اینها به polysaccharide capsule...`

### 2. Direction indicators and reaction arrows
- `fa-chatgpt-equation-atp-009`: `PEP + ADP → Pyruvate + ATP`
- `fa-chatgpt-immunology-arrow-010`: `IgG / IgM + C3b → phagocytosis ↑`
- `fa-chatgpt-species-arrow-008`: `S. pneumoniae ← مهمترین`
- `fa-chatgpt-bacteremia-chain-011`: `bacteremia میتواند خیلی سریع بالا برود → sepsis / meningitis / OPSI`
- `fa-chatgpt-pathway-process-027`: `glucose → glycolysis → mitochondria → lots of ATP`
- `fa-chatgpt-bpg-pathway-018`: `PK deficiency = anemia، ولی tissue oxygen delivery...`

### 3. Mixed-script diagnostic tables
- `fa-chatgpt-table-row-pk-019`: `chronic DAT− hemolysis، معمولاً no spherocytes، گاهی echinocytes`
- `fa-chatgpt-table-row-aiha-020`: `spherocytes ولی DAT+`
- `fa-chatgpt-table-row-thalassemia-021`: `microcytosis شدید + target cells`
- `fa-chatgpt-decoder-cell-022`: `2,3-BPG پرتکننده O₂`

### 4. Leading emoji and bullet callouts
- `fa-chatgpt-bottom-line-emoji-012`: `🔴 Bottom line:`
- `fa-chatgpt-memory-hook-emoji-013`: `🧠 تصویر ذهنی`
- `fa-chatgpt-take-home-emoji-014`: `🔑 Take-home:`
- `fa-chatgpt-reality-emoji-015`: `✅ واقعیت: ATP deficiency باعث کاهش بقای RBC...`

### 5. Persian quotations and dialogue
- `fa-chatgpt-quote-persian-016`: `«پس قبلش چرا مشکل ایجاد نمیکنند؟»`
- `fa-chatgpt-quote-slang-017`: `«این آشغالِ بیبرق دیگه رد نمیشه.»`

### 6. Persian affixes on Latin loanwords
- Suffixes like `ها` (plural), `هایی` (indefinite plural), `های` (ezāfe), `اش` (pronominal):
  `macrophageها`, `enzymeهایی`, `slitهای`, `RBCهای`, `Reticulocyteها`, `complicationهایی`.

## Validation

All fixtures in this directory validate against `corpus/fixture.schema.json` via
`scripts/generate-chatgpt-fixtures.ts` and are exercised by `packages/core/src/conformance-chatgpt-fa.test.ts`.
