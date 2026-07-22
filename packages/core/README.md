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

`needsBidiIntervention(text, context)` exposes the shared non-interference
gate. LTR-only text in an LTR context returns `false`; RTL content, bidi
formatting controls, an inherited RTL context, or `{ intervention: 'always' }`
returns `true`. Inline planning likewise returns no unnecessary ranges for
ordinary LTR-only text.

The default newline paragraph separator is recognized incrementally. A custom
`paragraphSeparator` regular expression is evaluated once by `finish()` so
future-sensitive lookarounds, anchors, and extendable matches remain invariant
across arbitrary source chunking. Until then, custom-separated input is exposed
as one unresolved open paragraph.

The default `content-majority` policy excludes technical tokens before
counting natural-language evidence. Use `first-strong` or `strict-uax9` only
when compatibility with first-strong host behavior is required.

Built-in recognition covers conservative, unambiguous tool and product names.
Add private or domain-specific single-token identifiers without changing global
state:

```ts
analyzeText('internalplatform خوب است.', {
  technicalIdentifiers: ['InternalPlatform']
});
```

Matching is case-insensitive. Custom values must start with an ASCII letter and
may then contain ASCII letters, digits, `_`, `.`, or `-`. `firstStrong` reports
the first strong character after configured technical-token exclusion;
`rawFirstStrong` reports the literal first Unicode bidi-strong character.

The default stream direction remains provisional and revisable until
`finish()`. Choose `sticky-majority` only when UI stability is more important
than correcting a misleading prefix before completion.

Run the packaged example after building with
`pnpm --filter @bidilens/core example`.
