#!/usr/bin/env node
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import process from 'node:process';
import { Command } from 'commander';
import {
  analyzeText,
  findBidiControls,
  highestControlRisk,
  sanitizeBidiControls,
  visibleBidiControls,
  planInlineIsolation,
  type BidiControlRisk
} from '@bidilens/core';

const SUPPORTED_EXTENSIONS = new Set([
  '.md', '.mdx', '.txt', '.html', '.htm', '.json', '.yaml', '.yml',
  '.js', '.jsx', '.ts', '.tsx', '.css', '.scss', '.py', '.go', '.rs',
  '.java', '.kt', '.swift', '.c', '.cc', '.cpp', '.h', '.hpp', '.toml'
]);

const RISK_ORDER: Record<BidiControlRisk, number> = { low: 1, medium: 2, high: 3 };

async function collectFiles(inputs: string[]): Promise<string[]> {
  const files: string[] = [];
  async function visitPath(input: string): Promise<void> {
    const absolute = resolve(input);
    const info = await stat(absolute);
    if (info.isDirectory()) {
      const entries = await readdir(absolute, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
        await visitPath(resolve(absolute, entry.name));
      }
      return;
    }
    if (info.isFile() && SUPPORTED_EXTENSIONS.has(extname(absolute).toLowerCase())) files.push(absolute);
  }
  for (const input of inputs) await visitPath(input);
  return files;
}

function parseRisk(value: string): BidiControlRisk {
  if (value === 'low' || value === 'medium' || value === 'high') return value;
  throw new Error(`Invalid risk level: ${value}`);
}

const program = new Command();
program
  .name('bidilens')
  .description('Inspect and secure mixed bidirectional text')
  .version('0.1.0');

program.command('inspect')
  .description('Analyze a string or file')
  .option('-t, --text <text>', 'text to inspect')
  .option('-f, --file <path>', 'file to inspect')
  .option('--json', 'emit JSON')
  .action(async (options: { text?: string; file?: string; json?: boolean }) => {
    if (!options.text && !options.file) throw new Error('Provide --text or --file.');
    const text = options.file ? await readFile(resolve(options.file), 'utf8') : options.text!;
    const analysis = analyzeText(text, { strategy: 'content-majority', fallback: 'neutral' });
    const controls = findBidiControls(text);
    const report = { analysis, controls, visible: controls.length ? visibleBidiControls(text) : text };
    if (options.json) console.log(JSON.stringify(report, null, 2));
    else {
      console.log(`Direction: ${analysis.direction}`);
      console.log(`Confidence: ${analysis.confidence}`);
      console.log(`Strong characters: RTL ${analysis.counts.rtl}, LTR ${analysis.counts.ltr}`);
      console.log(`Paragraphs: ${analysis.paragraphs.length}`);
      console.log(`Bidi controls: ${controls.length}`);
      if (controls.length) console.log(report.visible);
    }
  });

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/gu, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character] ?? character));
}

program.command('render')
  .description('Render plain text as semantic direction-aware HTML')
  .option('-t, --text <text>', 'text to render')
  .option('-f, --file <path>', 'file to render')
  .option('--json', 'emit analysis and HTML as JSON')
  .action(async (options: { text?: string; file?: string; json?: boolean }) => {
    if (!options.text && !options.file) throw new Error('Provide --text or --file.');
    const text = options.file ? await readFile(resolve(options.file), 'utf8') : options.text!;
    const analysis = analyzeText(text, { strategy: 'content-majority', fallback: 'ltr' });
    const direction = analysis.direction === 'neutral' ? 'ltr' : analysis.direction;
    const isolations = planInlineIsolation(text, direction);
    let content = '';
    let cursor = 0;
    for (const isolation of isolations) {
      content += escapeHtml(text.slice(cursor, isolation.start));
      const value = escapeHtml(isolation.text);
      const tag = isolation.kind === 'code' ? 'code' : 'bdi';
      content += `<${tag} dir="${isolation.direction}" data-bidilens-isolate="">${value}</${tag}>`;
      cursor = isolation.end;
    }
    content += escapeHtml(text.slice(cursor));
    const html = `<p dir="${direction}" data-bidilens-block="">${content}</p>`;
    if (options.json) console.log(JSON.stringify({ analysis, html }, null, 2));
    else console.log(html);
  });

