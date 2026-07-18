#!/usr/bin/env node
import { lstat, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, extname, relative, resolve } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { Command, CommanderError } from 'commander';
import { renderBidiHtml } from '@bidilens/html';
import {
  analyzeText,
  findBidiControls,
  sanitizeBidiControls,
  scanBidiSecurity,
  visibleBidiControls,
  type BidiControlRisk,
  type BidiSecurityFinding,
  type BidiSecurityMode
} from '@bidilens/core';

const SUPPORTED_EXTENSIONS = new Set([
  '.md', '.mdx', '.txt', '.html', '.htm', '.json', '.yaml', '.yml',
  '.js', '.jsx', '.ts', '.tsx', '.css', '.scss', '.py', '.go', '.rs',
  '.java', '.kt', '.swift', '.c', '.cc', '.cpp', '.h', '.hpp', '.toml',
  '.vue', '.svelte', '.astro', '.dart', '.xml', '.svg', '.sh', '.bash',
  '.zsh', '.fish', '.cs', '.fs', '.fsx', '.vb', '.rb', '.php', '.sql',
  '.ini', '.conf', '.properties', '.gradle', '.groovy', '.lua', '.pl', '.r',
  '.ex', '.exs', '.erl', '.hrl'
]);

const SUPPORTED_BASENAMES = new Set([
  'dockerfile', 'makefile', 'gemfile', 'podfile', 'rakefile', 'cmakelists.txt',
  'build', 'workspace', '.env'
]);

const IGNORED_DIRECTORIES = new Set([
  'node_modules', '.git', 'dist', 'build', 'coverage', 'test-results',
  'playwright-report', '.vite', '.next', '.nuxt', '.svelte-kit', '.output'
]);

const RISK_ORDER: Record<BidiControlRisk, number> = { low: 1, medium: 2, high: 3 };

export interface CliRuntime {
  cwd?: string;
  stdout?: (value: string) => void;
  stderr?: (value: string) => void;
}

interface RuntimeState {
  cwd: string;
  stdout: (value: string) => void;
  stderr: (value: string) => void;
  exitCode: number;
}

function createRuntime(runtime: CliRuntime): RuntimeState {
  return {
    cwd: resolve(runtime.cwd ?? process.cwd()),
    stdout: runtime.stdout ?? ((value) => process.stdout.write(value)),
    stderr: runtime.stderr ?? ((value) => process.stderr.write(value)),
    exitCode: 0
  };
}

function line(writer: (value: string) => void, value = ''): void {
  writer(`${value}\n`);
}

async function collectFiles(inputs: string[], cwd: string): Promise<string[]> {
  const files: string[] = [];
  async function visitPath(input: string, explicitlyNamed: boolean): Promise<void> {
    const absolute = resolve(cwd, input);
    const info = await lstat(absolute);
    if (info.isSymbolicLink()) return;
    if (info.isDirectory()) {
      const entries = await readdir(absolute, { withFileTypes: true });
      entries.sort((a, b) => a.name.localeCompare(b.name));
      for (const entry of entries) {
        if (IGNORED_DIRECTORIES.has(entry.name.toLowerCase())) continue;
        if (entry.isSymbolicLink()) continue;
        await visitPath(resolve(absolute, entry.name), false);
      }
      return;
    }
    const name = basename(absolute).toLowerCase();
    const supportedName = SUPPORTED_BASENAMES.has(name) || name.startsWith('.env.');
    if (info.isFile() && (explicitlyNamed || supportedName || SUPPORTED_EXTENSIONS.has(extname(absolute).toLowerCase()))) {
      files.push(absolute);
    }
  }
  for (const input of inputs) await visitPath(input, true);
  return files.sort((a, b) => a.localeCompare(b));
}

async function readCorpus(cwd: string, explicitPath?: string): Promise<Array<{ id: string; text: string; expected: string }>> {
  const candidates: Array<string | URL> = explicitPath
    ? [resolve(cwd, explicitPath)]
    : [
      resolve(cwd, 'corpus/cases.json'),
      new URL('../corpus/cases.json', import.meta.url),
      new URL('../../../corpus/cases.json', import.meta.url)
    ];
  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return JSON.parse(await readFile(candidate, 'utf8')) as Array<{ id: string; text: string; expected: string }>;
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`Unable to locate corpus/cases.json. Pass --corpus <path>. ${String(lastError)}`);
}

function parseRisk(value: string): BidiControlRisk {
  if (value === 'low' || value === 'medium' || value === 'high') return value;
  throw new Error(`Invalid risk level: ${value}`);
}

function parseSecurityMode(value: string): BidiSecurityMode {
  if (value === 'off' || value === 'audit' || value === 'warn' || value === 'strict') return value;
  throw new Error(`Invalid security mode: ${value}`);
}

