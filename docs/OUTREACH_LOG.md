# Public outreach log

**Initial outreach evidence date:** 2026-07-30

**Last response audit:** 2026-09-01

This log records public requests for review and bounded organizational
role-address outreach. Public routes are independently link-verifiable; email
sends are verifiable only in the sender's mailbox. Neither kind of submission
is an external audit, merge, pilot, adoption, deployment, or company
endorsement.

## Submission rules

- Search for existing reports and contribution policy before contacting a
  project.
- Use an existing canonical issue or discussion instead of creating a
  duplicate.
- Offer one host-specific renderer change, fixture, or pilot rather than asking
  a company to replace its entire bidi stack.
- Disclose that the author maintains BidiLens and never imply host endorsement.
- Keep logical source unchanged and explain host-specific limits, especially
  terminal shaping and non-public renderer source.
- Do not add BidiLens as a dependency when the host's language, runtime support,
  dependency policy, or existing renderer makes a smaller native patch safer.
- Prefer the project's public contribution channel. If a publicly listed
  organizational role address is also used, send one personalized routing
  request; never scrape personal addresses, BCC a list, or imply endorsement.
- Do not repeatedly bump a thread without new evidence or a maintainer request.

## Live submissions

| Project | Public route | State on evidence date | Scope and boundary |
|---|---|---|---|
| NousResearch Hermes Agent | [PR #72508](https://github.com/NousResearch/hermes-agent/pull/72508) | Open and mergeable; automated `hermes-sweeper` review recommended keeping it open with high salvageability; awaiting human maintainer review | Focused TUI implementation and tests. Uses Hermes's existing `bidi-js`, preserves the earlier test contributor's authorship, adds majority/tie/no-op coverage, and keeps an ASCII identity fast path. The focused 8-test suite, TypeScript check, Ink build, ESLint, Prettier, and diff check passed. The automated review rechecked current `main`, found the premise still present at the proposed renderer boundary, and reported no verified problem in the two-file diff. The host currently exposes no automated PR checks for this contribution, and automation is not maintainer approval. |
| Google Antigravity CLI | [feature request #693](https://github.com/google-antigravity/antigravity-cli/issues/693) | Open | The public repository exposes documentation/examples rather than the product renderer. The request supplies the failure fixture and policy, asks for the correct contribution path, and offers a focused patch. |
| Anthropic Claude Code | [comment on canonical RTL issue #76712](https://github.com/anthropics/claude-code/issues/76712#issuecomment-5088070430) | Parent issue open | Adds the English-first/Persian-majority gap left by first-strong CSS, a per-block webview plan, composer guidance, and an offer to patch a public renderer boundary. No duplicate issue was opened. |
| OpenAI Codex app/extension | [comment on issue #21563](https://github.com/openai/codex/issues/21563#issuecomment-5088082477) | Parent issue open | Proposes a native render-boundary integration that does not patch application files or stored chats and distinguishes content direction from global layout. |
| OpenAI Codex CLI | [comment on issue #34871](https://github.com/openai/codex/issues/34871#issuecomment-5088082730) | Parent issue open | Separates bidi ordering from Arabic shaping and terminal capabilities. It offers the policy/corpus for a native Rust design rather than proposing a JavaScript dependency. |
| OpenAI Codex community | [Show and tell #35557](https://github.com/openai/codex/discussions/35557) | Open | Public technical introduction, package/corpus summary, current integration evidence, limitations, and request for renderer/i18n review. |
| Cline | [comment on feature discussion #12089](https://github.com/cline/cline/discussions/12089#discussioncomment-17793649) | Discussion open | Links the open renderer regression, supplies the mixed-content acceptance case, and offers a React/webview pilot or fixtures-only patch. |
| Cline VS Code webview | [PR #12724](https://github.com/cline/cline/pull/12724) | Open but currently conflicting/dirty; hosted checks on the current head pass, and maintainer review is still required | Applies `@bidilens/markdown` at the existing React Markdown render boundary and adds Persian-majority, English-majority, and pure-English identity tests. Quality, unit, platform-integration, VS Code on Ubuntu/Windows, E2E on Ubuntu/macOS/Windows, and both Socket security checks passed; the branch needs an upstream conflict-resolution update before it can merge. |
| Continue | [comment on issue #2767](https://github.com/continuedev/continue/issues/2767#issuecomment-5088124777) | Parent issue closed; reconsideration requested | Replaces the proposed global RTL rule with Auto/LTR/RTL policy and offers a focused GUI or fixtures-only patch. No new duplicate issue was created. |
| assistant-ui | [Show and tell #5211](https://github.com/assistant-ui/assistant-ui/discussions/5211) | Open | Distinguishes the project's completed logical-layout work from per-message mixed-content direction and offers a documented `@bidilens/react` streaming recipe, adapter, hook, or fixtures-only path. |
| AnythingLLM | [comment on canonical RTL issue #3430](https://github.com/Mintplex-Labs/anything-llm/issues/3430#issuecomment-5126056699) | Parent issue open | Supplies a per-block acceptance fixture and integration guidance. [BidiLens PR #57](https://github.com/CodeinScrubs/BidiLens/pull/57) addresses the Markdown-It 13/14/15 peer/type gap with packed cross-version evidence, but AnythingLLM's Node 18 floor still conflicts with BidiLens 0.3's Node 22.12 minimum; a native fixtures-only patch remains the non-regressive route unless that runtime boundary changes. |
| Vercel Streamdown | [PR #569](https://github.com/vercel/streamdown/pull/569) | Merged on 2026-08-14 after maintainer approval; no downstream adoption claim is inferred | Adds a dependency-free native rehype pass because Streamdown supports Node 18. It assigns direction per semantic block, keeps code LTR, uses content majority with a first-strong tie-breaker, preserves pure-LTR behavior, and included 985 passing package tests plus a production ESM/declaration build. The implementation is now upstream in Streamdown; this is host-integration evidence, not a claim that Vercel adopted BidiLens as a dependency. |
| Sentry | [feature request #120893](https://github.com/getsentry/sentry/issues/120893) | Open on the design-engineering backlog at low priority; a Sentry maintainer does not expect the BidiLens dependency to be adopted | Proposes content-aware behavior at Sentry's shared React Markdown renderer and Seer wrapper. After the maintainer noted Sentry's existing i18n tooling, the follow-up explicitly preferred a native/local implementation, offered fixtures only if requested, and committed not to bump the issue. This is backlog evidence, not dependency adoption. |
| PostHog | [feature request #75474](https://github.com/PostHog/posthog/issues/75474) | Open | Proposes per-block handling in `LemonMarkdown` and PostHog AI's already memoized `MarkdownMessage` blocks. The public feature tracker was used instead of the automated email's sales-demo form, which requires company, role, and monthly-active-user data and is not an appropriate open-source engineering route. |

The public endpoints above cover eleven project families and fourteen
repository-specific routes. Hermes and Cline contain focused host code, and
the Streamdown implementation in PR #569 merged on 2026-08-14; the remaining
routes are issue or discussion submissions. No downstream pilot or
production-adoption confirmation is claimed.

## Authenticated follow-up routes

| Project/channel | Current evidence | Action taken |
|---|---|---|
| JetBrains AI Assistant YouTrack | JetBrains support directed the proposal to the public AI Assistant tracker. A duplicate search found the directly matching, open, assigned [LLM-25407](https://youtrack.jetbrains.com/issue/LLM-25407/Arabic-RTL-Bidirectional-text-rendering-issue-in-Codex-input-field), so no duplicate was created. | Pending account authentication: add one implementation-focused comment with the English-first/Persian-majority fixture, BidiLens corpus and limitation links, and an offer of a scoped renderer patch. |
| Nous Research support | The automated receipt for the original proposal assigned reference `T-1645`, while Hermes PR #72508 remained open without human review. | Sent one short follow-up on 2026-08-13 pointing directly to the PR and asking for routing to the Hermes TUI maintainer. |
| n8n support | Senior support engineer Mo Hamdy confirmed the supported contribution route is an n8n Community feature request before any enhancement PR. He also confirmed that `@n8n/chat` uses Markdown-It without raw HTML and that a third-party dependency needs prior maintainer agreement. | A concise reply and [community proposal](outreach/N8N_COMMUNITY_PROPOSAL.md) are drafted, committing to a dependency-free-first approach: fixtures and a native renderer pattern, with BidiLens optional. Sending and posting remain pending explicit user confirmation. |

## Direct organizational outreach

On 2026-07-30, 50 individually addressed messages were sent to 50 unique,
publicly listed organizational role addresses. Each message had a unique
subject and body, named a relevant product or rendering surface, linked the
repository, made no adoption or endorsement claim, and asked for technical
review or routing. No BCC, scraped personal address, privacy/legal/security
inbox, attachment, tracking pixel, or automated follow-up was used.

Two original messages appeared in Sent but produced immediate delivery
failures: the Project Jupyter general list required Google Groups posting
permission, and the former Gradio administrative address was no longer
receiving mail. Neither was counted as delivered. Transparent replacements
were sent to Jupyter's officially documented Community Building Working Group
address, which is open for public posting, and to the team address in Gradio's
current project metadata. The final failure audit found no additional immediate
failure. This does not prove inbox placement, human review, or delivery after
the audit window. Several automated acknowledgements arrived, but no
acknowledgement is recorded as maintainer review or adoption.

### Response audit (2026-08-01)

The outreach inbox was reviewed after the initial delivery window. Replies were
classified before responding so automated receipts, closed support threads,
unmonitored addresses, and delivery failures did not receive follow-up mail.

| Project/channel | Response | Action taken |
|---|---|---|
| Jupyter Community Building | A community maintainer welcomed the project and directed the proposal to Jupyter Zulip, suggesting `#jupyterlab` or `#ask-anything`. | Replied with a fixtures-first plan for Markdown and rich output and accepted the public-channel handoff. |
| Zulip | The customer-experience lead identified [issue #39511](https://github.com/zulip/zulip/issues/39511) and the existing `#issues` topic for mixed LTR/RTL messages. | Replied that the issue directly overlaps the proposal, clarified the per-paragraph and inline-isolation scope, and committed to continue with small before/after fixtures in the public topic. |
| Zed | A Zed representative confirmed that more RTL support is useful but stated that a non-Rust dependency is a non-starter. | The original reply accurately disclosed that no Rust port existed at that time. After [native Rust core PR #31](https://github.com/CodeinScrubs/BidiLens/pull/31) merged, a focused follow-up supplied the source-only status, 928-case/207-isolation evidence, Rust 1.85 target, and final Linux/macOS/Windows CI result. No response to that follow-up, Zed integration, or adoption is claimed. |
| Ollama | The support AI requested product feedback in problem/current-behavior/expected-behavior form. After receiving that clarification, it confirmed the submission contains the information its team uses for feature review and made no timeline or adoption commitment. | Sent one structured clarification with the repository and regression-corpus context; stopped after the automated confirmation to avoid an AI-response loop. |
| n8n | Senior support engineer Mo Hamdy replied with the public feature-request route and renderer constraints: Markdown-It, no raw HTML, and prior maintainer agreement before adding a dependency. | Prepared a human reply and a narrower community proposal strategy that leads with fixtures and a native renderer change. BidiLens PR #57 independently adds verified Markdown-It 13/14/15 compatibility, but it is not presented as a dependency mandate. |
| Nous Research | An automated receipt assigned support reference `T-1645` and promised a later follow-up. | After no human response arrived, sent one short follow-up on 2026-08-13 that points directly to Hermes PR #72508 and asks for routing to the TUI maintainer. The public PR remains the primary technical channel. |
| JetBrains and Sentry | These responses routed the proposal to public trackers. | The resulting tracker evidence is recorded above; no redundant support-email reply was sent. |
| PostHog | An automated response identified an unmonitored inbox and linked support and sales-oriented routes that were unsuitable for an open-source engineering proposal. | No email reply was sent. The public feature request recorded above was opened independently. |
| Cohere, Supabase, Microsoft, and delivery systems | The messages were acknowledgements, account-verification instructions, unmonitored-address notices, or delivery failures. | No reply was sent because none represented maintainer review or an actionable technical question. |

These responses are routing evidence, not adoption evidence. Streamdown's
native implementation is the one recorded upstream merge; no organization
has approved a BidiLens dependency or confirmed a production rollout.

### Response audit (2026-08-13)

The same outreach threads were checked again before any follow-up. No additional
human reply was found after the previously recorded Jupyter, Zulip, and Zed
exchanges. Automated receipts and support routing messages are not counted as
human review.

| Project/channel | New evidence | Action on the evidence date |
|---|---|---|
| Sentry | A design-engineering maintainer placed the behavior on the team's low-priority backlog, said Sentry already has i18n tooling, and did not expect to adopt the BidiLens dependency. | Replied once that the behavior is the request, not a dependency mandate; preferred a native/local implementation; offered a small fixture if requested; and committed not to bump the issue. |
| Cline | PR #12724 had become conflicting with current upstream. After a narrow rebase, only the lockfile required regeneration; the component, package manifest, and regression tests applied cleanly. The current GitHub state is again marked conflicting/dirty, although its hosted checks remain green. | The prior rebase and CI evidence are preserved. No further force-push is planned without a maintainer request or action-specific confirmation; no maintainer approval is claimed. |
| Nous Research | Support reference `T-1645` remains an automated receipt with no human follow-up. Separately, `hermes-sweeper` revalidated PR #72508 against current `main`, found no verified problem, and recommended keeping it open with high salvageability. | Kept the public PR as the primary technical channel and sent one short routing follow-up on 2026-08-13. Automation is not human review; no additional follow-up is planned without a reply. |
| n8n | Senior support engineer Mo Hamdy supplied an actionable public route and technical constraints on 2026-08-13. | Drafted a reply that follows his guidance and converted the Markdown-It 13 peer/type incompatibility into BidiLens PR #57 with a strict packed 13/14/15 gate. The reply and community post are not recorded as sent. |
| Jupyter, Zulip, Zed, Ollama, JetBrains, PostHog, Cohere, Supabase, Microsoft, and delivery systems | No new actionable human email response was found beyond the earlier audit. | No additional email was sent: these threads were already handled, routed to public channels, automated-only, unmonitored, rejected, or delivery failures. |

The August 13 audit adds one maintainer backlog disposition and stronger hosted
CI/automation evidence. It does not, on its own, add a merge, downstream pilot,
production deployment, endorsement, or company adoption claim.

### Response audit (2026-08-23)

The project mailbox was checked again through 2026-08-23. No new human
maintainer reply or adoption decision was found after the August 13 audit. The
following status is current:

| Project/channel | Current evidence | Action on the evidence date |
|---|---|---|
| Jupyter Community Building | Matt Fisher's latest message remains the August 3 handoff to Jupyter Zulip; the thread contains no newer technical response. | No new email was sent. The next valid route remains a focused public topic in `#jupyterlab` or `#ask-anything` with the screenshot-derived fixtures. |
| Zulip | Emily Sutherlin's latest reply still points to issue [#39511](https://github.com/zulip/zulip/issues/39511) and its existing `#issues` topic. | No duplicate issue or reminder was posted. The previously stated fixtures-first plan remains the appropriate next step. |
| Ollama | The latest response is an automated support confirmation that the problem/current-behavior/expected-behavior format is useful; it makes no timeline or adoption promise. | No further reply was sent; the automated loop was intentionally stopped. |
| n8n | Mo Hamdy's August 13 guidance remains the only actionable maintainer-routing response: open a Community feature request first, lead with a native/dependency-free proposal, and keep raw HTML disabled. | The reply and [community proposal](outreach/N8N_COMMUNITY_PROPOSAL.md) remain drafts. Nothing was posted or sent during this audit. |
| JetBrains, Sentry, Zed, Nous Research, Expo, Microsoft, and other role-address threads | The latest messages are routing instructions, automated acknowledgements, or unmonitored-address notices; none is a maintainer approval or merge decision. | No unsolicited follow-up was sent. Public tracker/PR routes remain the source of truth. |
| Account/security notifications | Recent Google/Anthropic messages concern sign-in or account-data sharing, not BidiLens review. | No security links were followed and no account settings were changed. |
| Public PR status | Vercel Streamdown PR #569 is merged; Hermes PR #72508 remains open with no human review; Cline PR #12724 is open but currently conflicting/dirty despite green hosted checks. | Updated this log from the live GitHub state; no external PR was edited or force-pushed during the audit. |

This audit is an inbox snapshot, not proof of delivery, reading, or product
adoption. Existing drafts were preserved. Any public forum post, tracker
comment, or email reply still requires an action-specific confirmation at the
time it would be sent.

### Response and release audit (2026-08-24, historical snapshot)

The signed-in project mailbox was checked through August 24, 2026. No new
human maintainer reply, review decision, or adoption confirmation was found
after the August 13 responses. The only project-adjacent messages after
August 22 were Google account-data notices for Claude and opencode.ai; no
security links were followed and no account settings were changed.

The BidiLens host-integration work is tracked in [PR #57](https://github.com/CodeinScrubs/BidiLens/pull/57). The source behavior reviewed in this audit is committed in `8386684`, including the Unicode paragraph-boundary alignment; later documentation-only commits did not alter that behavior. At the time of this snapshot:

- the PR is open and remains a draft for maintainer review;
- the branch is mergeable and the protected status is clean;
- all required CI and CodeQL jobs pass, including Rust formatting, tests, the
  Android and Apple gates, Windows, three-browser visual checks, packed Node
  consumers, dependency audit, and Markdown-It 13/14/15 compatibility;
- the stale protected status context was corrected from the old 13/14 label to
  the current 13/14/15 compatibility check, without changing source-branch
  review requirements.

External status is unchanged: Hermes PR #72508 is open without a human review
decision, Cline PR #12724 remains open and conflicting/dirty with review still
required, and Streamdown PR #569 remains the one recorded upstream merge. No
external PR was edited, force-pushed, merged, or commented on during this
audit. The current Markdown-It 15 compatibility target is supported by the
upstream 15.0.1 release; BidiLens continues to pin reproducible Unicode 17
data until Unicode 18 leaves its prepublication/beta period.

This audit is evidence of current checks and routing only. It does not prove
delivery, maintainer review, production deployment, or adoption.

### Response and release audit (2026-09-01)

The signed-in project mailbox was searched for BidiLens, bidirectional-text,
RTL, and contacted-organization replies after August 24. No new maintainer
reply, review decision, routing instruction, rejection, or adoption claim was
found. Account, newsletter, and product messages mentioning AI vendors were
not treated as project responses; no security link was followed, no message
was sent, and existing drafts were preserved.

The public routes were refreshed independently of email. Hermes PR #72508 is
still open without a human review or exposed status checks. Cline PR #12724 is
still open, review-required, and conflicting despite its previously successful
hosted checks. Streamdown PR #569 remains merged. The Antigravity, Claude Code,
and two Codex issues remain open without a new maintainer response to the
BidiLens proposals. No external issue, PR, discussion, or comment was changed
during this audit.

The local `0.3.1` candidate passed the complete static gate, all 30
Chromium/Firefox/WebKit tests, all 12 packed type-layout checks, the
Markdown-It 13.0.2/14.3.1/15.0.1 compatibility matrix, dependency audit,
CycloneDX validation, and workflow lint. GitHub-hosted results for any newer PR
head remain pending until that head is pushed; the live PR page is the
authoritative status source. These checks are engineering evidence, not proof
of downstream adoption or universal rendering correctness.

### Release completion update (2026-09-01)

After the mailbox/public-route snapshot above, the protected release sequence
completed without changing any external outreach thread:

- publication workflow
  [`33473857928`](https://github.com/CodeinScrubs/BidiLens/actions/runs/33473857928)
  published all 12 `@bidilens/*@0.3.1` packages through OIDC trusted
  publishing and verified their registry integrity;
- every package independently resolved as `latest@0.3.1` with SLSA provenance,
  and retained tarball SHA-256 values matched the publication manifest;
- annotated tag and immutable release
  [`v0.3.1`](https://github.com/CodeinScrubs/BidiLens/releases/tag/v0.3.1)
  were created at exact published commit
  `7bd93c83e43b91923e7f8cf6685264b433c662b8`, with all 12 tarballs, the
  manifest, and CycloneDX 1.7 SBOM attached;
- BidiLens [PR #57](https://github.com/CodeinScrubs/BidiLens/pull/57) passed all
  24 required contexts and merged as `5eb8595babcca4d53af7c6f9d859285a63f9e08f`.

This is release and repository-maintenance evidence only. Hermes and Cline
remain unmerged external submissions, Streamdown remains the one recorded
upstream merge, and no additional company adoption is claimed.

## Deliberate deferrals

| Project/channel | Decision | Reason |
|---|---|---|
| Google Gemini CLI | Do not submit a duplicate now | Maintainers closed [issue #25478](https://github.com/google-gemini/gemini-cli/issues/25478) after stating that they had no immediate plan to address it, then closed the associated unmerged [PR #25243](https://github.com/google-gemini/gemini-cli/pull/25243). Re-contact requires a reopened issue, changed policy, or materially new maintainer-requested evidence. |
| Archived repositories | Do not contact | An archived repository cannot accept a normal upstream implementation. Follow its active successor instead, after re-running policy and duplicate research. |
| Mass/BCC, private-person email, or direct messages | Not used | The email wave used separate, personalized messages to public organizational role addresses. Personal addresses, shared-recipient blasts, and private social messages remain out of scope. |
| Unrelated AI SDKs and model repositories | Not contacted | A model API without a message renderer is not an honest integration target. Contact begins only when a specific rendering boundary or conformance use is identified. |

## Follow-up protocol

1. Respond to maintainer questions with a minimal reproduction, benchmark,
   test, or smaller patch; do not answer with generic promotion.
2. For PRs #72508 and #12724, keep the branches available and rebase only
   when requested or when a real conflict appears. PR #569 is merged and needs
   no branch maintenance. Never force-push over review history without
   explaining why.
3. Do not post a reminder on an unchanged issue or discussion for at least 30
   days. A reminder must include new evidence, such as a released fix, host
   fixture, benchmark, or maintainer-requested implementation.
4. For role-address email, wait at least seven days and send at most one short,
   recipient-specific follow-up. Do not follow up after an opt-out, rejection,
   delivery failure, or route-specific automated instruction.
5. Respect a closure or explicit no-plan decision. Re-contact only after a
   relevant policy/state change.
6. Update this log when a maintainer responds, checks run, a PR changes state,
   or a pilot starts. Preserve old dates/status rather than rewriting history.

## Evidence vocabulary

- **Submitted:** the public URL exists.
- **Sent:** the sender's mailbox recorded the message; this is not proof of
  delivery, inbox placement, reading, or review.
- **Under review:** a maintainer or project automation has begun review/checks.
- **Merged:** the host repository merged the change.
- **Pilot:** the host confirms a bounded deployment with rollback and measured
  results.
- **Adopted:** the host confirms continued use in a released product.

Only the first state is evidenced for most routes above. Of the three focused
code PRs, Streamdown is merged while Hermes and Cline remain submitted without
maintainer approval. See the [adoption
strategy](ADOPTION.md), [limitations](LIMITATIONS.md), and [outreach
kit](OUTREACH.md) before describing this activity publicly.
