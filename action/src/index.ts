import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
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
    const actionPath = env.GITHUB_ACTION_PATH
      ? resolve(env.GITHUB_ACTION_PATH)
      : resolve(env.GITHUB_WORKSPACE ?? process.cwd(), 'action');
    const corpus = inputs.corpus || resolve(actionPath, '..', 'corpus', 'cases.json');
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

function workspaceFile(cwd: string, requested: string): { absolute: string; relative: string } {
  const absolute = resolve(cwd, requested);
  const local = relative(cwd, absolute);
  if (!local || local.startsWith('..') || isAbsolute(local)) {
    throw new Error('sarif-file must resolve to a file inside GITHUB_WORKSPACE.');
  }
  return { absolute, relative: local.replaceAll('\\', '/') };
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

  if (inputs.format === 'sarif') {
    const target = workspaceFile(cwd, inputs.sarifFile);
    await mkdir(dirname(target.absolute), { recursive: true });
    await writeFile(target.absolute, stdoutText, 'utf8');
    report = target.relative;
    log(`BidiLens SARIF report written to ${report}.`);
  } else if (stdoutText) {
    log(stdoutText.trimEnd());
  }
  if (stderrText) error(stderrText.trimEnd());

  await setOutput(env.GITHUB_OUTPUT, 'exit-code', String(exitCode));
  await setOutput(env.GITHUB_OUTPUT, 'report', report);
  if (exitCode !== 0) error(`BidiLens ${inputs.command} failed with exit code ${exitCode}.`);
  return { exitCode, report, stdout: stdoutText, stderr: stderrText };
}

export function workflowError(message: string): string {
  const escaped = message
    .replaceAll('%', '%25')
    .replaceAll('\r', '%0D')
    .replaceAll('\n', '%0A');
  return `::error title=BidiLens::${escaped}`;
}
