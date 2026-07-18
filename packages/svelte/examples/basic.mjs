import { get } from 'svelte/store';
import { createBidiMessage, createStreamingBidiMessage } from '@bidilens/svelte';

const source = 'React یک کتابخانه جاوااسکریپت بسیار محبوب است.';
console.log(get(createBidiMessage(source)));
const stream = createStreamingBidiMessage();
stream.push('React ');
console.log(stream.push('یک کتابخانه جاوااسکریپت بسیار محبوب است.'));
