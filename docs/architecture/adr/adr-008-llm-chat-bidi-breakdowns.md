# ADR-008: Resolving Bidirectional Breakdowns in Conversational AI & Mixed Technical Prose

## Status

Accepted

## Context

Conversational AI platforms (OpenAI ChatGPT, Anthropic Claude, Google Gemini) frequently
generate mixed-direction responses in right-to-left languages such as Persian, Arabic, and Urdu.
In biomedical, scientific, and software engineering domains, models routinely interleave Latin
technical terminology into RTL explanations.

Standard web implementations rely on HTML `dir="auto"` or default LTR containers. Under
Unicode Standard Annex #9 (UAX #9) rules P2/P3, `dir="auto"` selects paragraph direction using
only the **first strong directional character**. When an AI begins a sentence or bullet with an
English technical term (e.g. `Capsule مثل...`, `Macrophage برای...`, `Pyruvate kinase یکی...`),
the entire paragraph is misclassified as LTR:
1. The paragraph aligns left, pushing the leading Latin word to the far left edge.
2. Persian text wraps backwards relative to the paragraph axis.
3. Sentence-final punctuation (periods, question marks, colons) jumps to the opposite margin.
4. Process arrows (`→`, `←`, `↑`, `↓`) have neutral bidi class `ON` and reorder chaotically between LTR and RTL runs.
5. Markdown tables output `<table>` elements without a `dir` attribute, keeping column order LTR even when headers are RTL.
6. Persian plural and grammatical suffixes attached to Latin stems (`macrophageها`, `enzymeهایی`) suffer script-boundary splits.

## Decision

To resolve these breakdowns out-of-the-box in AI chat interfaces:

1. **Biomedical & Scientific Identifiers**:
   Expand `DEFAULT_TECHNICAL_IDENTIFIERS` to include common biomedical and biochemical terms
   (`atp`, `rbc`, `g6pd`, `spleen`, `macrophage`, `capsule`, `hemolysis`, `spherocyte`, `reticulocyte`,
   `glycolysis`, `mitochondria`, `deficiency`, etc.).

2. **Binomial & Complex Alphanumeric Recognition**:
   Add genus-species binomial patterns (`\b[A-Z]\.\s+[a-z]{3,}\b`, e.g. `S. pneumoniae`, `H. influenzae`)
   and alphanumeric chemical notation (`\b\d+,\d+-[A-Z0-9]+(?:\s*[↑↓])?\b`, e.g. `2,3-BPG`) to
   `findTechnicalTokenRanges`.

3. **Loanword Affix Recognition**:
   Detect Persian grammatical suffixes (`ها`, `هایی`, `های`, `ای`, `اش`, `تر`, `ترین`) immediately
   attached to Latin stems. The presence of a Persian affix is conclusive evidence that the Latin
   stem is a borrowed noun in Persian prose, ensuring it is treated as a technical token and does
   not bias the natural-language direction.

4. **Markdown Table Base Direction**:
   Extend `markdownItBidi` to intercept `table_open` / `table_close`. When table headers or majority
   cells are RTL (e.g. `بیماری | سرنخ`), set `dir="rtl"` on `<table>` so that columns order
   right-to-left naturally.

## Consequences

- Real-world ChatGPT Persian medical conversations render with correct RTL reading order out-of-the-box.
- Leading Latin medical terms are isolated inside `<bdi dir="ltr">` without inverting the surrounding Persian sentence.
- Markdown tables with Persian headers order columns correctly from right to left.
- Logical text content, selection, clipboard, and prompts remain 100% byte-for-byte identical.
- Zero extra dependencies, linear scanning performance, and zero regression across the existing test suite.
