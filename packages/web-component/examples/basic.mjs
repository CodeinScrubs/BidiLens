import { JSDOM } from 'jsdom';

const page = new JSDOM('<!doctype html><body></body>', { url: 'https://example.test' });
globalThis.HTMLElement = page.window.HTMLElement;
globalThis.customElements = page.window.customElements;
globalThis.document = page.window.document;
await import('@bidilens/web-component');
const message = page.window.document.createElement('bidi-message');
message.setAttribute('text', 'React یک کتابخانه جاوااسکریپت بسیار محبوب است.');
page.window.document.body.append(message);
console.log(message.outerHTML);
