# Adoption strategy

No downstream production adoption is claimed. The safest first use is a small,
measured pilot in an open-source web chat renderer.

The [public outreach log](OUTREACH_LOG.md) distinguishes submitted proposals,
merged contributions, and evidence still needed. Native fixes have merged in
[Streamdown #569](https://github.com/vercel/streamdown/pull/569) and
[CoderAI #3](https://github.com/mohamadreza1368/coderAI/pull/3). These are
upstream contribution results; neither added a BidiLens package dependency.
Production deployment, accessibility certification, and continued package use
still require confirmation from the host.

## Integration sequence

1. Add `@bidilens/core` analysis in telemetry-free shadow mode.
2. Add the user flagship and local language cases to the host's tests.
3. Enable `rehypeBidi`, `markdownItBidi`, `renderBidiHtml`, or `applyBidi` in a
   staging surface with raw HTML disabled.
4. Verify source/log/model payloads remain unchanged. Copied selection should
   preserve the corresponding visible text in logical order; rendered Markdown
   may omit source syntax. An explicit raw-source copy action must return the
   original source exactly.
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
- stored source, source-based search inputs, and model payloads are byte-for-byte
  unchanged; rendered selection/copy preserves visible text in logical order,
  and raw-source copy returns the original input exactly;
- an LTR-only fixture produces no BidiLens DOM/AST attributes, wrappers, or
  inline styles unless `intervention: 'always'` is deliberately configured;
- LTR text nested under an RTL ancestor still receives an explicit LTR base;
- no high-risk control reaches source-like content unnoticed;
- host performance budgets remain within an agreed measured threshold;
- a rollback removes the adapter without data migration.

## Evidence still needed

- at least one real downstream pilot and maintainer feedback;
- native-speaker review of relevant corpus templates;
- real accessibility laboratory results;
- maintainer review and disposition of the current integration submissions;
- refreshed contribution-policy research before contacting any additional AI
  product or following a repository to a successor.

Targets such as merged pull requests, downloads, users, grants, or sponsorship
are future goals and must never be reported as achievements without external
evidence.
