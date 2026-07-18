import { formatTerminalText } from '@bidilens/terminal';

const source = 'React یک کتابخانه جاوااسکریپت بسیار محبوب است.';
console.log(formatTerminalText(source, { mode: 'annotated' }).text);
