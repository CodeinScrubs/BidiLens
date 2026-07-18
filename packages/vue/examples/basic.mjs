import { createSSRApp, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { BidiMessage } from '@bidilens/vue';

const source = 'React یک کتابخانه جاوااسکریپت بسیار محبوب است.';
const app = createSSRApp({ render: () => h(BidiMessage, { text: source }) });
console.log(await renderToString(app));
