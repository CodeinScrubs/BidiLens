import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { detectDirection } from '../packages/core/src/index.js';

type Case = {
  id: string;
  text: string;
  expected: 'ltr' | 'rtl' | 'neutral';
  expectedVisualOrderRightToLeft?: number[];
  tags: string[];
};

const path = resolve('corpus/cases.json');
const cases = JSON.parse(await readFile(path, 'utf8')) as Case[];
let failed = 0;

if (!Array.isArray(cases) || cases.length === 0) {
  console.error('Corpus must be a non-empty array.');
  process.exit(1);
}

for (const item of cases) {
  if (!item.id || typeof item.text !== 'string' || !item.tags?.length) {
    failed += 1;
    console.error(`${item.id ?? '<missing-id>'}: fixture shape is invalid`);
    continue;
  }
  const actual = detectDirection(item.text, { strategy: 'content-majority', fallback: 'neutral' });
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
