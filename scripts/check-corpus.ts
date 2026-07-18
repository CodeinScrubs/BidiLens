import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { detectDirection, planInlineIsolation } from '../packages/core/src/index.js';

type Case = {
  id: string;
  text: string;
  expected: 'ltr' | 'rtl' | 'neutral';
  expectedVisualOrderRightToLeft?: number[];
  expectedIsolations?: Array<{ text: string; direction: 'ltr' | 'rtl' | 'auto'; kind: string }>;
  words?: string[];
  tags: string[];
};

const path = resolve('corpus/cases.json');
const cases = JSON.parse(await readFile(path, 'utf8')) as Case[];
const packagedCases = JSON.parse(await readFile(resolve('packages/cli/corpus/cases.json'), 'utf8')) as Case[];
let failed = 0;

if (!Array.isArray(cases) || cases.length === 0) {
  console.error('Corpus must be a non-empty array.');
  process.exit(1);
}

if (JSON.stringify(cases) !== JSON.stringify(packagedCases)) {
  failed += 1;
  console.error('packages/cli/corpus/cases.json is out of sync with corpus/cases.json');
}

for (const item of cases) {
  const validVisualOrder = item.expectedVisualOrderRightToLeft === undefined
    || (Array.isArray(item.expectedVisualOrderRightToLeft)
      && item.expectedVisualOrderRightToLeft.every((value) => Number.isInteger(value) && value >= 1));
  const validIsolations = item.expectedIsolations === undefined
    || (Array.isArray(item.expectedIsolations)
      && item.expectedIsolations.every((isolation) => typeof isolation.text === 'string'
        && ['ltr', 'rtl', 'auto'].includes(isolation.direction)
        && typeof isolation.kind === 'string'));
  if (!item.id || typeof item.text !== 'string' || !item.tags?.length
    || !['ltr', 'rtl', 'neutral'].includes(item.expected)
    || !validVisualOrder || !validIsolations) {
    failed += 1;
    console.error(`${item.id ?? '<missing-id>'}: fixture shape is invalid`);
    continue;
  }
  const actual = detectDirection(item.text, { strategy: 'content-majority', fallback: 'neutral' });
  if (actual !== item.expected) {
    failed += 1;
    console.error(`${item.id}: expected ${item.expected}, received ${actual}`);
  }
  if (item.expectedVisualOrderRightToLeft && item.words
    && item.expectedVisualOrderRightToLeft.length !== item.words.length) {
    failed += 1;
    console.error(`${item.id}: visual-order fixture length does not match words`);
  }
  if (item.expectedIsolations) {
    const direction = actual === 'neutral' ? 'ltr' : actual;
    const plans = planInlineIsolation(item.text, direction);
    for (const expectedIsolation of item.expectedIsolations) {
      if (!plans.some((plan) => plan.text === expectedIsolation.text
        && plan.direction === expectedIsolation.direction
        && plan.kind === expectedIsolation.kind)) {
        failed += 1;
        console.error(`${item.id}: expected isolation was not planned: ${expectedIsolation.text}`);
      }
    }
  }
}

if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log(`Corpus passed: ${cases.length} cases`);
}
