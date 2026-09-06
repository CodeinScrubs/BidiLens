# n8n Community proposal draft

**Status (2026-09-06):** submitted to the n8n Community Feature Requests
category using its required template. The forum confirmed **Post Needs
Approval** and one pending post. No public topic URL or moderator approval is
available yet. The submitted version includes an English translation of the
Persian fixture, AI-assistance/maintainer disclosure, and an explicit statement
that this is a design proposal, not a reproduced bug in the latest n8n release.

## Submitted title

Per-block mixed RTL/LTR direction in `@n8n/chat` Markdown messages

## Problem

`@n8n/chat` can display Arabic, Persian, Hebrew, Urdu, and other RTL text, but
mixed-direction AI answers need a base direction per rendered block. The HTML
attribute `dir="auto"` follows the first strong character, which can differ
from the intended base of a Persian explanation beginning with an English name:

```text
React یک کتابخانه جاوااسکریپت بسیار محبوب است.
```

The paragraph should have an RTL base while `React` remains an isolated LTR
run. The mirror case should remain LTR:

```text
The Persian word کتاب means book.
```

A global RTL setting is not sufficient because one answer can contain
independent headings, paragraphs, list items, quotes, table cells, and code.

## Proposed bounded change

At `@n8n/chat`'s existing Markdown-It render boundary, add semantic `dir`
metadata to prose block tokens only when the content needs bidirectional
intervention. Keep code LTR and isolate opposite-direction inline technical
runs. Do not enable raw HTML, rewrite generated or stored Markdown, reverse
strings, or change chat layout/navigation direction.

The first implementation can be dependency-free and local to n8n. BidiLens is
offered as a fixture/policy reference, not as a dependency requirement. If the
maintainers later prefer a package, BidiLens verifies strict packed consumers
against Markdown-It 13.0.2, 14.3.1, and 15.0.1.

## Minimum acceptance fixtures

| Source | Expected block base | Additional requirement |
|---|---|---|
| `React یک کتابخانه جاوااسکریپت بسیار محبوب است.` | RTL | isolate `React` as LTR |
| `The Persian word کتاب means book.` | LTR | isolate `کتاب` as RTL |
| `Plain English Markdown stays exactly as it is.` | unchanged | no added BidiLens/native attributes or wrappers |
| Persian paragraph with `src/index.ts` | RTL | keep the path LTR |
| fenced TypeScript code inside an RTL answer | LTR code | surrounding prose resolves independently |
| two paragraphs with different majorities | independent | no message-wide direction override |

For every fixture, the stored logical Markdown must remain unchanged. Rendered
`textContent`, selection, and plain-text clipboard output must preserve the
corresponding visible text in logical order; they need not include Markdown
syntax that the renderer normally removes. For plain-text fixtures, assert exact
source identity as well. Existing Markdown-It plugins and `html: false` behavior
must continue to work.

## Rollout and rollback

Start behind a chat-renderer feature flag or in shadow analysis, measure only
messages containing RTL characters, and compare source/copy identity before
enabling semantic markup. Pure LTR messages must take the identity path. The
change is confined to one renderer stage and should be removable in one
commit.

## Evidence and limits

- BidiLens repository: <https://github.com/CodeinScrubs/BidiLens>
- Markdown-It 13/14/15 compatibility PR: <https://github.com/CodeinScrubs/BidiLens/pull/57>
- Canonical corpus: <https://github.com/CodeinScrubs/BidiLens/tree/main/corpus>
- Exact limitations: <https://github.com/CodeinScrubs/BidiLens/blob/main/docs/LIMITATIONS.md>

BidiLens currently has zero native-speaker-certified corpus cases and no n8n
maintainer approval, downstream pilot, independent security review, or
accessibility lab result. This proposal asks for a scoped technical review, not
adoption or endorsement.
