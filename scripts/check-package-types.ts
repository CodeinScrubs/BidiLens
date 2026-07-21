import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import process from 'node:process';

interface PackageManifest {
  name?: string;
  private?: boolean;
}

const root = process.cwd();
const require = createRequire(import.meta.url);
const attwPackage = require.resolve('@arethetypeswrong/cli/package.json');
const attwCli = resolve(dirname(attwPackage), 'dist/index.js');

function pnpmInvocation(args: string[]): { program: string; args: string[]; shell: boolean } {
  if (process.platform !== 'win32') return { program: 'pnpm', args, shell: false };

  const candidates = [
    process.env.npm_execpath,
    process.env.PNPM_HOME ? resolve(process.env.PNPM_HOME, 'pnpm.cjs') : undefined,
    process.env.APPDATA
      ? resolve(process.env.APPDATA, 'npm', 'node_modules', 'pnpm', 'bin', 'pnpm.cjs')
      : undefined
  ].filter((candidate): candidate is string => Boolean(candidate));
  const cli = candidates.find((candidate) => existsSync(candidate));
  if (cli) return { program: process.execPath, args: [cli, ...args], shell: false };

  return { program: 'pnpm', args, shell: true };
}

function run(
  program: string,
  args: string[],
  errorMessage: string,
  shell = false
): Promise<void> {
  return new Promise((resolveCommand, reject) => {
    const child = spawn(program, args, { cwd: root, shell, stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolveCommand();
      else reject(new Error(`${errorMessage} Exit code: ${String(code)}.`));
    });
  });
}

async function packPackage(packageName: string, destination: string): Promise<string> {
  const before = new Set(await readdir(destination));
  const invocation = pnpmInvocation([
    '--filter', packageName, 'pack', '--pack-destination', destination
  ]);
  await run(
    invocation.program,
    invocation.args,
    `pnpm pack failed for ${packageName}.`,
    invocation.shell
  );
  const created = (await readdir(destination))
    .find((file) => !before.has(file) && file.endsWith('.tgz'));
  if (!created) throw new Error(`pnpm pack did not create a tarball for ${packageName}.`);
  return resolve(destination, created);
}

function runAttw(tarball: string, packageName: string): Promise<void> {
  return run(process.execPath, [
    attwCli,
    '--profile', 'esm-only',
    '--no-emoji',
    '--no-color',
    tarball
  ], `Are the Types Wrong failed for ${packageName}.`);
}

const packageDirectories = (await readdir(resolve(root, 'packages'), { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => resolve(root, 'packages', entry.name))
  .sort((a, b) => a.localeCompare(b));

if (packageDirectories.length === 0) throw new Error('No package directories were discovered.');

const packDirectory = await mkdtemp(resolve(tmpdir(), 'bidilens-type-packs-'));
try {
  for (const directory of packageDirectories) {
    const manifest = JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8')) as PackageManifest;
    if (!manifest.name) throw new Error(`${directory} has no package name.`);
    if (manifest.private) throw new Error(`${manifest.name} is private but is located in the public packages directory.`);
    console.log(`Checking published types for ${manifest.name}...`);
    const tarball = await packPackage(manifest.name, packDirectory);
    await runAttw(tarball, manifest.name);
  }
} finally {
  await rm(packDirectory, { recursive: true, force: true });
}

console.log(`Published type layouts passed for ${packageDirectories.length} packages.`);