function riskForFinding(finding: BidiSecurityFinding): BidiControlRisk {
  if (finding.severity === 'high') return 'high';
  if (finding.severity === 'warning') return 'medium';
  return 'low';
}

function highestFindingRisk(findings: readonly BidiSecurityFinding[]): BidiControlRisk | null {
  if (findings.some((finding) => finding.severity === 'high')) return 'high';
  if (findings.some((finding) => finding.severity === 'warning')) return 'medium';
  if (findings.length) return 'low';
  return null;
}

function sourcePosition(text: string, utf16Offset: number): { line: number; column: number } {
  let lineNumber = 1;
  let lineStart = 0;
  const newline = /\r\n|\n|\r/gu;
  let match: RegExpExecArray | null;
  while ((match = newline.exec(text)) !== null && match.index < utf16Offset) {
    lineNumber += 1;
    lineStart = match.index + match[0].length;
  }
  return { line: lineNumber, column: utf16Offset - lineStart + 1 };
}

function artifactUri(file: string, cwd: string): string {
  const local = relative(cwd, file);
  if (local && !local.startsWith('..') && !resolve(local).startsWith('..')) return local.replaceAll('\\', '/');
  return pathToFileURL(file).href;
}

interface SecurityFileReport {
  file: string;
  text: string;
  findings: BidiSecurityFinding[];
  highestRisk: BidiControlRisk | null;
}

function sarifForReports(reports: readonly SecurityFileReport[], cwd: string): object {
  return {
    version: '2.1.0',
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    runs: [{
      columnKind: 'utf16CodeUnits',
      tool: { driver: { name: 'BidiLens', semanticVersion: '0.1.0' } },
      results: reports.flatMap((report) => report.findings.map((finding) => {
        const start = sourcePosition(report.text, finding.sourceRange.utf16.start);
        const end = sourcePosition(report.text, finding.sourceRange.utf16.end);
        return {
          ruleId: finding.code,
          level: finding.severity === 'high' ? 'error' : finding.severity === 'warning' ? 'warning' : 'note',
          message: { text: `${finding.message} ${finding.remediation}` },
          locations: [{
            physicalLocation: {
              artifactLocation: { uri: artifactUri(report.file, cwd) },
              region: {
                startLine: start.line,
                startColumn: start.column,
                endLine: end.line,
                endColumn: end.column
              }
            }
          }]
        };
      }))
    }]
  };
}

