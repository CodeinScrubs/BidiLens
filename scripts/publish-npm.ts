import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, relative, resolve } from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';

interface PackageManifest {
  name: string;
  version: string;
  private?: boolean;
  publishConfig?: { access?: string };
  repository?: { type?: string; url?: string; directory?: string };
}

interface CommandResult {
  code: number;
  stdout: string;
  stderr: string;
}

interface ReleaseArtifact {
  name: string;
  version: string;
  file: string;
  sha256: string;
  integrity: string;
  registryIntegrity: string | null;
  status: 'ready' | 'published' | 'already-published';
  url: string;
}

const root = process.cwd();
const outputDirectory = resolve(root, 'npm-release-artifacts');
const canonicalRepository = 'git+https://github.com/CodeinScrubs/BidiLens.git';
const packageOrder = [
  '@bidilens/core',
  '@bidilens/spec',
  '@bidilens/playwright',
  '@bidilens/dom',
  '@bidilens/html',
  '@bidilens/markdown',
  '@bidilens/react',
  '@bidilens/svelte',
  '@bidilens/terminal',
  '@bidilens/vue',
  '@bidilens/web-component',
  '@bidilens/cli'
] as const;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function commandInvocation(program: 'git' | 'npm' | 'pnpm', args: string[]) {
  if (process.platform !== 'win32') return { program, args, shell: false };
  if (program === 'git') return { program, args, shell: false };
  if (program === 'npm') {
    const candidates = [
      resolve(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
      process.env.ProgramFiles
        ? resolve(process.env.ProgramFiles, 'nodejs', 'node_modules', 'npm', 'bin', 'npm-cli.js')
        : undefined
    ].filter((candidate): candidate is string => Boolean(candidate));
    const cli = candidates.find((candidate) => existsSync(candidate));
    assert(cli, 'Unable to locate npm-cli.js on Windows.');
    return { program: process.execPath, args: [cli, ...args], shell: false };
  }
  if (program === 'pnpm') {
    const candidates = [
      process.env.npm_execpath,
      process.env.PNPM_HOME ? resolve(process.env.PNPM_HOME, 'pnpm.cjs') : undefined,
      process.env.APPDATA
        ? resolve(process.env.APPDATA, 'npm', 'node_modules', 'pnpm', 'bin', 'pnpm.cjs')
        : undefined
    ].filter((candidate): candidate is string => Boolean(candidate));
    const cli = candidates.find((candidate) => existsSync(candidate));
    assert(cli, 'Unable to locate pnpm.cjs on Windows.');
    return { program: process.execPath, args: [cli, ...args], shell: false };
  }

  throw new Error(`Unsupported Windows command: ${program}.`);
}

function run(program: 'git' | 'npm' | 'pnpm', args: string[], inherit = false): Promise<CommandResult> {
  return new Promise((resolveCommand, reject) => {
    const invocation = commandInvocation(program, args);
    const child = spawn(invocation.program, invocation.args, {
      cwd: root,
      shell: invocation.shell,
      stdio: inherit ? ['ignore', 'inherit', 'inherit'] : ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      resolveCommand({ code: code ?? 1, stdout, stderr });
    });
  });
}

async function runChecked(program: 'git' | 'npm' | 'pnpm', args: string[], inherit = false): Promise<CommandResult> {
  const result = await run(program, args, inherit);
  assert(
    result.code === 0,
    `${program} ${args.join(' ')} failed with exit code ${result.code}.\n${result.stdout}${result.stderr}`
  );
  return result;
}

function requestedVersion(): string {
  const position = process.argv.indexOf('--version');
  const version = position >= 0 ? process.argv[position + 1] : '0.1.0';
  assert(version !== undefined && /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/u.test(version), 'A valid --version is required.');
  return version;
}

async function loadPackages(version: string): Promise<Map<string, { directory: string; manifest: PackageManifest }>> {
  const packagesDirectory = resolve(root, 'packages');
  const entries = (await readdir(packagesDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory());
  const packages = new Map<string, { directory: string; manifest: PackageManifest }>();

  for (const entry of entries) {
    const directory = resolve(packagesDirectory, entry.name);
    const manifest = JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8')) as PackageManifest;
    assert(!packages.has(manifest.name), `Duplicate workspace package name: ${manifest.name}.`);
    packages.set(manifest.name, { directory, manifest });
  }

  assert(packages.size === packageOrder.length, `Expected exactly ${packageOrder.length} public packages; found ${packages.size}.`);
  for (const name of packageOrder) {
    const item = packages.get(name);
    assert(item, `Required release package is missing: ${name}.`);
    assert(item.manifest.private !== true, `${name} is marked private.`);
    assert(item.manifest.version === version, `${name} has version ${item.manifest.version}; expected ${version}.`);
    assert(item.manifest.publishConfig?.access === 'public', `${name} must set publishConfig.access to public.`);
    assert(item.manifest.repository?.url === canonicalRepository, `${name} has non-canonical repository metadata.`);
  }

  for (const name of packages.keys()) {
    assert(packageOrder.includes(name as typeof packageOrder[number]), `Unexpected public package: ${name}.`);
  }
  return packages;
}

async function assertReleaseContext(version: string): Promise<void> {
  const expected = `PUBLISH @bidilens/* ${version}`;
  assert(process.env.GITHUB_ACTIONS === 'true', 'Registry publication is only allowed from GitHub Actions.');
  assert(process.env.GITHUB_REPOSITORY === 'CodeinScrubs/BidiLens', 'Publication must run in CodeinScrubs/BidiLens.');
  assert(process.env.GITHUB_REF === 'refs/heads/main', 'Publication must run from the main branch.');
  assert(process.env.BIDILENS_RELEASE_CONFIRMATION === expected, `Confirmation must exactly equal "${expected}".`);
  assert(
    process.env.BIDILENS_RELEASE_AUTHENTICATION === 'bootstrap-token'
      || process.env.BIDILENS_RELEASE_AUTHENTICATION === 'trusted-publishing',
    'Release authentication mode is invalid.'
  );
  if (process.env.BIDILENS_RELEASE_AUTHENTICATION === 'bootstrap-token') {
    assert(Boolean(process.env.NODE_AUTH_TOKEN), 'The bootstrap NPM_TOKEN GitHub environment secret is missing.');
  }

  const status = await runChecked('git', ['status', '--porcelain']);
  assert(status.stdout.trim() === '', 'The release checkout is dirty.');
  const head = (await runChecked('git', ['rev-parse', 'HEAD'])).stdout.trim();
  assert(head === process.env.GITHUB_SHA, `Checked-out commit ${head} does not match GITHUB_SHA ${process.env.GITHUB_SHA}.`);
}

async function registryIntegrity(name: string, version: string): Promise<string | null> {
  const result = await run('npm', ['view', `${name}@${version}`, 'dist.integrity', '--json']);
  if (result.code !== 0) {
    const output = `${result.stdout}\n${result.stderr}`;
    if (/\bE404\b|404 Not Found/u.test(output)) return null;
    throw new Error(`Registry lookup failed for ${name}@${version}.\n${output}`);
  }

  const parsed: unknown = JSON.parse(result.stdout);
  assert(typeof parsed === 'string' && parsed.startsWith('sha512-'), `Registry returned invalid integrity for ${name}@${version}.`);
  return parsed;
}

async function waitForRegistry(name: string, version: string, expectedIntegrity: string): Promise<string> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const integrity = await registryIntegrity(name, version);
    if (integrity === expectedIntegrity) return integrity;
    if (integrity !== null) {
      throw new Error(`${name}@${version} exists with unexpected integrity ${integrity}; expected ${expectedIntegrity}.`);
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 2_000));
  }
  throw new Error(`${name}@${version} was not visible with the expected integrity after publication.`);
}

