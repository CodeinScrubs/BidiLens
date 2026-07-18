#!/usr/bin/env node
import process from 'node:process';
import { runCli } from './index.js';

try {
  process.exitCode = await runCli();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`bidilens: ${message}\n`);
  process.exitCode = 1;
}
