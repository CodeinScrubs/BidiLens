import { appendFile, lstat, mkdir, open, realpath, rename, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { runCli } from '../../packages/cli/src/index.js';

export type ActionCommand = 'audit' | 'test';
export type ActionFormat = 'human' | 'json' | 'sarif';
export type ActionMode = 'off' | 'audit' | 'warn' | 'strict';
export type ActionRisk = 'low' | 'medium' | 'high';

export interface ActionInputs {
  command: ActionCommand;
  paths: string[];
  corpus: string;
  mode: ActionMode;
  failOn: ActionRisk;
  format: ActionFormat;
  sarifFile: string;
}

export interface ActionContext {
  env?: NodeJS.ProcessEnv;
  cwd?: string;
  log?: (value: string) => void;
  error?: (value: string) => void;
}

export interface ActionResult {
  exitCode: number;
  report: string;
  stdout: string;
  stderr: string;
}

function input(env: NodeJS.ProcessEnv, name: string): string {
  return env[`INPUT_${name.toUpperCase()}`]?.trim() ?? '';
}

function choice<Value extends string>(
  name: string,
  value: string,
  fallback: Value,
  allowed: readonly Value[]
): Value {
  const candidate = value || fallback;
  if (!allowed.includes(candidate as Value)) {
    throw new Error(`${name} must be one of ${allowed.join(', ')}; received ${JSON.stringify(candidate)}.`);
  }
  return candidate as Value;
}

export function readActionInputs(env: NodeJS.ProcessEnv = process.env): ActionInputs {
  return {
    command: choice('command', input(env, 'COMMAND'), 'audit', ['audit', 'test']),
    paths: (input(env, 'PATHS') || '.').split(/\r?\n/u).map((path) => path.trim()).filter(Boolean),
    corpus: input(env, 'CORPUS'),
    mode: choice('mode', input(env, 'MODE'), 'audit', ['off', 'audit', 'warn', 'strict']),
    failOn: choice('fail-on', input(env, 'FAIL-ON'), 'high', ['low', 'medium', 'high']),
    format: choice('format', input(env, 'FORMAT'), 'human', ['human', 'json', 'sarif']),
    sarifFile: input(env, 'SARIF-FILE') || 'bidilens.sarif'
  };
}

export function buildCliArguments(inputs: ActionInputs, env: NodeJS.ProcessEnv = process.env): string[] {
  if (inputs.command === 'test') {
    if (inputs.format === 'sarif') throw new Error('SARIF output is available only for the audit command.');
    // __dirname is available in the distributed CJS bundle; import.meta.url
    // supplies the same location for source ESM. Neither depends on caller cwd.
    const moduleDirectory = typeof __dirname === 'string' ? __dirname : dirname(fileURLToPath(import.meta.url));
    const corpus = inputs.corpus || (env.GITHUB_ACTION_PATH
      ? resolve(env.GITHUB_ACTION_PATH, '..', 'corpus', 'cases.json')
      : resolve(moduleDirectory, '..', '..', 'corpus', 'cases.json'));
    return ['node', 'bidilens', 'test', '--corpus', corpus, ...(inputs.format === 'json' ? ['--json'] : [])];
  }

  const format = inputs.format === 'json' ? ['--json'] : inputs.format === 'sarif' ? ['--sarif'] : [];
  return [
    'node', 'bidilens', 'audit', ...inputs.paths,
    '--mode', inputs.mode,
    '--fail-on', inputs.failOn,
    ...format
  ];
}

function workspaceFile(cwd: string, requested: string): { absolute: string; relative: string; parts: string[] } {
  const absolute = resolve(cwd, requested);
  const local = relative(cwd, absolute);
  if (!local || local.split(sep)[0] === '..' || isAbsolute(local)) {
    throw new Error('sarif-file must resolve to a file inside GITHUB_WORKSPACE.');
  }
  const parts = local.split(sep);
  return { absolute, relative: parts.join('/'), parts };
}

async function existingEntry(path: string): Promise<Awaited<ReturnType<typeof lstat>> | undefined> {
  try { return await lstat(path); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

/**
 * Refuse symlink/junction traversal and replace, rather than truncate, a report
 * inode (which may have hard links). Portable pathname APIs cannot protect
 * against a malicious process concurrently replacing an ancestor directory.
 */
async function writeWorkspaceReport(cwd: string, requested: string, contents: string): Promise<string> {
  const root = await realpath(cwd);
  const target = workspaceFile(root, requested);
  const parts = target.parts;
  let parent = root;
  for (const part of parts.slice(0, -1)) {
    parent = resolve(parent, part);
    let entry = await existingEntry(parent);
    if (!entry) {
      try { await mkdir(parent); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
      entry = await lstat(parent);
    }
    if (entry.isSymbolicLink() || !entry.isDirectory()) throw new Error('SARIF parent must be a real workspace directory, not a link.');
    const canonical = await realpath(parent);
    workspaceFile(root, resolve(canonical, parts.at(-1)!));
    parent = canonical;
  }
  const destination = await existingEntry(target.absolute);
  if (destination && (destination.isSymbolicLink() || !destination.isFile())) {
    throw new Error('SARIF destination must be a regular workspace file, not a link.');
  }
  const temporary = resolve(parent, `.bidilens-${randomUUID()}.tmp`);
  const handle = await open(temporary, 'wx', 0o600);
  try {
    await handle.writeFile(contents, 'utf8');
    await handle.close();
    if ((await lstat(parent)).isSymbolicLink() || await realpath(parent) !== parent) {
      throw new Error('SARIF workspace directory changed while writing the report.');
    }
    await rename(temporary, target.absolute);
  } finally {
    await handle.close();
    await rm(temporary, { force: true });
  }
  return target.relative;
}

async function setOutput(path: string | undefined, name: string, value: string): Promise<void> {
  if (!path) return;
  const delimiter = `bidilens_${randomUUID()}`;
  await appendFile(path, `${name}<<${delimiter}\n${value}\n${delimiter}\n`, 'utf8');
}

/** Executes the bundled CLI without a shell and propagates its real exit code. */
export async function runAction(context: ActionContext = {}): Promise<ActionResult> {
  const env = context.env ?? process.env;
  const cwd = resolve(context.cwd ?? env.GITHUB_WORKSPACE ?? process.cwd());
  const log = context.log ?? console.log;
  const error = context.error ?? console.error;
  const inputs = readActionInputs(env);
  const stdout: string[] = [];
  const stderr: string[] = [];
  const exitCode = await runCli(buildCliArguments(inputs, env), {
    cwd,
    stdout: (value) => stdout.push(value),
    stderr: (value) => stderr.push(value)
  });
  const stdoutText = stdout.join('');
  const stderrText = stderr.join('');
  let report = '';

  if (inputs.format === 'sarif' && (exitCode === 0 || exitCode === 2)) {
    const parsed = JSON.parse(stdoutText) as { version?: string; runs?: unknown[] };
    if (parsed.version !== '2.1.0' || !Array.isArray(parsed.runs)) throw new Error('CLI did not produce a valid SARIF report.');
    report = await writeWorkspaceReport(cwd, inputs.sarifFile, stdoutText);
  }

  // Runner command suspension is global. Send both streams through one writer
  // inside one protected block, so stdout cannot resume commands before stderr.
  const protectedLogs = env.GITHUB_ACTIONS === 'true';
  const token = `bidilens_${randomUUID()}`;
  if (protectedLogs) log(`::stop-commands::${token}`);
  try {
    if (report) log(`BidiLens SARIF report written to ${JSON.stringify(report)}.`);
    else if (inputs.format !== 'sarif' && stdoutText) log(stdoutText.trimEnd());
    if (stderrText) (protectedLogs ? log : error)(stderrText.trimEnd());
    if (exitCode !== 0) (protectedLogs ? log : error)(`BidiLens ${inputs.command} failed with exit code ${exitCode}.`);
  } finally {
    if (protectedLogs) log(`::${token}::`);
  }

  await setOutput(env.GITHUB_OUTPUT, 'exit-code', String(exitCode));
  await setOutput(env.GITHUB_OUTPUT, 'report', report);
  return { exitCode, report, stdout: stdoutText, stderr: stderrText };
}

export function workflowError(message: string): string {
  const escaped = message
    .replaceAll('%', '%25')
    .replaceAll('\r', '%0D')
    .replaceAll('\n', '%0A');
  return `::error title=BidiLens::${escaped}`;
}
