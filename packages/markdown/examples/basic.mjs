import MarkdownIt from 'markdown-it';
import { markdownItBidi } from '@bidilens/markdown';

const source = 'React یک کتابخانه جاوااسکریپت بسیار محبوب است.';
const markdown = new MarkdownIt({ html: false });
markdownItBidi(markdown);
console.log(markdown.render(source));
