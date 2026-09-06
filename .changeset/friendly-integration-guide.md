---
"@bidilens/cli": minor
"@bidilens/dom": patch
---

Add `bidilens guide [target]` with offline adapter selection, copyable React,
DOM, HTML, and Markdown-It examples, native platform routing, validation and
rollback advice, and versioned JSON output. The command never inspects or
modifies the consumer's project and adds no runtime dependency.

Honor DOM `skipSelector` for protected inline descendants and standalone code.
Whole blocks containing excluded regions are left untouched so inline
isolation and ancestor direction changes cannot enter an editor-owned region.