program.command('audit')
  .alias('security-scan')
  .description('Audit files for hidden bidi controls')
  .argument('<paths...>', 'files or directories')
  .option('--json', 'emit JSON')
  .option('--sarif', 'emit SARIF 2.1.0')
  .option('--fail-on <risk>', 'minimum risk that exits non-zero', parseRisk, 'high')
  .action(async (paths: string[], options: { json?: boolean; sarif?: boolean; failOn: BidiControlRisk }) => {
    const files = await collectFiles(paths);
    const reports = [] as Array<{
      file: string;
      findings: ReturnType<typeof findBidiControls>;
      highestRisk: BidiControlRisk | null;
    }>;
    let shouldFail = false;

    for (const file of files) {
      const text = await readFile(file, 'utf8');
      const findings = findBidiControls(text);
      if (!findings.length) continue;
      const highestRisk = highestControlRisk(findings);
      reports.push({ file, findings, highestRisk });
      if (highestRisk && (RISK_ORDER[highestRisk] ?? 0) >= (RISK_ORDER[options.failOn] ?? 0)) shouldFail = true;
    }

    if (options.sarif) {
      console.log(JSON.stringify({
        version: '2.1.0',
        $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
        runs: [{
          tool: { driver: { name: 'bidilens', informationUri: 'https://github.com/bidilens/bidilens' } },
          results: reports.flatMap((report) => report.findings.map((finding) => ({
            ruleId: finding.category,
            level: finding.risk === 'high' ? 'error' : finding.risk === 'medium' ? 'warning' : 'note',
            message: { text: `${finding.name} (${finding.codePoint})` },
            locations: [{ physicalLocation: { artifactLocation: { uri: report.file }, region: { startColumn: finding.index + 1 } } }]
          })))
        }]
      }, null, 2));
    } else if (options.json) console.log(JSON.stringify({ scanned: files.length, reports }, null, 2));
    else if (!reports.length) console.log(`No bidi controls found in ${files.length} files.`);
    else {
      for (const report of reports) {
        console.log(`\n${report.file} (${report.highestRisk ?? 'unknown'})`);
        for (const finding of report.findings) {
          console.log(`  ${finding.codePoint} ${finding.name} at UTF-16 index ${finding.index} [${finding.risk}]`);
        }
      }
    }
    if (shouldFail) process.exitCode = 2;
  });

program.command('test')
  .description('Run the direction conformance corpus')
  .option('--json', 'emit failures as JSON')
  .action(async (options: { json?: boolean }) => {
    const corpus = JSON.parse(await readFile(resolve('corpus/cases.json'), 'utf8')) as Array<{ id: string; text: string; expected: string }>;
    const failures = corpus.flatMap((item) => {
      const actual = analyzeText(item.text, { strategy: 'content-majority', fallback: 'neutral' }).direction;
      return actual === item.expected ? [] : [{ id: item.id, expected: item.expected, actual }];
    });
    if (options.json) console.log(JSON.stringify({ total: corpus.length, failures }, null, 2));
    else console.log(`Corpus: ${corpus.length - failures.length}/${corpus.length} passed`);
    if (failures.length) process.exitCode = 1;
  });

program.command('sanitize')
  .description('Remove bidi controls from one file')
  .argument('<file>', 'input file')
  .option('-o, --output <path>', 'output path; defaults to stdout')
  .option('--keep-low', 'preserve low-risk LRM/RLM marks')
  .action(async (file: string, options: { output?: string; keepLow?: boolean }) => {
    const text = await readFile(resolve(file), 'utf8');
    const remove: BidiControlRisk[] = options.keepLow ? ['high', 'medium'] : ['high', 'medium', 'low'];
    const result = sanitizeBidiControls(text, { remove });
    if (options.output) {
      await writeFile(resolve(options.output), result.text, 'utf8');
      console.error(`Removed ${result.removed.length} controls and wrote ${resolve(options.output)}.`);
    } else {
      process.stdout.write(result.text);
    }
  });

program.parseAsync().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`bidilens: ${message}`);
  process.exitCode = 1;
});
