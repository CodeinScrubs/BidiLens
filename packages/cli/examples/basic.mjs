import process from 'node:process';
import { runCli } from '@bidilens/cli';

process.exitCode = await runCli([
  'node',
  'bidilens',
  'inspect',
  '--text',
  'React یک کتابخانه جاوااسکریپت بسیار محبوب است.'
]);
