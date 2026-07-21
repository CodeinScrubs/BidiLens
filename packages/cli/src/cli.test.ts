import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BIDI_CONTROLS } from '@bidilens/core';
import { runCli } from './index.js';

interface Invocation {
  code: number;
  stdout: string;
  stderr: string;
}

describe('BidiLens CLI', () => {
  let cwd = '';

  beforeAll(async () => {
    cwd = await mkdtemp(join(tmpdir(), 'bidilens-cli-test-'));
  });

  afterAll(async () => {
    await rm(cwd, { recursive: true, force: true });
  });

  async function invoke(args: string[]): Promise<Invocation> {
    let stdout = '';
    let stderr = '';
    const code = await runCli(['node', 'bidilens', ...args], {
      cwd,
      stdout: (value) => { stdout += value; },
      stderr: (value) => { stderr += value; }
    });
    return { code, stdout, stderr };
  }

  it('renders LTR-only input without BidiLens-specific markup', async () => {
    const source = 'React is a very popular JavaScript library.';
    const result = await invoke(['render', '--text', source, '--json']);
    const report = JSON.parse(result.stdout) as { html: string; analysis: { text: string; direction: string } };
    expect(result.code).toBe(0);
    expect(report.analysis).toMatchObject({ text: source, direction: 'ltr' });
    expect(report.html).toBe(`<p>${source}</p>`);
    expect(report.html).not.toContain('data-bidilens');
    expect(report.html).not.toContain('dir=');
  });

  it('exposes the explicit always-annotation compatibility mode', async () => {
    const result = await invoke(['render', '--text', 'Hello world', '--intervention', 'always']);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('<p dir="ltr" data-bidilens-block="">');
  });

  it('inspects mixed text in human and JSON formats', async () => {
    const source = 'React یک کتابخانه جاوااسکریپت بسیار محبوب است.';
    const human = await invoke(['inspect', '--text', source]);
    expect(human.code).toBe(0);
    expect(human.stderr).toBe('');
    expect(human.stdout).toContain('Direction: rtl');
    expect(human.stdout).toContain('Bidi controls: 0');

    const json = await invoke(['inspect', '--text', source, '--json']);
    const report = JSON.parse(json.stdout) as { analysis: { direction: string; text: string }; controls: unknown[] };
    expect(json.code).toBe(0);
    expect(report.analysis.direction).toBe('rtl');
    expect(report.analysis.text).toBe(source);
    expect(report.controls).toEqual([]);
  });

  it('renders escaped semantic HTML without changing logical text', async () => {
    const source = '<img src=x onerror=alert(1)> React یک کتابخانه است.';
    const result = await invoke(['render', '--text', source, '--json']);
    const report = JSON.parse(result.stdout) as { analysis: { text: string; direction: string }; html: string };
    expect(result.code).toBe(0);
    expect(report.analysis.text).toBe(source);
    expect(report.analysis.direction).toBe('rtl');
    expect(report.html).toContain('<p dir="rtl"');
    expect(report.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(report.html).not.toContain('<img');
    expect(report.html).toContain('>React</bdi>');
  });

  it('renders every paragraph with an independent base direction', async () => {
    const source = 'سلام دنیا\nHello world';
    const result = await invoke(['render', '--text', source, '--json']);
    const report = JSON.parse(result.stdout) as { html: string; analysis: { paragraphs: Array<{ direction: string }> } };
    expect(result.code).toBe(0);
    expect(report.analysis.paragraphs.map((paragraph) => paragraph.direction)).toEqual(['rtl', 'ltr']);
    expect(report.html).toContain('<p dir="rtl"');
    expect(report.html).toContain('<p dir="ltr"');
    expect(report.html).toContain('</p>\n<p');
    expect((report.html.match(/data-bidilens-block/g) ?? [])).toHaveLength(2);
  });

  it('audits balanced state and emits valid line-aware SARIF locations', async () => {
    const suspicious = `first line\nsafe${BIDI_CONTROLS.RLO}evil`;
    await writeFile(join(cwd, 'suspicious.ts'), suspicious, 'utf8');
    const result = await invoke(['security-scan', 'suspicious.ts', '--sarif']);
    const sarif = JSON.parse(result.stdout) as {
      version: string;
      runs: Array<{ columnKind: string; results: Array<{
        ruleId: string;
        locations: Array<{ physicalLocation: { artifactLocation: { uri: string }; region: { startLine: number; startColumn: number } } }>;
      }> }>;
    };
    expect(result.code).toBe(2);
    expect(result.stderr).toBe('');
    expect(sarif.version).toBe('2.1.0');
    expect(sarif.runs[0]?.columnKind).toBe('utf16CodeUnits');
    expect(sarif.runs[0]?.results.map((item) => item.ruleId)).toContain('BIDI_OVERRIDE_CONTROL');
    expect(sarif.runs[0]?.results.map((item) => item.ruleId)).toContain('BIDI_UNCLOSED_EMBEDDING');
    const override = sarif.runs[0]?.results.find((item) => item.ruleId === 'BIDI_OVERRIDE_CONTROL');
    expect(override?.locations[0]?.physicalLocation.artifactLocation.uri).toBe('suspicious.ts');
    expect(override?.locations[0]?.physicalLocation.region.startLine).toBe(2);
    expect(override?.locations[0]?.physicalLocation.region.startColumn).toBe(5);
  });

  it('supports clean scans, aliases, modes, and JSON reports', async () => {
    await writeFile(join(cwd, 'clean.md'), 'می\u200Cخواهم کتاب بخوانم.', 'utf8');
    const clean = await invoke(['lint', 'clean.md']);
    expect(clean.code).toBe(0);
    expect(clean.stdout).toContain('No bidi security findings in 1 files.');

    const disabled = await invoke(['audit', 'suspicious.ts', '--mode', 'off', '--json']);
    expect(disabled.code).toBe(0);
    expect(JSON.parse(disabled.stdout)).toEqual({ scanned: 1, reports: [] });

    const json = await invoke(['audit', 'suspicious.ts', '--json', '--fail-on', 'high']);
    const report = JSON.parse(json.stdout) as { scanned: number; reports: Array<{ highestRisk: string; findings: unknown[] }> };
    expect(json.code).toBe(2);
    expect(report.scanned).toBe(1);
    expect(report.reports).toHaveLength(1);
    expect(report.reports[0]?.highestRisk).toBe('high');
    expect(report.reports[0]?.findings.length).toBeGreaterThanOrEqual(2);
    expect(json.stdout).not.toContain('"text"');
  });

  it('walks framework and extensionless sources while ignoring generated directories', async () => {
    const scope = join(cwd, 'scan-scope');
    await mkdir(join(scope, 'src'), { recursive: true });
    await mkdir(join(scope, 'coverage'), { recursive: true });
    await writeFile(join(scope, 'src', 'Message.vue'), `safe${BIDI_CONTROLS.RLO}evil`, 'utf8');
    await writeFile(join(scope, 'Dockerfile'), 'FROM node:20\n', 'utf8');
    await writeFile(join(scope, 'coverage', 'generated.ts'), `safe${BIDI_CONTROLS.RLO}ignored`, 'utf8');

    const result = await invoke(['audit', 'scan-scope', '--json']);
    const report = JSON.parse(result.stdout) as {
      scanned: number;
      reports: Array<{ file: string; findings: Array<{ code: string }> }>;
    };
    expect(result.code).toBe(2);
    expect(report.scanned).toBe(2);
    expect(report.reports).toHaveLength(1);
    expect(report.reports[0]?.file).toMatch(/Message\.vue$/u);
    expect(report.reports[0]?.findings.map((finding) => finding.code)).toContain('BIDI_OVERRIDE_CONTROL');
    expect(result.stdout).not.toContain('generated.ts');
  });

  it('audits every explicitly named regular file regardless of extension', async () => {
    const explicit = join(cwd, '.gitattributes');
    await writeFile(explicit, `safe${BIDI_CONTROLS.RLO}evil`, 'utf8');
    const result = await invoke(['audit', '.gitattributes', '--json']);
    const report = JSON.parse(result.stdout) as {
      scanned: number;
      reports: Array<{ file: string; findings: Array<{ code: string }> }>;
    };
    expect(result.code).toBe(2);
    expect(report.scanned).toBe(1);
    expect(report.reports[0]?.file).toMatch(/\.gitattributes$/u);
    expect(report.reports[0]?.findings.map((finding) => finding.code)).toContain('BIDI_OVERRIDE_CONTROL');
  });

  it('runs explicit conformance corpora and returns a failing exit code on disagreement', async () => {
    const passing = [{ id: 'flagship', text: 'React یک کتابخانه است.', expected: 'rtl' }];
    await writeFile(join(cwd, 'passing.json'), JSON.stringify(passing), 'utf8');
    const pass = await invoke(['test', '--corpus', 'passing.json', '--json']);
    expect(pass.code).toBe(0);
    expect(JSON.parse(pass.stdout)).toEqual({ total: 1, failures: [] });

    const failing = [{ ...passing[0], expected: 'ltr' }];
    await writeFile(join(cwd, 'failing.json'), JSON.stringify(failing), 'utf8');
    const fail = await invoke(['test', '--corpus', 'failing.json', '--json']);
    const report = JSON.parse(fail.stdout) as { total: number; failures: Array<{ id: string; actual: string; expected: string }> };
    expect(fail.code).toBe(1);
    expect(report.total).toBe(1);
    expect(report.failures).toEqual([{ id: 'flagship', expected: 'ltr', actual: 'rtl' }]);
  });

  it('sanitizes to stdout or a file and can preserve low-risk marks', async () => {
    const input = `${BIDI_CONTROLS.LRM}safe${BIDI_CONTROLS.RLO}evil${BIDI_CONTROLS.PDF}`;
    await writeFile(join(cwd, 'input.txt'), input, 'utf8');
    const stdout = await invoke(['sanitize', 'input.txt']);
    expect(stdout.code).toBe(0);
    expect(stdout.stdout).toBe('safeevil');
    expect(stdout.stderr).toBe('');

    const file = await invoke(['sanitize', 'input.txt', '--keep-low', '--output', 'cleaned.txt']);
    expect(file.code).toBe(0);
    expect(file.stdout).toBe('');
    expect(file.stderr).toContain('Removed 2 controls');
    expect(await readFile(join(cwd, 'cleaned.txt'), 'utf8')).toBe(`${BIDI_CONTROLS.LRM}safeevil`);
  });

  it('returns controlled errors for invalid invocations', async () => {
    const missing = await invoke(['inspect']);
    expect(missing.code).toBe(1);
    expect(missing.stderr).toContain('bidilens: Provide --text or --file.');

    const conflicting = await invoke(['audit', 'clean.md', '--json', '--sarif']);
    expect(conflicting.code).toBe(1);
    expect(conflicting.stderr).toContain('Choose either --json or --sarif');

    const absent = await invoke(['audit', 'does-not-exist']);
    expect(absent.code).toBe(1);
    expect(absent.stderr).toContain('bidilens:');
  });
});
