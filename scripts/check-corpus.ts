import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { detectDirection } from '../packages/core/src/index.js';

type Case = {
  id: string;
  text: string;
  expected: 'ltr' | 'rtl' | 'neutral';
};

const path = resolve('corpus/cases.json');
const cases = JSON.parse(await readFile(path, 'utf8')) as Case[];
let failed = 0;

for (const item of cases) {
  const actual = detectDirection(item.text, { strategy: 'first-strong', fallback: 'neutral' });
  if (actual !== item.expected) {
    failed += 1;
    console.error(`${item.id}: expected ${item.expected}, received ${actual}`);
  }
}

if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log(`Corpus passed: ${cases.length} cases`);
}