async function packPackage(name: string, version: string): Promise<{ tarball: string; sha256: string; integrity: string }> {
  const expectedFilename = `${name.slice(1).replace('/', '-')}-${version}.tgz`;
  const tarball = resolve(outputDirectory, expectedFilename);
  await runChecked('pnpm', ['--filter', name, 'pack', '--pack-destination', outputDirectory], true);
  assert(existsSync(tarball), `${name}: pnpm pack did not create ${expectedFilename}.`);
  const contents = await readFile(tarball);
  const sha256 = createHash('sha256').update(contents).digest('hex');
  const integrity = `sha512-${createHash('sha512').update(contents).digest('base64')}`;
  assert(basename(tarball).includes(version), `${name}: tarball filename does not include version ${version}.`);
  return { tarball, sha256, integrity };
}

async function main(): Promise<void> {
  const version = requestedVersion();
  const publish = process.argv.includes('--publish');
  const packages = await loadPackages(version);
  if (publish) await assertReleaseContext(version);

  assert(relative(root, outputDirectory) === 'npm-release-artifacts', 'Unsafe release artifact directory.');
  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: false });

  const artifacts: ReleaseArtifact[] = [];
  for (const name of packageOrder) {
    const item = packages.get(name);
    assert(item, `Missing package ${name}.`);
    const packed = await packPackage(name, version);
    const existing = await registryIntegrity(name, version);

    let status: ReleaseArtifact['status'] = 'ready';
    let verifiedIntegrity = existing;
    if (existing !== null) {
      assert(
        existing === packed.integrity,
        `${name}@${version} is already published with integrity ${existing}, but the release tarball is ${packed.integrity}.`
      );
      status = 'already-published';
      console.log(`Verified existing ${name}@${version}; skipping publication.`);
    } else if (publish) {
      console.log(`Publishing ${name}@${version} with provenance...`);
      await runChecked(
        'npm',
        ['publish', packed.tarball, '--access', 'public', '--tag', 'latest', '--provenance'],
        true
      );
      verifiedIntegrity = await waitForRegistry(name, version, packed.integrity);
      status = 'published';
    } else {
      console.log(`Ready to publish ${name}@${version}: ${basename(packed.tarball)}.`);
    }

    artifacts.push({
      name,
      version,
      file: basename(packed.tarball),
      sha256: packed.sha256,
      integrity: packed.integrity,
      registryIntegrity: verifiedIntegrity,
      status,
      url: `https://www.npmjs.com/package/${name}/v/${version}`
    });
  }

  const manifest = {
    schemaVersion: 1,
    repository: 'https://github.com/CodeinScrubs/BidiLens',
    commit: process.env.GITHUB_SHA ?? (await runChecked('git', ['rev-parse', 'HEAD'])).stdout.trim(),
    version,
    publish,
    generatedAt: new Date().toISOString(),
    packages: artifacts
  };
  await writeFile(
    resolve(outputDirectory, 'npm-release-manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8'
  );
  console.log(`${publish ? 'Publication' : 'Dry run'} completed for ${artifacts.length} packages.`);
}

await main();
