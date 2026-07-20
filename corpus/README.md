# BidiLens conformance corpus

`cases.json` is a deterministic, schema-validated direction corpus. Fixture
`fa-flagship-001` is always first and records the user-provided failure that
motivated BidiLens.

## What the numbers mean

Every non-neutral fixture stores `words` in logical source order. The matching
visual-order field contains the complete `1..N` sequence on the paragraph's
reading axis:

- `expectedVisualOrderRightToLeft` for RTL blocks;
- `expectedVisualOrderLeftToRight` for LTR blocks.

Technical spans are numbered semantically: a URL, email address, filesystem
path, version, command, or similar detected span is one token even when it
contains internal punctuation or spaces. Sentence punctuation outside those
spans remains independently numbered.

This convention makes reviews possible without asking contributors to reason
about storage indexes. Browser geometry and copy-preservation are tested
separately by Playwright; these arrays do not pretend to replace a rendering
engine.

## Provenance and review status

The corpus is generated from committed, authored phrase/token matrices in
`scripts/generate-corpus.ts` plus 196 substantive, technically reviewed seed strings from
the local `v1.3-Her` comparison project. Those seeds live in
`corpus/v1.3-her-seeds`, retain their Apache-2.0 notice, and are tagged
`v1.3-her-review`. It covers Persian, Arabic, Hebrew, Urdu, Pashto, Kurdish
Sorani, English, technical-token placement, structured Markdown, Unicode edge
cases, and neutral content. Each item records its `curation` origin and whether
a native speaker has reviewed it. Imported cases use the explicit
`imported-comparison-corpus` curation value rather than being presented as
canonical authored templates.

The imported text and descriptive tags come from the sibling, but its policy
outputs are not treated as an oracle. Canonical expectations were recomputed
and then frozen: 16 of 196 directions differ from the sibling labels. Thirteen
are technical-only inputs for which BidiLens returns `neutral` instead of
inventing an LTR language direction, one is a raw fenced-code string whose
Persian literal is visible to the plain-text analyzer, and two are genuinely
mixed sentences where content-majority differs from the sibling expectation.
Structured Markdown consumers should use the Markdown adapter, which forces
code and math nodes to LTR independently of plain-text analysis.

The current non-English template and imported-seed cases have technical review
but have **not** been certified by native speakers. The repository reports that distinction in
the corpus command instead of treating generated volume as linguistic proof.
Native review is a release-quality improvement target, not a hidden claim.

## Reproduce and validate

```bash
pnpm run corpus:generate
pnpm run corpus:check
```

The checker validates every fixture against `fixture.schema.json`, rejects
duplicate IDs, verifies numbered-word arrays and protected technical spans,
checks expected direction with
the default policy, verifies declared isolation plans, and confirms that the
CLI's packaged copy is byte-for-byte equivalent.

## Native-speaker review guide

1. Select fixtures tagged with a language you read fluently.
2. Confirm the sentence is grammatical and natural, without changing its
   intended technical token or placement category.
3. Number visible words and final punctuation in logical source order.
4. Confirm a mostly RTL sentence starts at the right edge, while a mostly
   English sentence starts at the left edge.
5. Confirm technical/opposite-direction runs remain internally readable and
   do not pull neighboring punctuation.
6. Update the authored template, regenerate the corpus, and set
   `nativeSpeakerReviewed` only for templates you personally reviewed.
7. Include your language and the reviewed fixture IDs in the pull request.

Do not edit only the generated JSON; regeneration would overwrite it.
