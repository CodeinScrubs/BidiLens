import { access, readFile, readdir } from 'node:fs/promises';
import { dirname, extname, relative, resolve } from 'node:path';
import process from 'node:process';

const root = process.cwd();
const ignoredDirectories = new Set([
  '.git', 'node_modules', 'dist', 'coverage', 'test-results', 'playwright-report'
]);
const requiredDocuments = [
  'README.md',
  'README.fa.md',
  'CHANGELOG.md',
  'CODE_OF_CONDUCT.md',
  'CONTRIBUTING.md',
  'GOVERNANCE.md',
  'SECURITY.md',
  'docs/ACCESSIBILITY.md',
  'docs/ARCHITECTURE.md',
  'docs/FAQ.md',
  'docs/LIMITATIONS.md',
  'docs/MIGRATION.md',
  'docs/PERFORMANCE.md',
  'docs/PUBLISHING.md',
  'docs/ROADMAP.md',
  'docs/SECURITY.md',
  'docs/V1_BUILD_REPORT.md'
];
const releaseDocuments = [
  'README.md',
  'README.fa.md',
  'CHANGELOG.md',
  'CITATION.cff',
  'docs/V1_BUILD_REPORT.md'
];
const staleReleasePhrases = [
  'maintained release-candidate scope',
  'once the canonical repository exists',
  'no npm package or production deployment is claimed',
  '0.1.0 has not been published'
];

async function markdownFiles(directory: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) files.push(...await markdownFiles(resolve(directory, entry.name)));
    } else if (entry.isFile() && extname(entry.name).toLowerCase() === '.md') {
      files.push(resolve(directory, entry.name));
    }
  }
  return files;
}

for (const document of requiredDocuments) await access(resolve(root, document));

const files = (await markdownFiles(root)).sort((a, b) => a.localeCompare(b));
const failures: string[] = [];
let localLinkCount = 0;
const markdownLink = /(?<!!)\[[^\]]*\]\(([^)]+)\)/gu;
const rootManifest = JSON.parse(
  await readFile(resolve(root, 'package.json'), 'utf8')
) as { version?: unknown };
if (typeof rootManifest.version !== 'string') {
  failures.push('package.json must declare a string version.');
} else {
  for (const document of releaseDocuments) {
    const source = await readFile(resolve(root, document), 'utf8');
    if (!source.includes(rootManifest.version)) {
      failures.push(`${document} does not mention the current release ${rootManifest.version}.`);
    }
  }
  for (const location of ['apps/demo/package.json', ...await readdir(resolve(root, 'packages')).then(
    (entries) => entries.map((entry) => `packages/${entry}/package.json`)
  )]) {
    const manifest = JSON.parse(await readFile(resolve(root, location), 'utf8')) as {
      name?: unknown;
      version?: unknown;
    };
    if (manifest.version !== rootManifest.version) {
      failures.push(`${location} has version ${String(manifest.version)}; expected ${rootManifest.version}.`);
    }
  }
}

for (const file of files) {
  const source = await readFile(file, 'utf8');
  if (source.includes('\uFFFD')) failures.push(`${relative(root, file)} contains a Unicode replacement character.`);
  for (const phrase of staleReleasePhrases) {
    if (source.includes(phrase)) failures.push(`${relative(root, file)} contains stale release text: ${phrase}`);
  }
  for (const match of source.matchAll(markdownLink)) {
    let target = match[1]?.trim() ?? '';
    if (target.startsWith('<') && target.endsWith('>')) target = target.slice(1, -1);
    target = target.split(/\s+["']/u, 1)[0] ?? target;
    if (!target || target.startsWith('#') || /^(?:https?:|mailto:|data:)/iu.test(target)) continue;
    if (/^[a-z]:[\\/]/iu.test(target)) {
      failures.push(`${relative(root, file)} links to a local absolute path: ${target}`);
      continue;
    }
    const pathPart = target.split(/[?#]/u, 1)[0];
    if (!pathPart) continue;
    localLinkCount += 1;
    try {
      await access(resolve(dirname(file), decodeURIComponent(pathPart)));
    } catch {
      failures.push(`${relative(root, file)} has a broken local link: ${target}`);
    }
  }
}

if (failures.length) throw new Error(`Documentation validation failed:\n${failures.join('\n')}`);
console.log(`Documentation passed: ${files.length} Markdown files and ${localLinkCount} local links.`);
