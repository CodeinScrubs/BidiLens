import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import process from 'node:process';

const root = process.cwd();
const actionDirectory = resolve(root, 'action');
const bundle = resolve(actionDirectory, 'dist', 'index.cjs');

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function execute(cwd: string, env: NodeJS.ProcessEnv): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolveExecution, reject) => {
    const child = spawn(process.execPath, [bundle], {
      cwd,
      env: { ...process.env, ...env },
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
assert(!/require\(["']@bidilens\//u.test(bundleText), 'Action bundle contains an unresolved @bidilens require.');
assert(!/from\s+["']@bidilens\//u.test(bundleText), 'Action bundle contains an unresolved @bidilens import.');
assert((await readFile(resolve(actionDirectory, 'THIRD_PARTY_NOTICES.md'), 'utf8')).includes('Commander'),
  'Action third-party notices must cover the bundled CLI dependency.');

const temporary = await mkdtemp(resolve(tmpdir(), 'bidilens-action-bundle-'));
try {
  const output = resolve(temporary, 'github-output');
  await writeFile(resolve(temporary, 'safe.ts'), 'const message = "سلام React";\n', 'utf8');
  const safe = await execute(temporary, {
    GITHUB_WORKSPACE: temporary,
    GITHUB_ACTION_PATH: actionDirectory,
    GITHUB_OUTPUT: output,
    INPUT_PATHS: 'safe.ts',
    INPUT_FORMAT: 'json'
  });
  assert(safe.code === 0, `Built Action safe-file probe failed: ${safe.stdout}${safe.stderr}`);
  assert(JSON.parse(safe.stdout).scanned === 1, 'Built Action safe-file JSON is invalid.');
  assert((await readFile(output, 'utf8')).includes('\n0\n'), 'Built Action did not write exit-code=0.');

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
} finally {
  await rm(temporary, { recursive: true, force: true });
}

console.log(`GitHub Action bundle passed: ${bundleBytes} bytes, metadata/notices valid, safe and strict-failure probes executed.`);