function createCliProgram(state: RuntimeState): Command {
  const program = new Command();
  program
    .name('bidilens')
    .description('Inspect and secure mixed bidirectional text')
    .version('0.1.0')
    .exitOverride()
    .configureOutput({ writeOut: state.stdout, writeErr: state.stderr });

  program.command('inspect')
    .description('Analyze a string or file')
    .option('-t, --text <text>', 'text to inspect')
    .option('-f, --file <path>', 'file to inspect')
    .option('--json', 'emit JSON')
    .action(async (options: { text?: string; file?: string; json?: boolean }) => {
      if (!options.text && !options.file) throw new Error('Provide --text or --file.');
      const text = options.file ? await readFile(resolve(state.cwd, options.file), 'utf8') : options.text!;
      const analysis = analyzeText(text, { strategy: 'content-majority', fallback: 'neutral' });
      const controls = findBidiControls(text);
      const report = { analysis, controls, visible: controls.length ? visibleBidiControls(text) : text };
      if (options.json) line(state.stdout, JSON.stringify(report, null, 2));
      else {
        line(state.stdout, `Direction: ${analysis.direction}`);
        line(state.stdout, `Confidence: ${analysis.confidence}`);
        line(state.stdout, `Strong characters: RTL ${analysis.counts.rtl}, LTR ${analysis.counts.ltr}`);
        line(state.stdout, `Paragraphs: ${analysis.paragraphs.length}`);
        line(state.stdout, `Bidi controls: ${controls.length}`);
        if (controls.length) line(state.stdout, report.visible);
      }
    });

  program.command('render')
    .description('Render plain text as escaped, semantic direction-aware HTML')
    .option('-t, --text <text>', 'text to render')
    .option('-f, --file <path>', 'file to render')
    .option('--json', 'emit analysis and HTML as JSON')
    .action(async (options: { text?: string; file?: string; json?: boolean }) => {
      if (!options.text && !options.file) throw new Error('Provide --text or --file.');
      const text = options.file ? await readFile(resolve(state.cwd, options.file), 'utf8') : options.text!;
      const result = renderBidiHtml(text);
      line(state.stdout, options.json
        ? JSON.stringify({ analysis: result.analysis, html: result.html }, null, 2)
        : result.html);
    });

  program.command('audit')
    .aliases(['security-scan', 'lint'])
    .description('Audit files for hidden and unbalanced bidi controls')
    .argument('<paths...>', 'files or directories')
    .option('--json', 'emit JSON')
    .option('--sarif', 'emit SARIF 2.1.0')
    .option('--mode <mode>', 'off, audit, warn, or strict', parseSecurityMode, 'audit')
    .option('--fail-on <risk>', 'minimum risk that exits non-zero', parseRisk, 'high')
    .action(async (paths: string[], options: {
      json?: boolean;
      sarif?: boolean;
      mode: BidiSecurityMode;
      failOn: BidiControlRisk;
    }) => {
      if (options.json && options.sarif) throw new Error('Choose either --json or --sarif, not both.');
      const files = await collectFiles(paths, state.cwd);
      const reports: SecurityFileReport[] = [];
      let shouldFail = false;

      for (const file of files) {
        const text = await readFile(file, 'utf8');
        const security = scanBidiSecurity(text, { mode: options.mode });
        if (!security.findings.length) continue;
        const highestRisk = highestFindingRisk(security.findings);
        reports.push({ file, text, findings: security.findings, highestRisk });
        if (security.shouldBlock || (highestRisk && RISK_ORDER[highestRisk] >= RISK_ORDER[options.failOn])) shouldFail = true;
      }

      if (options.sarif) line(state.stdout, JSON.stringify(sarifForReports(reports, state.cwd), null, 2));
      else if (options.json) {
        line(state.stdout, JSON.stringify({
          scanned: files.length,
          reports: reports.map((report) => ({
            file: report.file,
            findings: report.findings,
            highestRisk: report.highestRisk
          }))
        }, null, 2));
      } else if (!reports.length) line(state.stdout, `No bidi security findings in ${files.length} files.`);
      else {
        for (const report of reports) {
          line(state.stdout, `\n${report.file} (${report.highestRisk ?? 'unknown'})`);
          for (const finding of report.findings) {
            const position = sourcePosition(report.text, finding.sourceRange.utf16.start);
            line(state.stdout, `  ${finding.code} at ${position.line}:${position.column} [${riskForFinding(finding)}] ${finding.message}`);
          }
        }
      }
      if (shouldFail) state.exitCode = Math.max(state.exitCode, 2);
    });

  program.command('test')
    .description('Run the direction conformance corpus')
    .option('--json', 'emit failures as JSON')
    .option('--corpus <path>', 'corpus JSON path; defaults to the bundled corpus or repository corpus')
    .action(async (options: { json?: boolean; corpus?: string }) => {
      const corpus = await readCorpus(state.cwd, options.corpus);
      const failures = corpus.flatMap((item) => {
        const actual = analyzeText(item.text, { strategy: 'content-majority', fallback: 'neutral' }).direction;
        return actual === item.expected ? [] : [{ id: item.id, expected: item.expected, actual }];
      });
      if (options.json) line(state.stdout, JSON.stringify({ total: corpus.length, failures }, null, 2));
      else line(state.stdout, `Corpus: ${corpus.length - failures.length}/${corpus.length} passed`);
      if (failures.length) state.exitCode = Math.max(state.exitCode, 1);
    });

  program.command('sanitize')
    .description('Remove bidi controls from one file')
    .argument('<file>', 'input file')
    .option('-o, --output <path>', 'output path; defaults to stdout')
    .option('--keep-low', 'preserve low-risk ALM/LRM/RLM marks')
    .action(async (file: string, options: { output?: string; keepLow?: boolean }) => {
      const text = await readFile(resolve(state.cwd, file), 'utf8');
      const remove: BidiControlRisk[] = options.keepLow ? ['high', 'medium'] : ['high', 'medium', 'low'];
      const result = sanitizeBidiControls(text, { remove });
      if (options.output) {
        const output = resolve(state.cwd, options.output);
        await writeFile(output, result.text, 'utf8');
        line(state.stderr, `Removed ${result.removed.length} controls and wrote ${output}.`);
      } else {
        state.stdout(result.text);
      }
    });

  return program;
}

export async function runCli(argv: readonly string[] = process.argv, runtime: CliRuntime = {}): Promise<number> {
  const state = createRuntime(runtime);
  const program = createCliProgram(state);
  try {
    await program.parseAsync([...argv], { from: 'node' });
  } catch (error) {
    if (error instanceof CommanderError) return Math.max(state.exitCode, error.exitCode);
    const message = error instanceof Error ? error.message : String(error);
    line(state.stderr, `bidilens: ${message}`);
    return Math.max(state.exitCode, 1);
  }
  return state.exitCode;
}
