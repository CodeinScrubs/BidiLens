# @bidilens/markdown

Direction and isolation plugins for unified/remark/rehype and Markdown-It.
It also provides a checkpointed Markdown-It stream with final AST/HTML/security
equivalence. Code and math stay LTR; prose direction is computed per semantic
block.

```bash
npm install @bidilens/markdown unified remark-parse remark-rehype rehype-stringify
```

```ts
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { remarkBidi, rehypeBidi } from '@bidilens/markdown';

const html = await unified()
  .use(remarkParse)
  .use(remarkBidi)
  .use(remarkRehype)
  .use(rehypeBidi)
  .use(rehypeStringify)
  .process(markdown);
```

For Markdown-It, install the optional peer and call the typed plugin once:

```bash
npm install @bidilens/markdown markdown-it
```

TypeScript hosts that import `MarkdownIt` directly should also install its
declarations as a direct development dependency:

```sh
npm install --save-dev @types/markdown-it
```

```ts
import MarkdownIt from 'markdown-it';
import { markdownItBidi } from '@bidilens/markdown';

const md = new MarkdownIt({ html: false });
markdownItBidi(md);
const html = md.render(markdown);
```

## Rich Markdown streaming

The rich stream accepts a caller-owned Markdown-It instance, so the host keeps
control of parser options and plugins:

```ts
import MarkdownIt from 'markdown-it';
import {
  analyzeBidiMarkdown,
  createBidiMarkdownStream
} from '@bidilens/markdown';

const markdownIt = new MarkdownIt({ html: false });
const session = createBidiMarkdownStream(markdownIt, { securityMode: 'warn' });

session.push('React ');
let update = session.getUpdate();
session.push('یک کتابخانه جاوااسکریپت بسیار محبوب است.');
update = session.getUpdate();

const final = session.finish();
console.log(final.document.html);
console.log(final.document.ast);
console.log(final.document.blocks[0]?.analysis.isolations);
console.log(final.document.security.findings);

// The exact final-equivalence oracle:
const batch = analyzeBidiMarkdown(new MarkdownIt({ html: false }), final.source);
```

`direction` is lightweight provisional state updated on every `push()` and is
reconciled to the active Markdown block whenever the rich document is current.
Rich AST/HTML/security revisions occur at geometrically spaced checkpoints and
when a pending structural Markdown boundary requires immediate reconciliation;
`pendingSourceRange` explicitly identifies an appended suffix not represented
by the latest `document`. `dirtyRegions` and `changedBlockIndexes` identify the
replacement produced by a revision. `finish()` performs one exact full parse,
sets `pendingSourceRange` to `null`, and is invariant to tested chunk splits,
including surrogate halves, combining marks, fences, links, and URLs.

`stableThrough` advances only across conservatively self-contained blocks that
already carry stable intervention metadata. Reference-style links, lists,
tables, fences, HTML, and other future-sensitive structures remain dirty until
reconciled. Block `sourceRange` values address the complete Markdown source;
the nested `analysis` text and isolation ranges are local to `block.text`.

The similarly named export from `@bidilens/core` is a deprecated direction-only
compatibility alias. Import the rich session from `@bidilens/markdown`.

Raw source HTML remains escaped when the host parser's HTML option is off.
For an LTR-only document, the default plugins leave the MDAST/HAST and
Markdown-It output free of BidiLens annotations. Set `intervention: 'always'`
if a host intentionally selects every block by BidiLens metadata.
Remark-compatible `math` and `inlineMath` nodes receive explicit LTR metadata
and are excluded from surrounding prose evidence; math rendering itself stays
the responsibility of the host's chosen math plugin.
The packed example uses the declared optional `markdown-it` peer; run it with
`pnpm --filter @bidilens/markdown example` after building.
