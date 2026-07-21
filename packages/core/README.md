# @bidilens/core

Framework-independent Unicode direction analysis, inline-isolation planning,
streaming state, and bidi security auditing. Runtime analysis is offline and
uses generated Unicode 17.0.0 bidi-class and natural-letter data rather than
the host runtime's potentially older Unicode property tables.

```bash
npm install @bidilens/core
```

```ts
import { analyzeText, createBidiStream, planInlineIsolation, scanBidiSecurity } from '@bidilens/core';

const source = 'React یک کتابخانه جاوااسکریپت بسیار محبوب است.';
const analysis = analyzeText(source);
// analysis.direction === 'rtl'
// analysis.text === source

const isolations = planInlineIsolation(source, 'rtl');
// React is an LTR identifier isolation.

const security = scanBidiSecurity(source, { mode: 'strict' });

const stream = createBidiStream();
stream.push('old response');
stream.reset(source); // clear and analyze replacement text atomically
```

The default newline paragraph separator is recognized incrementally. A custom
`paragraphSeparator` regular expression is evaluated once by `finish()` so
future-sensitive lookarounds, anchors, and extendable matches remain invariant
across arbitrary source chunking. Until then, custom-separated input is exposed
as one unresolved open paragraph.

The default `content-majority` policy excludes technical tokens before
counting natural-language evidence. Use `first-strong` or `strict-uax9` only
when compatibility with first-strong host behavior is required.

Run the packaged example after building with
`pnpm --filter @bidilens/core example`.
