# @bidilens/markdown

Direction and isolation plugins for unified/remark/rehype and Markdown-It.
Code stays LTR; prose direction is computed per semantic block.

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

```ts
import MarkdownIt from 'markdown-it';
import { markdownItBidi } from '@bidilens/markdown';

const md = new MarkdownIt({ html: false });
markdownItBidi(md);
const html = md.render(markdown);
```

Raw source HTML remains escaped when the host parser's HTML option is off.
The packed example uses the declared optional `markdown-it` peer; run it with
`pnpm --filter @bidilens/markdown example` after building.
