import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFile, readdir } from 'node:fs/promises';
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

function runAttw(directory: string): Promise<void> {
  return new Promise((resolveCommand, reject) => {
    const child = spawn(process.execPath, [
      attwCli,
      '--pack',
      '--profile', 'esm-only',
      '--no-emoji',
      '--no-color',
      directory
    ], {
      cwd: root,
      stdio: 'inherit'
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolveCommand();
      else reject(new Error(`Are the Types Wrong failed for ${directory} with exit code ${String(code)}.`));
    });
  });
}

const packageDirectories = (await readdir(resolve(root, 'packages'), { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => resolve(root, 'packages', entry.name))
  .sort((a, b) => a.localeCompare(b));

if (packageDirectories.length === 0) throw new Error('No package directories were discovered.');

for (const directory of packageDirectories) {
  const manifest = JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8')) as PackageManifest;
  if (!manifest.name) throw new Error(`${directory} has no package name.`);
  if (manifest.private) throw new Error(`${manifest.name} is private but is located in the public packages directory.`);
  console.log(`Checking published types for ${manifest.name}...`);
  await runAttw(directory);
}

console.log(`Published type layouts passed for ${packageDirectories.length} packages.`);
