import { link, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  buildCliArguments,
  readActionInputs,
  runAction,
  workflowError
} from './index.js';

const temporaryDirectories: string[] = [];

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(resolve(tmpdir(), 'bidilens-action-test-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(async (directory) => {
    await rm(directory, { recursive: true, force: true });
  }));
});

describe('BidiLens GitHub Action', () => {
  it('normalizes documented defaults', () => {
    const inputs = readActionInputs({});
    expect(inputs.command).toBe('audit');
    expect(inputs.paths).toEqual(['.']);
    expect(inputs.corpus).toBe('');
    expect(inputs.mode).toBe('audit');
    expect(inputs.failOn).toBe('high');
    expect(inputs.format).toBe('human');
    expect(inputs.sarifFile).toBe('bidilens.sarif');
  });

  it('parses newline paths and every non-default audit option', () => {
    const inputs = readActionInputs({
      'INPUT_COMMAND': 'audit',
      'INPUT_PATHS': 'src\ndocs/read me.md\n',
      'INPUT_MODE': 'strict',
      'INPUT_FAIL-ON': 'medium',
      'INPUT_FORMAT': 'json',
      'INPUT_SARIF-FILE': 'reports/bidi.sarif'
    });
    expect(inputs.paths).toEqual(['src', 'docs/read me.md']);
    expect(inputs.mode).toBe('strict');
    expect(inputs.failOn).toBe('medium');
    expect(inputs.format).toBe('json');
    expect(inputs.sarifFile).toBe('reports/bidi.sarif');
    expect(buildCliArguments(inputs)).toEqual([
      'node', 'bidilens', 'audit', 'src', 'docs/read me.md',
      '--mode', 'strict', '--fail-on', 'medium', '--json'
    ]);
  });

  it('uses the action-owned canonical corpus by default', () => {
    const inputs = readActionInputs({ INPUT_COMMAND: 'test', INPUT_FORMAT: 'json' });
    const actionPath = resolve(tmpdir(), 'bidilens-action', 'action');
    const args = buildCliArguments(inputs, {
      GITHUB_ACTION_PATH: actionPath
    });
    expect(args.slice(0, 4)).toEqual(['node', 'bidilens', 'test', '--corpus']);
    expect(args[4]).toBe(resolve(actionPath, '..', 'corpus', 'cases.json'));
    expect(args.at(-1)).toBe('--json');
  });

  it('honors a caller-provided corpus path', () => {
    const inputs = readActionInputs({
      INPUT_COMMAND: 'test',
      INPUT_CORPUS: 'fixtures/custom.json'
    });
    expect(buildCliArguments(inputs)).toContain('fixtures/custom.json');
  });

  it('finds its packaged corpus without the composite-only GITHUB_ACTION_PATH', async () => {
    const directory = await temporaryDirectory();
    const result = await runAction({ cwd: directory,
      env: { INPUT_COMMAND: 'test', INPUT_FORMAT: 'json', GITHUB_WORKSPACE: directory },
      log: () => undefined, error: () => undefined });
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout).total).toBeGreaterThan(100);
  });

  it('does not overwrite a previous SARIF report after a CLI input failure', async () => {
    const directory = await temporaryDirectory();
    const report = resolve(directory, 'bidilens.sarif');
    await writeFile(report, 'previous report');
    const result = await runAction({ cwd: directory,
      env: { INPUT_PATHS: 'missing.ts', INPUT_FORMAT: 'sarif' },
      log: () => undefined, error: () => undefined });
    expect(result.exitCode).toBe(1);
    expect(result.report).toBe('');
    expect(await readFile(report, 'utf8')).toBe('previous report');
  });

  it.for(['file', 'parent'] as const)('rejects a linked SARIF %s without touching outside data', async (kind, context) => {
    const directory = await temporaryDirectory();
    const outside = await temporaryDirectory();
    const sentinel = resolve(outside, 'result.sarif');
    await writeFile(sentinel, 'outside sentinel');
    await writeFile(resolve(directory, 'safe.txt'), 'safe');
    const target = kind === 'parent' ? 'linked/result.sarif' : 'result.sarif';
    try {
      await symlink(kind === 'parent' ? outside : sentinel,
        resolve(directory, kind === 'parent' ? 'linked' : target),
        kind === 'parent' ? 'junction' : 'file');
    } catch (error) {
      if (process.platform === 'win32' && (error as NodeJS.ErrnoException).code === 'EPERM') {
        context.skip(); // Windows file symlinks require Developer Mode or privilege; Linux CI covers this case.
        return;
      }
      throw error;
    }
    await expect(runAction({ cwd: directory,
      env: { INPUT_PATHS: 'safe.txt', INPUT_FORMAT: 'sarif', 'INPUT_SARIF-FILE': target },
      log: () => undefined, error: () => undefined })).rejects.toThrow(/link|workspace/iu);
    expect(await readFile(sentinel, 'utf8')).toBe('outside sentinel');
  });

  it('replaces a hard-linked report atomically without overwriting its other link', async () => {
    const directory = await temporaryDirectory();
    const outside = await temporaryDirectory();
    const sentinel = resolve(outside, 'result.sarif');
    await writeFile(sentinel, 'outside sentinel');
    await link(sentinel, resolve(directory, '..report.sarif'));
    await writeFile(resolve(directory, 'safe.txt'), 'safe');
    const result = await runAction({ cwd: directory,
      env: { INPUT_PATHS: 'safe.txt', INPUT_FORMAT: 'sarif', 'INPUT_SARIF-FILE': '..report.sarif' },
      log: () => undefined, error: () => undefined });
    expect(result.report).toBe('..report.sarif');
    expect(JSON.parse(await readFile(resolve(directory, result.report), 'utf8')).version).toBe('2.1.0');
    expect(await readFile(sentinel, 'utf8')).toBe('outside sentinel');
  });

  it.skipIf(process.platform === 'win32')('keeps literal POSIX backslashes in the checked parent path', async () => {
    const directory = await temporaryDirectory();
    const outside = await temporaryDirectory();
    const sentinel = resolve(outside, 'result.sarif');
    await writeFile(sentinel, 'outside sentinel');
    await writeFile(resolve(directory, 'safe.txt'), 'safe');
    await symlink(outside, resolve(directory, 'linked\\dir'), 'dir');
    await expect(runAction({ cwd: directory,
      env: { INPUT_PATHS: 'safe.txt', INPUT_FORMAT: 'sarif', 'INPUT_SARIF-FILE': 'linked\\dir/result.sarif' },
      log: () => undefined, error: () => undefined })).rejects.toThrow(/link/iu);
    expect(await readFile(sentinel, 'utf8')).toBe('outside sentinel');
  });

  it.skipIf(process.platform !== 'win32')('accepts a case-insensitive alias of a real report directory', async () => {
    const directory = await temporaryDirectory();
    await mkdir(resolve(directory, 'Reports'));
    await writeFile(resolve(directory, 'safe.txt'), 'safe');
    const result = await runAction({ cwd: directory,
      env: { INPUT_PATHS: 'safe.txt', INPUT_FORMAT: 'sarif', 'INPUT_SARIF-FILE': 'reports/result.sarif' },
      log: () => undefined, error: () => undefined });
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(await readFile(resolve(directory, 'Reports/result.sarif'), 'utf8')).version).toBe('2.1.0');
  });

  it('suspends runner commands around both untrusted output streams', async () => {
    const directory = await temporaryDirectory();
    const logs: string[] = [];
    const errors: string[] = [];
    await runAction({ cwd: directory,
      env: { GITHUB_ACTIONS: 'true', INPUT_PATHS: '::warning::untrusted.ts' },
      log: (value) => logs.push(value), error: (value) => errors.push(value) });
    expect(logs[0]).toMatch(/^::stop-commands::bidilens_/u);
    const token = logs[0]!.slice('::stop-commands::'.length);
    expect(logs.at(-1)).toBe(`::${token}::`);
    expect(logs.join('\n')).toContain('::warning::untrusted.ts');
    expect(errors).toEqual([]);
  });

  it.each([
    ['command', { INPUT_COMMAND: 'render' }],
    ['mode', { INPUT_MODE: 'block' }],
    ['fail-on', { 'INPUT_FAIL-ON': 'critical' }],
    ['format', { INPUT_FORMAT: 'xml' }]
  ])('rejects an invalid %s input', (name, env) => {
    expect(() => readActionInputs(env)).toThrow(`${name} must be one of`);
  });

  it('rejects SARIF for the corpus command', () => {
    const inputs = readActionInputs({ INPUT_COMMAND: 'test', INPUT_FORMAT: 'sarif' });
    expect(() => buildCliArguments(inputs)).toThrow('audit command');
  });

  it('audits a safe file and writes stable GitHub outputs', async () => {
    const directory = await temporaryDirectory();
    const output = resolve(directory, 'github-output');
    await writeFile(resolve(directory, 'safe.ts'), 'const message = "سلام React";\n', 'utf8');
    const logs: string[] = [];
    const errors: string[] = [];
    const result = await runAction({
      cwd: directory,
      env: { INPUT_PATHS: 'safe.ts', GITHUB_OUTPUT: output },
      log: (value) => logs.push(value),
      error: (value) => errors.push(value)
    });
    expect(result.exitCode).toBe(0);
    expect(result.report).toBe('');
    expect(result.stdout).toContain('No bidi security findings in 1 files.');
    expect(result.stderr).toBe('');
    expect(logs).toHaveLength(1);
    expect(errors).toEqual([]);
    const outputs = await readFile(output, 'utf8');
    expect(outputs).toContain('exit-code<<');
    expect(outputs).toContain('\n0\n');
    expect(outputs).toContain('report<<');
  });

  it('propagates strict security failure without mutating the file', async () => {
    const directory = await temporaryDirectory();
    const source = `const safe = "abc";${String.fromCodePoint(0x202e)}hidden${String.fromCodePoint(0x202c)}\n`;
    const path = resolve(directory, 'danger.ts');
    await writeFile(path, source, 'utf8');
    const errors: string[] = [];
    const result = await runAction({
      cwd: directory,
      env: {
        INPUT_PATHS: 'danger.ts',
        INPUT_MODE: 'strict',
        'INPUT_FAIL-ON': 'high',
        INPUT_FORMAT: 'json'
      },
      log: () => undefined,
      error: (value) => errors.push(value)
    });
    expect(result.exitCode).toBe(2);
    expect(JSON.parse(result.stdout).reports).toHaveLength(1);
    expect(errors.at(-1)).toContain('exit code 2');
    expect(await readFile(path, 'utf8')).toBe(source);
  });

  it('writes valid SARIF inside the workspace and returns its path', async () => {
    const directory = await temporaryDirectory();
    await writeFile(resolve(directory, 'danger.ts'), `x${String.fromCodePoint(0x202e)}y`, 'utf8');
    const result = await runAction({
      cwd: directory,
      env: {
        INPUT_PATHS: 'danger.ts',
        INPUT_FORMAT: 'sarif',
        'INPUT_SARIF-FILE': 'reports/bidi.sarif'
      },
      log: () => undefined,
      error: () => undefined
    });
    expect(result.exitCode).toBe(2);
    expect(result.report).toBe('reports/bidi.sarif');
    const sarif = JSON.parse(await readFile(resolve(directory, result.report), 'utf8'));
    expect(sarif.version).toBe('2.1.0');
    expect(sarif.runs[0].tool.driver.name).toBe('BidiLens');
    expect(sarif.runs[0].results.length).toBeGreaterThan(0);
  });

  it('prevents the SARIF output from escaping the workspace', async () => {
    const directory = await temporaryDirectory();
    await writeFile(resolve(directory, 'safe.txt'), 'safe', 'utf8');
    await expect(runAction({
      cwd: directory,
      env: {
        INPUT_PATHS: 'safe.txt',
        INPUT_FORMAT: 'sarif',
        'INPUT_SARIF-FILE': '../outside.sarif'
      },
      log: () => undefined,
      error: () => undefined
    })).rejects.toThrow('inside GITHUB_WORKSPACE');
  });

  it('runs a caller corpus and preserves the CLI conformance exit code', async () => {
    const directory = await temporaryDirectory();
    const corpus = resolve(directory, 'cases.json');
    await writeFile(corpus, JSON.stringify([
      { id: 'pass', text: 'سلام دنیا', expected: 'rtl' },
      { id: 'fail', text: 'Hello world', expected: 'rtl' }
    ]), 'utf8');
    const result = await runAction({
      cwd: directory,
      env: { INPUT_COMMAND: 'test', INPUT_CORPUS: corpus, INPUT_FORMAT: 'json' },
      log: () => undefined,
      error: () => undefined
    });
    const report = JSON.parse(result.stdout);
    expect(result.exitCode).toBe(1);
    expect(report.total).toBe(2);
    expect(report.failures).toHaveLength(1);
    expect(report.failures[0].id).toBe('fail');
  });

  it('escapes workflow-command injection characters', () => {
    expect(workflowError('bad%\r\n::warning::x')).toBe(
      '::error title=BidiLens::bad%25%0D%0A::warning::x'
    );
  });
});
