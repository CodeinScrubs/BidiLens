import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BidiMessage } from '@bidilens/react';

const source = 'React یک کتابخانه جاوااسکریپت بسیار محبوب است.';
console.log(renderToStaticMarkup(createElement(BidiMessage, { text: source })));
