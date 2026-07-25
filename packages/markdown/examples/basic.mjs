import MarkdownIt from 'markdown-it';
import { createBidiMarkdownStream } from '@bidilens/markdown';

const source = 'React یک کتابخانه جاوااسکریپت بسیار محبوب است.';
const markdown = new MarkdownIt({ html: false });
const stream = createBidiMarkdownStream(markdown);
stream.push(source.slice(0, 6));
stream.getUpdate();
stream.push(source.slice(6));
console.log(stream.finish().document.html);
