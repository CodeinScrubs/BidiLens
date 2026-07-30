# Public outreach log

**Evidence date:** 2026-07-30

This log records public, verifiable requests for review. A submitted comment,
issue, discussion, or pull request is not an external audit, merge, pilot,
adoption, deployment, or company endorsement.

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
- Do not send unsolicited private email or direct messages when the project
  provides an appropriate public contribution channel.
- Do not repeatedly bump a thread without new evidence or a maintainer request.

## Live submissions

| Project | Public route | State on evidence date | Scope and boundary |
|---|---|---|---|
| NousResearch Hermes Agent | [PR #72508](https://github.com/NousResearch/hermes-agent/pull/72508) | Open; awaiting maintainer review/check execution | Focused TUI implementation and tests. Uses Hermes's existing `bidi-js`, preserves the earlier test contributor's authorship, adds majority/tie/no-op coverage, and keeps an ASCII identity fast path. This is the only submitted code integration in the first wave. |
| Google Antigravity CLI | [feature request #693](https://github.com/google-antigravity/antigravity-cli/issues/693) | Open | The public repository exposes documentation/examples rather than the product renderer. The request supplies the failure fixture and policy, asks for the correct contribution path, and offers a focused patch. |
| Anthropic Claude Code | [comment on canonical RTL issue #76712](https://github.com/anthropics/claude-code/issues/76712#issuecomment-5088070430) | Parent issue open | Adds the English-first/Persian-majority gap left by first-strong CSS, a per-block webview plan, composer guidance, and an offer to patch a public renderer boundary. No duplicate issue was opened. |
| OpenAI Codex app/extension | [comment on issue #21563](https://github.com/openai/codex/issues/21563#issuecomment-5088082477) | Parent issue open | Proposes a native render-boundary integration that does not patch application files or stored chats and distinguishes content direction from global layout. |
| OpenAI Codex CLI | [comment on issue #34871](https://github.com/openai/codex/issues/34871#issuecomment-5088082730) | Parent issue open | Separates bidi ordering from Arabic shaping and terminal capabilities. It offers the policy/corpus for a native Rust design rather than proposing a JavaScript dependency. |
| OpenAI Codex community | [Show and tell #35557](https://github.com/openai/codex/discussions/35557) | Open | Public technical introduction, package/corpus summary, current integration evidence, limitations, and request for renderer/i18n review. |
| Cline | [comment on feature discussion #12089](https://github.com/cline/cline/discussions/12089#discussioncomment-17793649) | Discussion open | Links the open renderer regression, supplies the mixed-content acceptance case, and offers a React/webview pilot or fixtures-only patch. |
| Cline VS Code webview | [draft PR #12724](https://github.com/cline/cline/pull/12724) | Open; automated quality, unit, Windows, Linux, and security checks passed; maintainer review required | Applies `@bidilens/markdown` at the existing React Markdown render boundary and adds Persian-majority, English-majority, and pure-English identity tests. One macOS E2E job could not launch any test because its downloaded VS Code executable was absent (`ENOENT`); this is recorded as runner infrastructure, not a passing product test. |
| Continue | [comment on issue #2767](https://github.com/continuedev/continue/issues/2767#issuecomment-5088124777) | Parent issue closed; reconsideration requested | Replaces the proposed global RTL rule with Auto/LTR/RTL policy and offers a focused GUI or fixtures-only patch. No new duplicate issue was created. |
| assistant-ui | [Show and tell #5211](https://github.com/assistant-ui/assistant-ui/discussions/5211) | Open | Distinguishes the project's completed logical-layout work from per-message mixed-content direction and offers a documented `@bidilens/react` streaming recipe, adapter, hook, or fixtures-only path. |
| AnythingLLM | [comment on canonical RTL issue #3430](https://github.com/Mintplex-Labs/anything-llm/issues/3430#issuecomment-5126056699) | Parent issue open | Supplies a per-block acceptance fixture and integration guidance. A direct dependency patch was deferred because the host supports Node 18 and Markdown-It 13 while BidiLens 0.3 requires Node 22.12 and peers with Markdown-It 14; raising either compatibility floor would be a regression. |
| Vercel Streamdown | [draft PR #569](https://github.com/vercel/streamdown/pull/569) | Open; review and security automation passed; maintainer review required | Adds a dependency-free native rehype pass because Streamdown supports Node 18. It assigns direction per semantic block, keeps code LTR, uses content majority with a first-strong tie-breaker, preserves pure-LTR behavior, and includes 985 passing package tests plus a production ESM/declaration build. The Vercel preview remains blocked on external-fork deployment authorization. |

The public endpoints above cover nine project families and twelve
repository-specific routes. Hermes, Cline, and Streamdown contain focused host
code; the remaining routes are issue or discussion submissions. None had
received a maintainer approval, merge, downstream pilot, or
production-adoption confirmation when this evidence was recorded.

## Deliberate deferrals

| Project/channel | Decision | Reason |
|---|---|---|
| Google Gemini CLI | Do not submit a duplicate now | Maintainers closed [issue #25478](https://github.com/google-gemini/gemini-cli/issues/25478) after stating that they had no immediate plan to address it, then closed the associated unmerged [PR #25243](https://github.com/google-gemini/gemini-cli/pull/25243). Re-contact requires a reopened issue, changed policy, or materially new maintainer-requested evidence. |
| Archived repositories | Do not contact | An archived repository cannot accept a normal upstream implementation. Follow its active successor instead, after re-running policy and duplicate research. |
| Bulk or private-person email/direct messages | Not sent | Public project channels remain the preferred technical route. A second-wave contact sheet contains only publicly listed organizational role addresses and requires individual relevance checks, personalization, and opt-out respect; it is not a BCC or automated blast list. |
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
4. Respect a closure or explicit no-plan decision. Re-contact only after a
   relevant policy/state change.
5. Update this log when a maintainer responds, checks run, a PR changes state,
   or a pilot starts. Preserve old dates/status rather than rewriting history.

## Evidence vocabulary

- **Submitted:** the public URL exists.
- **Under review:** a maintainer or project automation has begun review/checks.
- **Merged:** the host repository merged the change.
- **Pilot:** the host confirms a bounded deployment with rollback and measured
  results.
- **Adopted:** the host confirms continued use in a released product.

Only the first state is evidenced for most routes above. The three code PRs are
submitted and have not been approved or merged. See the [adoption
strategy](ADOPTION.md), [limitations](LIMITATIONS.md), and [outreach
kit](OUTREACH.md) before describing this activity publicly.
