# Adoption strategy

No downstream production adoption is claimed. The safest first use is a small,
measured pilot in an open-source web chat renderer.

## Integration sequence

1. Add `@bidilens/core` analysis in telemetry-free shadow mode.
2. Add the user flagship and local language cases to the host's tests.
3. Enable `rehypeBidi`, `markdownItBidi`, `renderBidiHtml`, or `applyBidi` in a
   staging surface with raw HTML disabled.
4. Verify source/log/model payloads remain unchanged and copied selection equals
   the logical source.
5. Exercise model-token boundaries and multiple paragraphs.
6. Enable the CLI security audit as a non-blocking CI report, then choose an
   explicit fail policy.
7. Record browser, screen-reader, and native-language review evidence before a
   broad rollout.

## Pilot acceptance criteria

- the host's reproduction of `fa-flagship-001` renders RTL;
- the English mirror case remains LTR;
- code, URLs, paths, and model names remain internally LTR;
- final stream output equals batch direction/isolation results;
- source, copy, search, and model payloads are byte-for-byte unchanged;
- no high-risk control reaches source-like content unnoticed;
- host performance budgets remain within an agreed measured threshold;
- a rollback removes the adapter without data migration.

## Evidence still needed

- at least one real downstream pilot and maintainer feedback;
- native-speaker review of relevant corpus templates;
- real accessibility laboratory results;
- current contribution-policy research and narrowly scoped integration
  dossiers for eligible AI products.

Targets such as merged pull requests, downloads, users, grants, or sponsorship
are future goals and must never be reported as achievements without external
evidence.
