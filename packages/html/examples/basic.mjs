import { renderBidiHtml } from '@bidilens/html';

const source = 'React یک کتابخانه جاوااسکریپت بسیار محبوب است.';
console.log(renderBidiHtml(source).html);
