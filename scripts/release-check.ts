import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import process from 'node:process';

interface PackageManifest {
  name: string;
  version: string;
  files?: string[];
  bin?: Record<string, string>;
  exports?: unknown;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  engines?: { node?: string };
}

const root = process.cwd();
const allowDirty = process.argv.includes('--allow-dirty');
const DIST_BUDGETS = new Map<string, number>([
  ['@bidilens/core', 64 * 1024],
  ['@bidilens/dom', 16 * 1024],
  ['@bidilens/html', 12 * 1024],
  ['@bidilens/markdown', 24 * 1024],
  ['@bidilens/react', 16 * 1024],
  ['@bidilens/svelte', 8 * 1024],
  ['@bidilens/terminal', 8 * 1024],
  ['@bidilens/vue', 12 * 1024],
  ['@bidilens/web-component', 8 * 1024],
  ['@bidilens/cli', 32 * 1024]
]);

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

  // Controlled fallback for uncommon Windows installations. Callers pass only
  // fixed arguments or paths created by this script, never arbitrary user input.
  return { program: 'pnpm', args, shell: true };
}

function command(program: string, args: string[], cwd = root): Promise<string> {
  return new Promise((resolveCommand, reject) => {
    const invocation = program === 'pnpm'
      ? pnpmInvocation(args)
      : { program, args, shell: false };
    const child = spawn(invocation.program, invocation.args, {
      cwd,
      shell: invocation.shell,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolveCommand(stdout);
      else reject(new Error(`${program} ${args.join(' ')} failed with ${code}.\n${stdout}${stderr}`));
    });
  });
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function packageManifests(): Promise<Array<{ directory: string; manifest: PackageManifest }>> {
  const names = (await readdir(resolve(root, 'packages'), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const packages = [] as Array<{ directory: string; manifest: PackageManifest }>;
  for (const name of names) {
    const directory = resolve(root, 'packages', name);
    const manifest = JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8')) as PackageManifest;
    packages.push({ directory, manifest });
  }
  return packages;
}

async function validatePackageSources(packages: Awaited<ReturnType<typeof packageManifests>>): Promise<void> {
  for (const { directory, manifest } of packages) {
    assert(manifest.version === '0.1.0', `${manifest.name}: version must be aligned at 0.1.0.`);
    assert(manifest.engines?.node === '>=22.12.0', `${manifest.name}: supported Node floor must be >=22.12.0.`);
    assert(manifest.exports !== undefined, `${manifest.name}: exports map is required.`);
    assert(manifest.files?.includes('dist'), `${manifest.name}: dist must be in files.`);
    assert(manifest.files?.includes('LICENSE'), `${manifest.name}: LICENSE must be packed.`);
    if (manifest.name === '@bidilens/core') {
      assert(manifest.files?.includes('THIRD_PARTY_NOTICES.md'), `${manifest.name}: Unicode notice must be packed.`);
    }
    if (manifest.name === '@bidilens/cli') {
      assert(manifest.bin?.bidilens === './dist/bin.js', `${manifest.name}: bidilens executable must target dist/bin.js.`);
    }
    assert(manifest.files?.includes('examples'), `${manifest.name}: runnable examples must be packed.`);
    assert(manifest.scripts?.prepack, `${manifest.name}: prepack must build from a clean checkout.`);
    assert(manifest.scripts?.example, `${manifest.name}: example command is required.`);
    const readme = await readFile(resolve(directory, 'README.md'), 'utf8');
    assert(readme.includes('npm install'), `${manifest.name}: README needs a consumer install command.`);
    const examples = await readdir(resolve(directory, 'examples'));
    assert(examples.length > 0, `${manifest.name}: examples directory is empty.`);
  }
}

async function inspectTarball(tarball: string, manifest: PackageManifest): Promise<void> {
  const entries = (await command('tar', ['-tf', tarball])).split(/\r?\n/u).filter(Boolean);
  for (const required of ['package/dist/index.js', 'package/dist/index.d.ts', 'package/LICENSE', 'package/README.md']) {
    assert(entries.includes(required), `${manifest.name}: tarball is missing ${required}.`);
  }
  if (manifest.name === '@bidilens/core') {
    assert(entries.includes('package/THIRD_PARTY_NOTICES.md'), `${manifest.name}: tarball is missing Unicode attribution.`);
  }
  if (manifest.name === '@bidilens/cli') {
    assert(entries.includes('package/dist/bin.js'), `${manifest.name}: tarball is missing the executable entry.`);
  }
  assert(entries.includes('package/examples/basic.mjs'), `${manifest.name}: tarball is missing examples/basic.mjs.`);
  const packedManifest = JSON.parse(await command('tar', ['-xOf', tarball, 'package/package.json'])) as PackageManifest;
  const workspaceDependency = Object.entries(packedManifest.dependencies ?? {}).find(([, version]) => version.startsWith('workspace:'));
  assert(!workspaceDependency, `${manifest.name}: packed dependency ${workspaceDependency?.[0]} still uses workspace protocol.`);
}

async function validateBuiltSizes(packages: Awaited<ReturnType<typeof packageManifests>>): Promise<void> {
  for (const { directory, manifest } of packages) {
    const distDirectory = resolve(directory, 'dist');
    const javascriptFiles = (await readdir(distDirectory)).filter((file) => file.endsWith('.js'));
    assert(javascriptFiles.length > 0, `${manifest.name}: build emitted no JavaScript files.`);
    const sizes = await Promise.all(javascriptFiles.map(async (file) => (await stat(resolve(distDirectory, file))).size));
    const bytes = sizes.reduce((total, size) => total + size, 0);
    const budget = DIST_BUDGETS.get(manifest.name);
    assert(budget !== undefined, `${manifest.name}: missing JavaScript size budget.`);
    assert(bytes <= budget, `${manifest.name}: emitted JavaScript is ${bytes} bytes; budget is ${budget} bytes.`);
    console.log(`Built JavaScript ${manifest.name}: ${bytes} bytes across ${javascriptFiles.length} file(s) (budget ${budget}).`);
  }
}

function fileDependency(tarball: string): string {
  return `file:${tarball.replaceAll('\\', '/')}`;
}

async function verifyConsumer(tarballs: Map<string, string>, consumer: string): Promise<void> {
  const dependencies = Object.fromEntries([...tarballs].map(([name, tarball]) => [name, fileDependency(tarball)]));
  const localPackageOverrides = Object.fromEntries(
    [...tarballs].map(([name, tarball]) => [name, fileDependency(tarball)])
  );
  Object.assign(dependencies, {
    '@vue/server-renderer': '3.5.40',
    jsdom: '29.1.1',
    'markdown-it': '14.3.0',
    react: '19.2.7',
    'react-dom': '19.2.7',
    vue: '3.5.40',
    svelte: '^5.0.0'
  });
  await writeFile(resolve(consumer, 'package.json'), JSON.stringify({
    name: 'bidilens-clean-consumer',
    private: true,
    type: 'module',
    dependencies,
    pnpm: {
      overrides: localPackageOverrides
    },
    devDependencies: {
      '@types/node': '^24.10.0',
      '@types/react': '^19.2.2',
      '@types/react-dom': '^19.2.2',
      typescript: '6.0.3'
    }
  }, null, 2));
  await writeFile(resolve(consumer, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      lib: ['ES2022', 'DOM'],
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      strict: true,
      noEmit: true,
      skipLibCheck: false,
      jsx: 'react-jsx',
      types: ['node']
    },
    include: ['index.ts']
  }, null, 2));
  await writeFile(resolve(consumer, 'index.ts'), `
import { analyzeBlock, createBidiStream } from '@bidilens/core';
import { applyBidi } from '@bidilens/dom';
import { renderBidiHtml } from '@bidilens/html';
import { markdownItBidi, rehypeBidi, remarkBidi } from '@bidilens/markdown';
import { BidiMessage as ReactBidiMessage, useBidiStream as useReactBidiStream } from '@bidilens/react';
import { createBidiMessage, createStreamingBidiMessage } from '@bidilens/svelte';
import { formatTerminalText } from '@bidilens/terminal';
import { BidiMessage as VueBidiMessage, useBidiDirection, useBidiStream as useVueBidiStream } from '@bidilens/vue';
import { BidiMessageElement, defineBidiMessageElement } from '@bidilens/web-component';
import { runCli } from '@bidilens/cli';

const source = 'React یک کتابخانه جاوااسکریپت بسیار محبوب است.';
analyzeBlock(source);
createBidiStream().push(source);
renderBidiHtml(source);
createBidiMessage(source);
createStreamingBidiMessage().push(source);
formatTerminalText(source);
useBidiDirection(source);
void [applyBidi, markdownItBidi, rehypeBidi, remarkBidi, ReactBidiMessage, useReactBidiStream,
  VueBidiMessage, useVueBidiStream, BidiMessageElement, defineBidiMessageElement, runCli];
`);
  await writeFile(resolve(consumer, 'index.mjs'), `
import { strict as assert } from 'node:assert';
import { analyzeBlock, createBidiStream } from '@bidilens/core';
import { renderBidiHtml } from '@bidilens/html';
import { formatTerminalText } from '@bidilens/terminal';
import { createBidiMessage } from '@bidilens/svelte';
import { get } from 'svelte/store';
await import('@bidilens/dom');
await import('@bidilens/markdown');
await import('@bidilens/react');
await import('@bidilens/vue');
await import('@bidilens/web-component');
await import('@bidilens/cli');
const source = 'React یک کتابخانه جاوااسکریپت بسیار محبوب است.';
assert.equal(analyzeBlock(source).direction, 'rtl');
assert.equal(renderBidiHtml(source).blocks[0].direction, 'rtl');
assert.equal(formatTerminalText(source).text, source);
assert.equal(get(createBidiMessage(source)).direction, 'rtl');
const stream = createBidiStream();
for (const character of source) stream.push(character);
assert.equal(stream.finish().direction, 'rtl');
console.log('Clean consumer runtime imports and assertions passed.');
`);

  await command('pnpm', ['install', '--strict-peer-dependencies'], consumer);
  await command('pnpm', ['exec', 'tsc', '--noEmit'], consumer);
  const runtime = await command('node', ['index.mjs'], consumer);
  assert(runtime.includes('passed'), 'Clean consumer runtime probe did not finish.');
  const cliRuntime = await command('pnpm', ['exec', 'bidilens', 'inspect', '--text', 'React یک کتابخانه محبوب است.', '--json'], consumer);
  const cliReport = JSON.parse(cliRuntime) as { analysis?: { direction?: string } };
  assert(cliReport.analysis?.direction === 'rtl', 'Packed bidilens executable did not run or infer the expected direction.');

  const exampleDirectory = resolve(consumer, 'packed-examples');
  await mkdir(exampleDirectory, { recursive: true });
  for (const [name, tarball] of tarballs) {
    const source = await command('tar', ['-xOf', tarball, 'package/examples/basic.mjs']);
    const filename = `${name.replace('@bidilens/', '')}.mjs`;
    const examplePath = resolve(exampleDirectory, filename);
    await writeFile(examplePath, source, 'utf8');
    await command('node', [examplePath], consumer);
    console.log(`Executed packed example ${name}: examples/basic.mjs`);
  }
}

async function main(): Promise<void> {
  if (!allowDirty) {
    const status = await command('git', ['status', '--porcelain']);
    assert(status.trim() === '', 'Release check requires a clean worktree. Commit reviewed changes or pass --allow-dirty for development only.');
  }
  const packages = await packageManifests();
  await validatePackageSources(packages);
  await command('pnpm', ['run', 'build']);
  await validateBuiltSizes(packages);

  const temporary = await mkdtemp(join(tmpdir(), 'bidilens-release-check-'));
  try {
    const packDirectory = resolve(temporary, 'packs');
    const consumer = resolve(temporary, 'consumer');
    await mkdir(packDirectory, { recursive: true });
    await mkdir(consumer, { recursive: true });
    const tarballs = new Map<string, string>();
    for (const { manifest } of packages) {
      const before = new Set(await readdir(packDirectory));
      await command('pnpm', ['--filter', manifest.name, 'pack', '--pack-destination', packDirectory]);
      const created = (await readdir(packDirectory)).find((file) => !before.has(file) && file.endsWith('.tgz'));
      assert(created, `${manifest.name}: pnpm pack did not create a tarball.`);
      const tarball = resolve(packDirectory, created);
      await inspectTarball(tarball, manifest);
      tarballs.set(manifest.name, tarball);
      console.log(`Verified ${manifest.name}: ${basename(tarball)}`);
    }
    await verifyConsumer(tarballs, consumer);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
  console.log(`Release artifacts verified for ${packages.length} packages with a clean TypeScript/runtime/CLI consumer and all packed examples executed.`);
  console.warn('External publication still requires a real repository URL, npm scope ownership, provenance configuration, credentials, and a human release decision.');
}

await main();
