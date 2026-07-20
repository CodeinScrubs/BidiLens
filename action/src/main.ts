import process from 'node:process';
import { runAction, workflowError } from './index.js';

async function main(): Promise<void> {
  try {
    const result = await runAction();
    process.exitCode = result.exitCode;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${workflowError(message)}\n`);
    process.exitCode = 1;
  }
}

void main();
