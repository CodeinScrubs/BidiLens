import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';

const UNICODE_VERSION = '17.0.0';
const BIDI_SHA256 = '4867b4b7f0731ed1bfcd34cc6251211ff1542541fce0734b6fbda139ee80b3a4';
const GENERAL_CATEGORY_SHA256 = 'd62e5bab70ca74f099343f71224fa051cb1fdd61a1ab45c0488c44cfc0b6102e';
const BIDI_URL = `https://www.unicode.org/Public/${UNICODE_VERSION}/ucd/extracted/DerivedBidiClass.txt`;
const GENERAL_CATEGORY_URL = `https://www.unicode.org/Public/${UNICODE_VERSION}/ucd/extracted/DerivedGeneralCategory.txt`;
const BIDI_PATH = resolve(`unicode/DerivedBidiClass-${UNICODE_VERSION}.txt`);
const GENERAL_CATEGORY_PATH = resolve(`unicode/DerivedGeneralCategory-${UNICODE_VERSION}.txt`);
const OUTPUT_PATH = resolve('packages/core/src/generated/bidi-ranges.ts');
const ANDROID_OUTPUT_PATH = resolve(
  'android/core/src/main/kotlin/io/github/codeinscrubs/bidilens/core/generated/BidiRanges.kt'
);
const APPLE_OUTPUT_PATH = resolve('apple/Sources/BidiLens/Generated/BidiRanges.swift');
const WINDOWS_OUTPUT_PATH = resolve('windows/src/BidiLens.Core/Generated/BidiRanges.cs');
const RUST_OUTPUT_PATH = resolve('rust/src/generated/bidi_ranges.rs');

interface UnicodeSource {
  label: string;
  url: string;
  path: string;
  sha256: string;
}

const UNICODE_SOURCES = [
  {
    label: 'DerivedBidiClass',
    url: BIDI_URL,
    path: BIDI_PATH,
    sha256: BIDI_SHA256
  },
  {
    label: 'DerivedGeneralCategory',
    url: GENERAL_CATEGORY_URL,
    path: GENERAL_CATEGORY_PATH,
    sha256: GENERAL_CATEGORY_SHA256
  }
] as const satisfies readonly UnicodeSource[];

const CLASS = {
  L: 0,
  R: 1,
  AL: 2,
  OTHER: 3
} as const;

function normalizeClass(value: string): number {
  if (value === 'L' || value === 'Left_To_Right') return CLASS.L;
  if (value === 'R' || value === 'Right_To_Left') return CLASS.R;
  if (value === 'AL' || value === 'Arabic_Letter') return CLASS.AL;
  return CLASS.OTHER;
}

function parseRange(value: string): readonly [number, number] {
  const [startText, endText = startText] = value.trim().split('..');
  if (!startText || !endText) throw new Error(`Invalid Unicode range: ${value}`);
  return [Number.parseInt(startText, 16), Number.parseInt(endText, 16)];
}

function assignRange(classes: Uint8Array, range: string, bidiClass: string): void {
  const [start, end] = parseRange(range);
  classes.fill(normalizeClass(bidiClass), start, end + 1);
}

interface GeneralCategoryData {
  letters: Uint8Array;
  combiningMarks: Uint8Array;
}

function parseDerivedGeneralCategory(source: string): GeneralCategoryData {
  const letters = new Uint8Array(0x110000);
  const combiningMarks = new Uint8Array(0x110000);
  for (const line of source.split(/\r?\n/u)) {
    const data = line.split('#', 1)[0]?.trim();
    if (!data) continue;
    const match = data.match(/^([0-9A-F.]+)\s*;\s*([A-Za-z]+)$/u);
    if (!match?.[1]) continue;
    const [start, end] = parseRange(match[1]);
    const category = match[2];
    if (category?.startsWith('L')) {
      letters.fill(1, start, end + 1);
    } else if (category === 'Mn' || category === 'Mc' || category === 'Me') {
      combiningMarks.fill(1, start, end + 1);
    }
  }
  return { letters, combiningMarks };
}

