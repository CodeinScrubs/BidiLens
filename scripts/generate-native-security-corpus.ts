import { readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { scanBidiSecurity } from '../packages/core/src/security.js';

// Differential fixtures supplement, rather than replace, independently authored
// native assertions. Keep expected codes, severities, ranges, and inventory in
// sync with the web scanner without copying its algorithm into the tests.
const inputs: { id: string; text: string }[] = [];
const add = (id: string, text: string): void => { inputs.push({ id, text }); };
const controls = [0x061c, 0x200e, 0x200f, 0x202a, 0x202b, 0x202c, 0x202d, 0x202e,
  0x2066, 0x2067, 0x2068, 0x2069, 0x206a, 0x206b, 0x206c, 0x206d, 0x206e, 0x206f];
for (const value of controls) add(`inventory-${value.toString(16)}`, `👩🏽‍💻 e\u0301${String.fromCodePoint(value)}کتاب`);
for (const opener of [0x202a, 0x202b, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068]) {
  for (const closer of ['', '\u202c', '\u2069', '\u202c\u2069', '\u2069\u202c']) {
    add(`pair-${opener.toString(16)}-${inputs.length}`, `${String.fromCodePoint(opener)}hello ${closer}`);
  }
}
for (const [index, separator] of ['\n', '\r\n', '\r', '\u0085', '\u001c', '\u001d', '\u001e', '\u2029', '\u2028'].entries()) {
  add(`isolate-boundary-${index}`, `👋\u2066left${separator}right\u2069`);
  add(`embedding-boundary-${index}`, `👋\u202bleft${separator}right\u202c`);
}
for (const [index, text] of [
  '', 'Plain English', 'می\u200cروم', '👩🏽‍💻', '\u200cabc', 'abc\u200d',
  'a\u200cb', '$\u200d_', '1\u200c2', 'a\u200cکتاب', 'کتاب\u200da',
  '\u200b', '👋a\u200bb\u2060c\ufeff', '\ufeffhello', '\ufeffhello\ufeff',
  '\u2066a\u2067b\u2069c\u2069', '\u2068a\u202bb\u2069\u202c',
  '\u202ba\u2066b\u202cc\u2069\u202c', '\u2066a\u202bb\u202cc\u2069',
  '\u2066\u2067\u202b\u2069\u2069', '\u202b\u2066\u2067\u2069\u2069\u202c',
  '\u2066\n\u2069\r\u202c', '\u2069\u202c',
].entries()) add(`context-${index}`, text);

const fixtures = inputs.map(({ id, text }) => {
  const report = scanBidiSecurity(text);
  return {
    id, text, safe: report.safe,
    controls: report.controls.map((control) => [control.codePoint, control.index, control.end,
      control.codePointIndex, control.name, control.risk]),
    findings: report.findings.map((finding) => [finding.code, finding.severity,
      finding.sourceRange.utf16.start, finding.sourceRange.utf16.end,
      finding.sourceRange.codePoint.start, finding.sourceRange.codePoint.end])
  };
});
const generated = `${JSON.stringify(fixtures, null, 2)}\n`;
for (const path of ['corpus/native-security.json', 'apple/Tests/BidiLensTests/Resources/native-security.json']) {
  if (process.argv.includes('--check')) {
    if (await readFile(path, 'utf8') !== generated) {
      throw new Error(`${path} is stale. Run pnpm corpus:generate.`);
    }
  } else {
    await writeFile(path, generated, 'utf8');
  }
}
console.log(`Native security differential corpus is ${process.argv.includes('--check') ? 'reproducible' : 'generated'} (${fixtures.length} fixtures).`);
