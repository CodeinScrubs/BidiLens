# n8n Community proposal draft

**Status:** prepared for human review; not posted.

## Suggested title

Per-block mixed RTL/LTR direction in `@n8n/chat` Markdown messages

## Problem

`@n8n/chat` can display Arabic, Persian, Hebrew, Urdu, and other RTL text, but
mixed-direction AI answers need a base direction per rendered block. CSS
`dir="auto"` follows the first strong character, so it misclassifies a
Persian-majority sentence that begins with a technical English token:

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
against Markdown-It 13.0.2 and 14.3.0.

## Minimum acceptance fixtures

| Source | Expected block base | Additional requirement |
|---|---|---|
| `React یک کتابخانه جاوااسکریپت بسیار محبوب است.` | RTL | isolate `React` as LTR |
| `The Persian word کتاب means book.` | LTR | isolate `کتاب` as RTL |
| `Plain English Markdown stays exactly as it is.` | unchanged | no added BidiLens/native attributes or wrappers |
| Persian paragraph with `src/index.ts` | RTL | keep the path LTR |
| fenced TypeScript code inside an RTL answer | LTR code | surrounding prose resolves independently |
| two paragraphs with different majorities | independent | no message-wide direction override |

For every fixture, logical source, `textContent`, selection, and clipboard text
must remain identical. Existing Markdown-It plugins and `html: false` behavior
must continue to work.

## Rollout and rollback

Start behind a chat-renderer feature flag or in shadow analysis, measure only
messages containing RTL characters, and compare source/copy identity before
enabling semantic markup. Pure LTR messages must take the identity path. The
change is confined to one renderer stage and should be removable in one
commit.

## Evidence and limits

- BidiLens repository: <https://github.com/CodeinScrubs/BidiLens>
- Markdown-It 13/14 compatibility PR: <https://github.com/CodeinScrubs/BidiLens/pull/57>
- Canonical corpus: <https://github.com/CodeinScrubs/BidiLens/tree/main/corpus>
- Exact limitations: <https://github.com/CodeinScrubs/BidiLens/blob/main/docs/LIMITATIONS.md>

BidiLens currently has zero native-speaker-certified corpus cases and no n8n
maintainer approval, downstream pilot, independent security review, or
accessibility lab result. This proposal asks for a scoped technical review, not
adoption or endorsement.