function parseDerivedBidiClass(source: string): Uint8Array {
  // UCD's global @missing value is L. Specific @missing ranges override it,
  // and explicit records override all @missing values.
  const classes = new Uint8Array(0x110000);
  const lines = source.split(/\r?\n/u);

  for (const line of lines) {
    const match = line.match(/^#\s*@missing:\s*([0-9A-F.]+)\s*;\s*([A-Za-z_]+)/u);
    if (match?.[1] && match[2]) assignRange(classes, match[1], match[2]);
  }

  for (const line of lines) {
    const data = line.split('#', 1)[0]?.trim();
    if (!data) continue;
    const match = data.match(/^([0-9A-F.]+)\s*;\s*([A-Z]+)/u);
    if (match?.[1] && match[2]) assignRange(classes, match[1], match[2]);
  }
  return classes;
}

function collectRanges(classes: Uint8Array, predicate: (value: number) => boolean): Array<readonly [number, number]> {
  const ranges: Array<readonly [number, number]> = [];
  let start = -1;
  for (let codePoint = 0; codePoint <= 0x10ffff; codePoint += 1) {
    if (predicate(classes[codePoint]!)) {
      if (start < 0) start = codePoint;
    } else if (start >= 0) {
      ranges.push([start, codePoint - 1]);
      start = -1;
    }
  }
  if (start >= 0) ranges.push([start, 0x10ffff]);
  return ranges;
}

function encodeRangeDeltas(ranges: ReadonlyArray<readonly [number, number]>): string {
  const values: string[] = [];
  let previousEnd = -1;
  for (const [start, end] of ranges) {
    const gap = start - previousEnd - 1;
    if (gap < 0 || end < start) throw new Error(`Invalid generated Unicode range: ${start}..${end}`);
    values.push(gap.toString(36), (end - start).toString(36));
    previousEnd = end;
  }
  return values.join(',');
}

function assertRangeDeltaRoundTrip(name: string, ranges: ReadonlyArray<readonly [number, number]>): void {
  const encoded = encodeRangeDeltas(ranges);
  const deltas = encoded ? encoded.split(',') : [];
  if (deltas.length !== ranges.length * 2) throw new Error(`${name} range encoding has an invalid pair count.`);
  let previousEnd = -1;
  for (let index = 0; index < ranges.length; index += 1) {
    const start = previousEnd + 1 + Number.parseInt(deltas[index * 2]!, 36);
    const end = start + Number.parseInt(deltas[index * 2 + 1]!, 36);
    const expected = ranges[index]!;
    if (start !== expected[0] || end !== expected[1]) {
      throw new Error(`${name} range encoding changed ${expected[0]}..${expected[1]} to ${start}..${end}.`);
    }
    previousEnd = end;
  }
}

function renderRanges(name: string, ranges: ReadonlyArray<readonly [number, number]>): string {
  return `export const ${name} = decodeRangeDeltas('${encodeRangeDeltas(ranges)}');`;
}

interface GeneratedRanges {
  rtl: Array<readonly [number, number]>;
  nonStrong: Array<readonly [number, number]>;
  naturalLetters: Array<readonly [number, number]>;
  combiningMarks: Array<readonly [number, number]>;
}

function collectGeneratedRanges(bidiSource: string, generalCategorySource: string): GeneratedRanges {
  const classes = parseDerivedBidiClass(bidiSource);
  const generalCategory = parseDerivedGeneralCategory(generalCategorySource);
  return {
    rtl: collectRanges(classes, (value) => value === CLASS.R || value === CLASS.AL),
    nonStrong: collectRanges(classes, (value) => value === CLASS.OTHER),
    naturalLetters: collectRanges(generalCategory.letters, (value) => value === 1),
    combiningMarks: collectRanges(generalCategory.combiningMarks, (value) => value === 1)
  };
}

function generateTypeScript(ranges: GeneratedRanges): string {
  return `// Generated by scripts/generate-bidi-data.ts. Do not edit by hand.
// Source: ${BIDI_URL}
// SHA-256: ${BIDI_SHA256}
// Source: ${GENERAL_CATEGORY_URL}
// SHA-256: ${GENERAL_CATEGORY_SHA256}

import { decodeRangeDeltas } from '../unicode-ranges.js';

export const UNICODE_BIDI_VERSION = '${UNICODE_VERSION}';
export const UNICODE_BIDI_SHA256 = '${BIDI_SHA256}';
export const UNICODE_GENERAL_CATEGORY_SHA256 = '${GENERAL_CATEGORY_SHA256}';

${renderRanges('RTL_BIDI_RANGES', ranges.rtl)}

${renderRanges('NON_STRONG_BIDI_RANGES', ranges.nonStrong)}

${renderRanges('NATURAL_LETTER_RANGES', ranges.naturalLetters)}

${renderRanges('COMBINING_MARK_RANGES', ranges.combiningMarks)}
`;
}

function renderKotlinRanges(name: string, ranges: ReadonlyArray<readonly [number, number]>): string {
  const values = ranges
    .map(([start, end]) => `    0x${start.toString(16)}, 0x${end.toString(16)}`)
    .join(',\n');
  return `internal val ${name} = intArrayOf(\n${values}\n)`;
}

function generateKotlin(ranges: GeneratedRanges): string {
  return `// Generated by scripts/generate-bidi-data.ts. Do not edit by hand.
// Source: ${BIDI_URL}
// SHA-256: ${BIDI_SHA256}
// Source: ${GENERAL_CATEGORY_URL}
// SHA-256: ${GENERAL_CATEGORY_SHA256}

package io.github.codeinscrubs.bidilens.core.generated

internal const val UNICODE_BIDI_VERSION = "${UNICODE_VERSION}"
internal const val UNICODE_BIDI_SHA256 = "${BIDI_SHA256}"
internal const val UNICODE_GENERAL_CATEGORY_SHA256 = "${GENERAL_CATEGORY_SHA256}"

${renderKotlinRanges('RTL_BIDI_RANGES', ranges.rtl)}

${renderKotlinRanges('NON_STRONG_BIDI_RANGES', ranges.nonStrong)}

${renderKotlinRanges('NATURAL_LETTER_RANGES', ranges.naturalLetters)}

${renderKotlinRanges('COMBINING_MARK_RANGES', ranges.combiningMarks)}
`;
}

function renderSwiftRanges(name: string, ranges: ReadonlyArray<readonly [number, number]>): string {
  const values = ranges
    .map(([start, end]) => `        0x${start.toString(16)}, 0x${end.toString(16)}`)
    .join(',\n');
  return `    static let ${name}: [UInt32] = [\n${values}\n    ]`;
}

function generateSwift(ranges: GeneratedRanges): string {
  return `// Generated by scripts/generate-bidi-data.ts. Do not edit by hand.
// Source: ${BIDI_URL}
// SHA-256: ${BIDI_SHA256}
// Source: ${GENERAL_CATEGORY_URL}
// SHA-256: ${GENERAL_CATEGORY_SHA256}

enum GeneratedBidiRanges {
    static let unicodeVersion = "${UNICODE_VERSION}"
    static let bidiSHA256 = "${BIDI_SHA256}"
    static let generalCategorySHA256 = "${GENERAL_CATEGORY_SHA256}"

${renderSwiftRanges('rtl', ranges.rtl)}

${renderSwiftRanges('nonStrong', ranges.nonStrong)}

${renderSwiftRanges('naturalLetters', ranges.naturalLetters)}

${renderSwiftRanges('combiningMarks', ranges.combiningMarks)}
}
`;
}

function renderCSharpRanges(name: string, ranges: ReadonlyArray<readonly [number, number]>): string {
  const values = ranges
    .map(([start, end]) => `        0x${start.toString(16)}, 0x${end.toString(16)}`)
    .join(',\n');
  return `    internal static readonly int[] ${name} =\n    [\n${values}\n    ];`;
}

function generateCSharp(ranges: GeneratedRanges): string {
  return `// Generated by scripts/generate-bidi-data.ts. Do not edit by hand.
// Source: ${BIDI_URL}
// SHA-256: ${BIDI_SHA256}
// Source: ${GENERAL_CATEGORY_URL}
// SHA-256: ${GENERAL_CATEGORY_SHA256}

namespace BidiLens;

internal static class GeneratedBidiRanges
{
    internal const string UnicodeVersion = "${UNICODE_VERSION}";
    internal const string BidiSha256 = "${BIDI_SHA256}";
    internal const string GeneralCategorySha256 = "${GENERAL_CATEGORY_SHA256}";

${renderCSharpRanges('Rtl', ranges.rtl)}

${renderCSharpRanges('NonStrong', ranges.nonStrong)}

${renderCSharpRanges('NaturalLetters', ranges.naturalLetters)}

${renderCSharpRanges('CombiningMarks', ranges.combiningMarks)}
}
`;
}

function renderRustRanges(name: string, ranges: ReadonlyArray<readonly [number, number]>): string {
  const values = ranges
    .map(([start, end]) => `    (0x${start.toString(16)}, 0x${end.toString(16)}),`)
    .join('\n');
  return `pub(crate) static ${name}: &[(u32, u32)] = &[\n${values}\n];`;
}

function generateRust(ranges: GeneratedRanges): string {
  return `// Generated by scripts/generate-bidi-data.ts. Do not edit by hand.
// Source: ${BIDI_URL}
// SHA-256: ${BIDI_SHA256}
// Source: ${GENERAL_CATEGORY_URL}
// SHA-256: ${GENERAL_CATEGORY_SHA256}

pub const UNICODE_BIDI_VERSION: &str = "${UNICODE_VERSION}";
pub const UNICODE_BIDI_SHA256: &str =
    "${BIDI_SHA256}";
pub const UNICODE_GENERAL_CATEGORY_SHA256: &str =
    "${GENERAL_CATEGORY_SHA256}";

${renderRustRanges('RTL_BIDI_RANGES', ranges.rtl)}

${renderRustRanges('NON_STRONG_BIDI_RANGES', ranges.nonStrong)}

${renderRustRanges('NATURAL_LETTER_RANGES', ranges.naturalLetters)}

${renderRustRanges('COMBINING_MARK_RANGES', ranges.combiningMarks)}
`;
}

function verifiedBytes(source: UnicodeSource, bytes: Uint8Array): Uint8Array {
  const actualSha256 = createHash('sha256').update(bytes).digest('hex');
  if (actualSha256 !== source.sha256) {
    throw new Error(`${source.label} checksum mismatch: expected ${source.sha256}, received ${actualSha256}`);
  }
  return bytes;
}

async function localSourceBytes(source: UnicodeSource): Promise<Uint8Array> {
  return verifiedBytes(source, await readFile(source.path));
}

async function main(): Promise<void> {
  const check = process.argv.includes('--check');
  const [bidiSource, generalCategorySource] = UNICODE_SOURCES;
  const [bidiBytes, generalCategoryBytes] = await Promise.all([
    localSourceBytes(bidiSource),
    localSourceBytes(generalCategorySource)
  ]);
  const ranges = collectGeneratedRanges(
    new TextDecoder().decode(bidiBytes),
    new TextDecoder().decode(generalCategoryBytes)
  );
  assertRangeDeltaRoundTrip('RTL bidi', ranges.rtl);
  assertRangeDeltaRoundTrip('non-strong bidi', ranges.nonStrong);
  assertRangeDeltaRoundTrip('natural-letter', ranges.naturalLetters);
  assertRangeDeltaRoundTrip('combining-mark', ranges.combiningMarks);
  const generated = generateTypeScript(ranges);
  const androidGenerated = generateKotlin(ranges);
  const appleGenerated = generateSwift(ranges);
  const windowsGenerated = generateCSharp(ranges);
  const rustGenerated = generateRust(ranges);
  if (check) {
    const [current, androidCurrent, appleCurrent, windowsCurrent, rustCurrent] = await Promise.all([
      readFile(OUTPUT_PATH, 'utf8'),
      readFile(ANDROID_OUTPUT_PATH, 'utf8'),
      readFile(APPLE_OUTPUT_PATH, 'utf8'),
      readFile(WINDOWS_OUTPUT_PATH, 'utf8'),
      readFile(RUST_OUTPUT_PATH, 'utf8')
    ]);
    if (
      current !== generated ||
      androidCurrent !== androidGenerated ||
      appleCurrent !== appleGenerated ||
      windowsCurrent !== windowsGenerated ||
      rustCurrent !== rustGenerated
    ) {
      throw new Error('Generated bidi data is stale. Run pnpm unicode:generate.');
    }
    console.log(`Unicode ${UNICODE_VERSION} bidi and letter data are reproducible (${BIDI_SHA256}; ${GENERAL_CATEGORY_SHA256}).`);
    return;
  }
  await Promise.all([
    mkdir(dirname(OUTPUT_PATH), { recursive: true }),
    mkdir(dirname(ANDROID_OUTPUT_PATH), { recursive: true }),
    mkdir(dirname(APPLE_OUTPUT_PATH), { recursive: true }),
    mkdir(dirname(WINDOWS_OUTPUT_PATH), { recursive: true }),
    mkdir(dirname(RUST_OUTPUT_PATH), { recursive: true })
  ]);
  await Promise.all([
    writeFile(OUTPUT_PATH, generated, 'utf8'),
    writeFile(ANDROID_OUTPUT_PATH, androidGenerated, 'utf8'),
    writeFile(APPLE_OUTPUT_PATH, appleGenerated, 'utf8'),
    writeFile(WINDOWS_OUTPUT_PATH, windowsGenerated, 'utf8'),
    writeFile(RUST_OUTPUT_PATH, rustGenerated, 'utf8')
  ]);
  console.log(`Generated web, Android, Apple, Windows, and Rust Unicode tables from Unicode ${UNICODE_VERSION}.`);
}

await main();
