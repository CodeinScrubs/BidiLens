import { JSDOM } from 'jsdom';

const page = new JSDOM('<p>React یک کتابخانه جاوااسکریپت بسیار محبوب است.</p>');
globalThis.HTMLElement = page.window.HTMLElement;
globalThis.Text = page.window.Text;
const { applyBidi } = await import('@bidilens/dom');
applyBidi(page.window.document.body);
console.log(page.window.document.body.innerHTML);
