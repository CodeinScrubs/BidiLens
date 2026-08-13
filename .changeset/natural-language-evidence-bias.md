---
'@bidilens/core': patch
---

Stop treating ordinary English words as technical tokens, which biased mixed
blocks toward RTL.

`isTechnicalIdentifier` excluded any word containing a hyphen and any all-capital
word from natural-language evidence. Because only tokens beginning with an ASCII
letter reach that test, every false exclusion removed LTR evidence and never RTL
evidence, so English-majority prose could resolve RTL — the mirror of the
`dir="auto"` failure this project exists to fix. `The well-known
state-of-the-art open-source کتابخانه` resolved `rtl` with zero LTR evidence
counted, and `PLEASE READ THIS IMPORTANT WARNING کتاب` resolved `rtl` after every
English word was discarded.

A hyphen is now ordinary English compounding: a hyphenated token is technical
only when one of its segments is itself a known technical word, so
`react-markdown` and `web-app` stay excluded while `well-known`,
`state-of-the-art`, and `e-mail` remain direction evidence. Capitals are read per
block: a short all-capital token is an acronym inside mixed-case prose (`HTTP`,
`API`), but when capitals are the block's prose style the words stay evidence.
Digits, underscores, and dots remain structural identifier syntax.

The incremental streaming classifier mirrors the same rules, and defers to the
exact batch policy when a block contains an all-capital word, since that decision
depends on the whole block. The Kotlin, Swift, .NET, and Rust cores carried the
same biased rule and are fixed in step. Two exact cross-platform fixtures keep
all five implementations aligned.
