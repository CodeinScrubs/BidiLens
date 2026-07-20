import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const packagesRoot = resolve(root, 'packages');
const MINIMUM_ASSERTIONS = 25;

interface PackageManifest {
  name?: string;
  files?: string[];
  scripts?: Record<string, string>;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function filesRecursively(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const results: string[] = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) results.push(...await filesRecursively(path));
    else if (entry.isFile()) results.push(path);
  }
  return results;
}

function isTestFile(path: string): boolean {
  return /\.test\.[cm]?[jt]sx?$/u.test(path);
}

const packageDirectories = (await readdir(packagesRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => resolve(packagesRoot, entry.name))
  .sort();

for (const directory of packageDirectories) {
  const manifest = JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8')) as PackageManifest;
  const name = manifest.name ?? directory;
  const sourceDirectory = resolve(directory, 'src');
  const sourceFiles = (await filesRecursively(sourceDirectory))
    .filter((path) => /\.[cm]?[jt]sx?$/u.test(path));
  const testFiles = sourceFiles.filter(isTestFile);
  const implementationFiles = sourceFiles.filter((path) => !isTestFile(path));
  assert(implementationFiles.length > 0, `${name}: no implementation source exists.`);
  const implementationBytes = (await Promise.all(implementationFiles.map(async (path) => (await stat(path)).size)))
    .reduce((total, bytes) => total + bytes, 0);
  assert(implementationBytes > 0, `${name}: implementation source is empty.`);
  assert(testFiles.length > 0, `${name}: no package-local test file exists.`);

  let assertions = 0;
  for (const testFile of testFiles) {
    const source = await readFile(testFile, 'utf8');
    assertions += source.match(/\bexpect\s*\(/gu)?.length ?? 0;
  }
  assert(assertions >= MINIMUM_ASSERTIONS,
    `${name}: ${assertions} package-local expect() calls; at least ${MINIMUM_ASSERTIONS} are required.`);

  const readme = await readFile(resolve(directory, 'README.md'), 'utf8');
  assert(readme.includes('npm install'), `${name}: README lacks an npm install command.`);
  const examples = await readdir(resolve(directory, 'examples'), { withFileTypes: true });
  assert(examples.some((entry) => entry.isFile()), `${name}: examples directory contains no runnable file.`);
  assert(Boolean(manifest.scripts?.example), `${name}: package.json lacks an example script.`);
  assert(manifest.files?.includes('examples'), `${name}: examples are not included in the package artifact.`);

  console.log(`${name}: ${implementationFiles.length} implementation file(s), ${testFiles.length} test file(s), ${assertions} expect() calls, README and example present.`);
}

console.log(`Anti-hollow gate passed for ${packageDirectories.length} packages (minimum ${MINIMUM_ASSERTIONS} package-local assertions each).`);
