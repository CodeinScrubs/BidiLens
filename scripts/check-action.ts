import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import process from 'node:process';
import { unresolvedBidiLensImports } from './lib/bundled-imports.js';

const root = process.cwd();
const actionDirectory = resolve(root, 'action');
const bundle = resolve(actionDirectory, 'dist', 'index.cjs');

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function execute(cwd: string, env: NodeJS.ProcessEnv): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolveExecution, reject) => {
    // Probe a consumer environment, not the check workflow's own step inputs
    // or output file. Runner mode is covered explicitly below; otherwise its
    // intentionally protected console output is not bare JSON.
    const probeEnv: NodeJS.ProcessEnv = { ...process.env, GITHUB_ACTIONS: 'false' };
    for (const key of Object.keys(probeEnv)) {
      if (key.startsWith('INPUT_') || key === 'GITHUB_OUTPUT') delete probeEnv[key];
    }
    const child = spawn(process.execPath, [bundle], {
      cwd,
      env: { ...probeEnv, ...env },
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => resolveExecution({ code: code ?? -1, stdout, stderr }));
  });
}

const metadata = await readFile(resolve(actionDirectory, 'action.yml'), 'utf8');
assert(/using:\s*node24/u.test(metadata), 'action.yml must use the supported Node 24 runtime.');
assert(/main:\s*dist\/index\.cjs/u.test(metadata), 'action.yml main entry does not match the built bundle.');
const bundleText = await readFile(bundle, 'utf8');
const bundleBytes = (await stat(bundle)).size;
assert(bundleBytes <= 256 * 1024, `Action bundle is ${bundleBytes} bytes; budget is 262144 bytes.`);
assert(unresolvedBidiLensImports(bundleText).length === 0, 'Action bundle contains an unresolved @bidilens module reference.');
assert((await readFile(resolve(actionDirectory, 'THIRD_PARTY_NOTICES.md'), 'utf8')).includes('Commander'),
  'Action third-party notices must cover the bundled CLI dependency.');

const temporary = await mkdtemp(resolve(tmpdir(), 'bidilens-action-bundle-'));
try {
  const output = resolve(temporary, 'github-output');
  await writeFile(resolve(temporary, 'safe.ts'), 'const message = "سلام React";\n', 'utf8');
  const safe = await execute(temporary, {
    GITHUB_WORKSPACE: temporary,
    // A JavaScript action has no GITHUB_ACTION_PATH. Its bundled corpus must
    // resolve from dist/index.cjs, not from the consumer's working directory.
    GITHUB_ACTION_PATH: '',
    GITHUB_OUTPUT: output,
    INPUT_PATHS: 'safe.ts',
    INPUT_FORMAT: 'json'
  });
  assert(safe.code === 0, `Built Action safe-file probe failed: ${safe.stdout}${safe.stderr}`);
  assert(JSON.parse(safe.stdout).scanned === 1, 'Built Action safe-file JSON is invalid.');
  assert((await readFile(output, 'utf8')).includes('\n0\n'), 'Built Action did not write exit-code=0.');

  const runner = await execute(temporary, {
    GITHUB_ACTIONS: 'true',
    GITHUB_WORKSPACE: temporary,
    GITHUB_ACTION_PATH: '',
    INPUT_PATHS: 'safe.ts',
    INPUT_FORMAT: 'json'
  });
  assert(runner.code === 0, `Built Action runner probe failed: ${runner.stdout}${runner.stderr}`);
  const runnerLines = runner.stdout.trimEnd().split(/\r?\n/u);
  const stopPrefix = '::stop-commands::';
  assert(runnerLines[0]?.startsWith(stopPrefix), 'Built Action did not suspend runner commands.');
  const token = runnerLines[0]!.slice(stopPrefix.length);
  assert(/^bidilens_[0-9a-f-]{36}$/u.test(token), 'Built Action runner suspension token is invalid.');
  assert(runnerLines.at(-1) === `::${token}::`, 'Built Action did not resume runner commands with the same token.');
  assert(JSON.parse(runnerLines.slice(1, -1).join('\n')).scanned === 1,
    'Built Action changed the JSON payload while shielding runner logs.');
  assert(runner.stderr === '', 'Built Action runner probe unexpectedly wrote outside its protected log block.');

  const dangerousSource = `const safe = "abc";${String.fromCodePoint(0x202e)}hidden${String.fromCodePoint(0x202c)}\n`;
  await writeFile(resolve(temporary, 'danger.ts'), dangerousSource, 'utf8');
  const dangerous = await execute(temporary, {
    GITHUB_WORKSPACE: temporary,
    GITHUB_ACTION_PATH: actionDirectory,
    INPUT_PATHS: 'danger.ts',
    INPUT_MODE: 'strict',
    'INPUT_FAIL-ON': 'high',
    INPUT_FORMAT: 'json'
  });
  assert(dangerous.code === 2, `Built Action dangerous-file probe expected exit 2: ${dangerous.stdout}${dangerous.stderr}`);
  assert(JSON.parse(dangerous.stdout).reports.length === 1, 'Built Action did not report the dangerous file.');
  assert(await readFile(resolve(temporary, 'danger.ts'), 'utf8') === dangerousSource,
    'Built Action mutated audited source.');
  const corpus = await execute(temporary, {
    GITHUB_WORKSPACE: temporary,
    GITHUB_ACTION_PATH: '',
    INPUT_COMMAND: 'test',
    INPUT_FORMAT: 'json'
  });
  assert(corpus.code === 0, `Built Action default corpus probe failed: ${corpus.stdout}${corpus.stderr}`);
  assert(JSON.parse(corpus.stdout).total > 0, 'Built Action could not find its bundled corpus.');
} finally {
  await rm(temporary, { recursive: true, force: true });
}

console.log(`GitHub Action bundle passed: ${bundleBytes} bytes, metadata/notices valid, safe, runner-shielding, and strict-failure probes executed.`);
