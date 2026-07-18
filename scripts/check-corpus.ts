import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Ajv2020 } from 'ajv/dist/2020.js';
import type { ValidateFunction } from 'ajv';
import {
  detectDirection,
  findTechnicalTokenRanges,
  planInlineIsolation,
  scanBidiSecurity
} from '../packages/core/src/index.js';

type Case = {
  id: string;
  text: string;
  expected: 'ltr' | 'rtl' | 'neutral';
  expectedVisualOrderRightToLeft?: number[];
  expectedVisualOrderLeftToRight?: number[];
  expectedIsolations?: Array<{ text: string; direction: 'ltr' | 'rtl' | 'auto'; kind: string }>;
  expectedSecurityCodes?: string[];
  words?: string[];
  tags: string[];
  curation: 'user-provided' | 'authored-template-matrix';
  nativeSpeakerReviewed: boolean;
};

const path = resolve('corpus/cases.json');
const cases = JSON.parse(await readFile(path, 'utf8')) as Case[];
const packagedCases = JSON.parse(await readFile(resolve('packages/cli/corpus/cases.json'), 'utf8')) as Case[];
const schema = JSON.parse(await readFile(resolve('corpus/fixture.schema.json'), 'utf8')) as object;
const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateFixture: ValidateFunction<unknown> = ajv.compile(schema);
let failed = 0;

if (!Array.isArray(cases) || cases.length < 300) {
  console.error(`Corpus must contain at least 300 fixtures; received ${Array.isArray(cases) ? cases.length : 0}.`);
  process.exit(1);
}

if (cases[0]?.id !== 'fa-flagship-001') {
  failed += 1;
  console.error('Fixture #001 must be fa-flagship-001.');
}

const ids = new Set<string>();

if (JSON.stringify(cases) !== JSON.stringify(packagedCases)) {
  failed += 1;
  console.error('packages/cli/corpus/cases.json is out of sync with corpus/cases.json');
}

for (const item of cases) {
  const fixtureId = item.id;
  if (!validateFixture(item)) {
    failed += 1;
    console.error(`${fixtureId || '<missing-id>'}: schema validation failed: ${ajv.errorsText(validateFixture.errors)}`);
    continue;
  }
  if (ids.has(item.id)) {
    failed += 1;
    console.error(`${item.id}: duplicate fixture ID`);
    continue;
  }
  ids.add(item.id);
  const validVisualOrder = item.expectedVisualOrderRightToLeft === undefined
    || (Array.isArray(item.expectedVisualOrderRightToLeft)
      && item.expectedVisualOrderRightToLeft.every((value) => Number.isInteger(value) && value >= 1));
  const validLeftToRightOrder = item.expectedVisualOrderLeftToRight === undefined
    || (Array.isArray(item.expectedVisualOrderLeftToRight)
      && item.expectedVisualOrderLeftToRight.every((value) => Number.isInteger(value) && value >= 1));
  const validIsolations = item.expectedIsolations === undefined
    || (Array.isArray(item.expectedIsolations)
      && item.expectedIsolations.every((isolation) => typeof isolation.text === 'string'
        && ['ltr', 'rtl', 'auto'].includes(isolation.direction)
        && typeof isolation.kind === 'string'));
  if (!item.id || typeof item.text !== 'string' || !item.tags?.length
    || !['ltr', 'rtl', 'neutral'].includes(item.expected)
    || !validVisualOrder || !validLeftToRightOrder || !validIsolations) {
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
  if (item.expectedVisualOrderLeftToRight && item.words
    && item.expectedVisualOrderLeftToRight.length !== item.words.length) {
    failed += 1;
    console.error(`${item.id}: left-to-right visual-order fixture length does not match words`);
  }
  for (const positions of [item.expectedVisualOrderRightToLeft, item.expectedVisualOrderLeftToRight]) {
    if (positions && positions.some((position, index) => position !== index + 1)) {
      failed += 1;
      console.error(`${item.id}: numbered visual order must be the complete logical 1..N sequence`);
    }
  }
  for (const range of findTechnicalTokenRanges(item.text)) {
    if (!item.words?.includes(range.text)) {
      failed += 1;
      console.error(`${item.id}: technical span must be one semantic numbered token: ${range.text}`);
    }
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
  if (item.expectedSecurityCodes) {
    const codes = new Set(scanBidiSecurity(item.text).findings.map((finding) => finding.code));
    for (const expectedCode of item.expectedSecurityCodes) {
      if (!codes.has(expectedCode)) {
        failed += 1;
        console.error(`${item.id}: expected security finding was not reported: ${expectedCode}`);
      }
    }
    if (item.expectedSecurityCodes.length === 0 && codes.size > 0) {
      failed += 1;
      console.error(`${item.id}: expected no security findings, received ${[...codes].join(', ')}`);
    }
  }
}

if (failed > 0) {
  process.exitCode = 1;
} else {
  const nativeReviewed = cases.filter((item) => item.nativeSpeakerReviewed).length;
  console.log(`Corpus passed: ${cases.length} cases (${nativeReviewed} native-speaker-reviewed; ${cases.length - nativeReviewed} technically reviewed or user-provided cases).`);
}
