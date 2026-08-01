# Public outreach log

**Initial outreach evidence date:** 2026-07-30

**Last response audit:** 2026-08-01

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
| NousResearch Hermes Agent | [PR #72508](https://github.com/NousResearch/hermes-agent/pull/72508) | Open and mergeable; rebased to current upstream on the evidence date; awaiting maintainer review | Focused TUI implementation and tests. Uses Hermes's existing `bidi-js`, preserves the earlier test contributor's authorship, adds majority/tie/no-op coverage, and keeps an ASCII identity fast path. After the rebase, the focused 8-test suite, TypeScript check, Ink build, ESLint, Prettier, and diff check passed. The host currently exposes no automated PR checks for this contribution. |
| Google Antigravity CLI | [feature request #693](https://github.com/google-antigravity/antigravity-cli/issues/693) | Open | The public repository exposes documentation/examples rather than the product renderer. The request supplies the failure fixture and policy, asks for the correct contribution path, and offers a focused patch. |
| Anthropic Claude Code | [comment on canonical RTL issue #76712](https://github.com/anthropics/claude-code/issues/76712#issuecomment-5088070430) | Parent issue open | Adds the English-first/Persian-majority gap left by first-strong CSS, a per-block webview plan, composer guidance, and an offer to patch a public renderer boundary. No duplicate issue was opened. |
| OpenAI Codex app/extension | [comment on issue #21563](https://github.com/openai/codex/issues/21563#issuecomment-5088082477) | Parent issue open | Proposes a native render-boundary integration that does not patch application files or stored chats and distinguishes content direction from global layout. |
| OpenAI Codex CLI | [comment on issue #34871](https://github.com/openai/codex/issues/34871#issuecomment-5088082730) | Parent issue open | Separates bidi ordering from Arabic shaping and terminal capabilities. It offers the policy/corpus for a native Rust design rather than proposing a JavaScript dependency. |
| OpenAI Codex community | [Show and tell #35557](https://github.com/openai/codex/discussions/35557) | Open | Public technical introduction, package/corpus summary, current integration evidence, limitations, and request for renderer/i18n review. |
| Cline | [comment on feature discussion #12089](https://github.com/cline/cline/discussions/12089#discussioncomment-17793649) | Discussion open | Links the open renderer regression, supplies the mixed-content acceptance case, and offers a React/webview pilot or fixtures-only patch. |
| Cline VS Code webview | [PR #12724](https://github.com/cline/cline/pull/12724) | Open, mergeable, and ready for review; quality, unit, platform-integration, VS Code, Linux E2E, and security checks passed on the rebased head; maintainer review required | Applies `@bidilens/markdown` at the existing React Markdown render boundary and adds Persian-majority, English-majority, and pure-English identity tests. The macOS E2E job built and packaged the extension but could not launch any product test because its cached VS Code/Electron executable was absent (`ENOENT`); this is recorded as runner infrastructure, not a passing product test. |
| Continue | [comment on issue #2767](https://github.com/continuedev/continue/issues/2767#issuecomment-5088124777) | Parent issue closed; reconsideration requested | Replaces the proposed global RTL rule with Auto/LTR/RTL policy and offers a focused GUI or fixtures-only patch. No new duplicate issue was created. |
| assistant-ui | [Show and tell #5211](https://github.com/assistant-ui/assistant-ui/discussions/5211) | Open | Distinguishes the project's completed logical-layout work from per-message mixed-content direction and offers a documented `@bidilens/react` streaming recipe, adapter, hook, or fixtures-only path. |
| AnythingLLM | [comment on canonical RTL issue #3430](https://github.com/Mintplex-Labs/anything-llm/issues/3430#issuecomment-5126056699) | Parent issue open | Supplies a per-block acceptance fixture and integration guidance. A direct dependency patch was deferred because the host supports Node 18 and Markdown-It 13 while BidiLens 0.3 requires Node 22.12 and peers with Markdown-It 14; raising either compatibility floor would be a regression. |
| Vercel Streamdown | [PR #569](https://github.com/vercel/streamdown/pull/569) | Open, mergeable, and ready for review; review and security automation passed; maintainer review required | Adds a dependency-free native rehype pass because Streamdown supports Node 18. It assigns direction per semantic block, keeps code LTR, uses content majority with a first-strong tie-breaker, preserves pure-LTR behavior, and includes 985 passing package tests plus a production ESM/declaration build. The Vercel preview remains blocked on external-fork deployment authorization. |
| Sentry | [feature request #120893](https://github.com/getsentry/sentry/issues/120893) | Open; linked to Sentry's internal `ENG-8321`, labeled for the Issues product area, and waiting for product-owner triage | Proposes a feature-flagged pilot at Sentry's shared React Markdown renderer and Seer wrapper. The request identifies the current source boundaries, preserves alignment and technical tokens, discloses the unreviewed-corpus limitation, and offers either a local helper or BidiLens package according to Sentry's dependency policy. |
| PostHog | [feature request #75474](https://github.com/PostHog/posthog/issues/75474) | Open | Proposes per-block handling in `LemonMarkdown` and PostHog AI's already memoized `MarkdownMessage` blocks. The public feature tracker was used instead of the automated email's sales-demo form, which requires company, role, and monthly-active-user data and is not an appropriate open-source engineering route. |

The public endpoints above cover eleven project families and fourteen
repository-specific routes. Hermes, Cline, and Streamdown contain focused host
code; the remaining routes are issue or discussion submissions. None had
received a maintainer approval, merge, downstream pilot, or
production-adoption confirmation when this evidence was recorded.

## Pending authenticated follow-up

| Project/channel | Current evidence | Next action |
|---|---|---|
| JetBrains AI Assistant YouTrack | JetBrains support directed the proposal to the public AI Assistant tracker. A duplicate search found the directly matching, open, assigned [LLM-25407](https://youtrack.jetbrains.com/issue/LLM-25407/Arabic-RTL-Bidirectional-text-rendering-issue-in-Codex-input-field), so no duplicate was created. | After the maintainer signs in to YouTrack, add one implementation-focused comment with the English-first/Persian-majority fixture, BidiLens corpus and limitation links, and an offer of a scoped renderer patch. |

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
| Zed | A Zed representative confirmed that more RTL support is useful but stated that a non-Rust dependency is a non-starter. | The original reply accurately disclosed that no Rust port existed at that time. A native source core with shared-corpus tests and three-OS CI is now implemented under `rust/`; a focused follow-up is pending, and no Zed integration or adoption is claimed. |
| Ollama | The support AI requested product feedback in problem/current-behavior/expected-behavior form. After receiving that clarification, it confirmed the submission contains the information its team uses for feature review and made no timeline or adoption commitment. | Sent one structured clarification with the repository and regression-corpus context; stopped after the automated confirmation to avoid an AI-response loop. |
| n8n | The support AI said it escalated the proposal to a human product/engineering review queue. | No acknowledgement reply was sent; wait for the promised human review. |
| Nous Research | An automated receipt assigned a support reference and promised a later follow-up. | No reply was sent to the receipt; the existing Hermes PR remains the primary technical channel. |
| JetBrains and Sentry | These responses routed the proposal to public trackers. | The resulting tracker evidence is recorded above; no redundant support-email reply was sent. |
| PostHog | An automated response identified an unmonitored inbox and linked support and sales-oriented routes that were unsuitable for an open-source engineering proposal. | No email reply was sent. The public feature request recorded above was opened independently. |
| Cohere, Supabase, Microsoft, and delivery systems | The messages were acknowledgements, account-verification instructions, unmonitored-address notices, or delivery failures. | No reply was sent because none represented maintainer review or an actionable technical question. |

These responses are routing evidence, not adoption evidence. No organization in
this table has approved a dependency, merged an integration, or confirmed a
production rollout.

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
2. For PRs #72508, #12724, and #569, keep the branches available and rebase
   only when requested or when a real conflict appears. Never force-push over
   review history without explaining why.
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

Only the first state is evidenced for most routes above. The three code PRs are
submitted and have not been approved or merged. See the [adoption
strategy](ADOPTION.md), [limitations](LIMITATIONS.md), and [outreach
kit](OUTREACH.md) before describing this activity publicly.
