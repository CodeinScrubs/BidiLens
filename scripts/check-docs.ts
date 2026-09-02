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
const currentCorpusDocuments = [
  'README.md',
  'IMPACT.md',
  'docs/REQUIREMENT_MATRIX.md',
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
const [
  androidBuild,
  androidWrapper,
  androidReadme,
  androidSampleBuild,
  androidConsumerBuild,
  androidPublishWorkflow
] = await Promise.all([
  readFile(resolve(root, 'android/build.gradle.kts'), 'utf8'),
  readFile(resolve(root, 'android/gradle/wrapper/gradle-wrapper.properties'), 'utf8'),
  readFile(resolve(root, 'android/README.md'), 'utf8'),
  readFile(resolve(root, 'android/sample/build.gradle.kts'), 'utf8'),
  readFile(resolve(root, 'android/consumer-smoke/build.gradle.kts'), 'utf8'),
  readFile(resolve(root, '.github/workflows/publish-android.yml'), 'utf8')
]);
const androidApplicationPlugin = androidBuild.match(
  /id\("com\.android\.application"\) version "([^"]+)"/u
)?.[1];
const androidLibraryPlugin = androidBuild.match(
  /id\("com\.android\.library"\) version "([^"]+)"/u
)?.[1];
const kotlinComposePlugin = androidBuild.match(
  /id\("org\.jetbrains\.kotlin\.plugin\.compose"\) version "([^"]+)"/u
)?.[1];
const gradleWrapper = androidWrapper.match(/gradle-([0-9]+(?:\.[0-9]+)+)-bin\.zip/u)?.[1];
const androidLibraryVersion = androidBuild.match(
  /allprojects\s*\{[\s\S]*?\bversion = "([^"]+)"/u
)?.[1];
const androidSampleVersion = androidSampleBuild.match(/versionName = "([^"]+)"/u)?.[1];
const androidConsumerVersions = [...androidConsumerBuild.matchAll(
  /implementation\("io\.github\.codeinscrubs\.bidilens:[^:"]+:([^"]+)"\)/gu
)].flatMap((match) => match[1] ? [match[1]] : []);
const androidPublishVersion = androidPublishWorkflow.match(
  /ANDROID_RELEASE_VERSION:\s*'([^']+)'/u
)?.[1];

if (!androidApplicationPlugin || !androidLibraryPlugin) {
  failures.push('android/build.gradle.kts must declare both Android Gradle Plugin versions.');
} else if (androidApplicationPlugin !== androidLibraryPlugin) {
  failures.push(
    `Android Gradle Plugin versions are misaligned: application ${androidApplicationPlugin}, library ${androidLibraryPlugin}.`
  );
} else if (!androidReadme.includes(`Android Gradle Plugin ${androidApplicationPlugin}`)) {
  failures.push(`android/README.md does not mention Android Gradle Plugin ${androidApplicationPlugin}.`);
}
if (!gradleWrapper) {
  failures.push('Unable to derive the Gradle wrapper version.');
} else if (!androidReadme.includes(`Gradle ${gradleWrapper}`)) {
  failures.push(`android/README.md does not mention Gradle ${gradleWrapper}.`);
}
if (!kotlinComposePlugin) {
  failures.push('Unable to derive the Kotlin Compose plugin version.');
} else if (!androidReadme.includes(`Kotlin ${kotlinComposePlugin}`)) {
  failures.push(`android/README.md does not mention Kotlin ${kotlinComposePlugin}.`);
}
if (!androidLibraryVersion) {
  failures.push('Unable to derive the Android source release version.');
} else {
  if (androidSampleVersion !== androidLibraryVersion) {
    failures.push(
      `Android sample version ${String(androidSampleVersion)} does not match source ${androidLibraryVersion}.`
    );
  }
  if (
    androidConsumerVersions.length !== 3
    || androidConsumerVersions.some((version) => version !== androidLibraryVersion)
  ) {
    failures.push(
      `Android consumer versions ${androidConsumerVersions.join(', ') || '(missing)'} do not match source ${androidLibraryVersion}.`
    );
  }
  if (androidPublishVersion !== androidLibraryVersion) {
    failures.push(
      `Android publish version ${String(androidPublishVersion)} does not match source ${androidLibraryVersion}.`
    );
  }
  if (!androidReadme.includes(`Source checkout version \`${androidLibraryVersion}\``)) {
    failures.push(`android/README.md does not identify source checkout version ${androidLibraryVersion}.`);
  }
}
const corpus = JSON.parse(
  await readFile(resolve(root, 'corpus/cases.json'), 'utf8')
) as unknown;
if (!Array.isArray(corpus)) {
  failures.push('corpus/cases.json must contain an array.');
} else {
  for (const document of currentCorpusDocuments) {
    const source = await readFile(resolve(root, document), 'utf8');
    if (!source.includes(String(corpus.length))) {
      failures.push(`${document} does not mention the current corpus size ${corpus.length}.`);
    }
  }
}
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
