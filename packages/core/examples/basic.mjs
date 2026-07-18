import { analyzeText, planInlineIsolation } from '@bidilens/core';

const source = 'React یک کتابخانه جاوااسکریپت بسیار محبوب است.';
const analysis = analyzeText(source);
console.log({ direction: analysis.direction, isolations: planInlineIsolation(source, 'rtl') });
