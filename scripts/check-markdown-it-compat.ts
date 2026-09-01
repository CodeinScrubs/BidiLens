import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, resolve } from 'node:path';
import process from 'node:process';
import { CHATGPT_MIXED_DIRECTION_MARKDOWN } from './fixtures/chatgpt-mixed-direction.js';

interface CorpusFixture {
  id: string;
  text: string;
  expectNoOp?: boolean;
}

interface MarkdownItTarget {
  version: string;
  types?: string;
  comparison: 'exact' | 'semantic';
}

interface PackageManifest {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

const root = process.cwd();
const supportedMarkdownIt: MarkdownItTarget[] = [
  { version: '13.0.2', types: '13.0.9', comparison: 'exact' },
  { version: '14.3.1', types: '14.2.0', comparison: 'exact' },
  // Markdown-It 15 bundles its declarations and removes the old internal
  // `markdown-it/lib/*` exports. The public structural boundary is designed
  // to keep this host upgrade source-compatible without leaking those types.
  { version: '15.0.1', comparison: 'semantic' }
];
const expectedPeerRange = '^13.0.2 || ^14.0.0 || ^15.0.0';
const reportOutput = process.env.BIDILENS_MARKDOWN_IT_REPORT_DIR;
const structuralFixtures: CorpusFixture[] = [
  {
    id: 'compat-pure-ltr-no-op',
    text: 'Plain English Markdown stays exactly as it is.',
    expectNoOp: true
  },
  {
    id: 'compat-heading-inline-code',
    text: '# راهنمای React\n\nدستور `pnpm test` را اجرا کنید.'
  },
  {
    id: 'compat-list-and-blockquote',
    text: '- React یک کتابخانه محبوب است.\n- Vue هم محبوب است.\n\n> API باید پایدار بماند.'
  },
  {
    id: 'compat-table',
    text: '| ابزار | توضیح |\n| --- | --- |\n| React | یک کتابخانه محبوب |'
  },
  {
    id: 'compat-link-and-punctuation',
    text: 'مستندات [React](https://react.dev/docs?q=rtl) را بخوانید؛ سپس اجرا کنید.'
  },
  {
    id: 'compat-fenced-code',
    text: 'نمونه:\n\n```ts\nconst direction = "rtl";\n```\n\nاین کد امن است.'
  },
  {
    id: 'compat-raw-html-disabled',
    text: '<span onclick="alert(1)">متن React</span>'
  },
  {
    id: 'compat-soft-break',
    text: 'React یک کتابخانه محبوب است\nو TypeScript هم پشتیبانی می‌شود.'
  },
  {
    id: 'compat-chatgpt-medical-mixed-blocks',
    text: CHATGPT_MIXED_DIRECTION_MARKDOWN
  }
];

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
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => { stdout += chunk; });
    child.stderr.on('data', (chunk: string) => { stderr += chunk; });
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

function firstDifference(left: unknown, right: unknown, path = '$'): string | null {
  if (Object.is(left, right)) return null;
  if (typeof left !== typeof right || left === null || right === null) return path;
  if (typeof left !== 'object') return path;
  if (Array.isArray(left) !== Array.isArray(right)) return path;
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const keys = new Set([...Object.keys(leftRecord), ...Object.keys(rightRecord)]);
  for (const key of keys) {
    const difference = firstDifference(
      leftRecord[key],
      rightRecord[key],
      Array.isArray(left) ? `${path}[${key}]` : `${path}.${key}`
    );
    if (difference) return difference;
  }
  return null;
}

/**
 * Keep v15's host-parser compatibility comparison semantic without dropping
 * the annotated AST entirely. Markdown-It 15's linkify v6 intentionally
 * changes URL punctuation ownership and href encoding; mask only the content
 * and href of linkify nodes while retaining token structure and all BidiLens
 * direction/annotation attributes. Linkify versions may also assign a
 * trailing punctuation mark to the link text or to the following text token;
 * normalize only that punctuation/whitespace at the immediate link boundary.
 */
function semanticAst(
  node: unknown,
  insideLinkify = false,
  normalizeLeadingBoundary = false,
  normalizeTrailingBoundary = false
): unknown {
  if (Array.isArray(node)) {
    let linkifyState = insideLinkify;
    return node.map((child, index) => {
      const previous = index > 0 ? node[index - 1] : undefined;
      const next = index + 1 < node.length ? node[index + 1] : undefined;
      const isLinkifyClose = (value: unknown): boolean => (
        Boolean(value)
        && typeof value === 'object'
        && !Array.isArray(value)
        && (value as Record<string, unknown>).type === 'link_close'
        && (value as Record<string, unknown>).markup === 'linkify'
      );
      const isLinkifyOpen = (value: unknown): boolean => (
        Boolean(value)
        && typeof value === 'object'
        && !Array.isArray(value)
        && (value as Record<string, unknown>).type === 'link_open'
        && (value as Record<string, unknown>).markup === 'linkify'
      );
      const result = semanticAst(
        child,
        linkifyState,
        isLinkifyClose(previous),
        isLinkifyOpen(next)
      );
      if (child && typeof child === 'object' && !Array.isArray(child)) {
        const token = child as Record<string, unknown>;
        if (token.type === 'link_open' && token.markup === 'linkify') {
          linkifyState = true;
        } else if (token.type === 'link_close' && token.markup === 'linkify') {
          linkifyState = false;
        }
      }
      return result;
    });
  }
  if (!node || typeof node !== 'object') return node;
  const source = node as Record<string, unknown>;
  const linkify = insideLinkify || source.markup === 'linkify';
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (key === 'attributes' && linkify && value && typeof value === 'object' && !Array.isArray(value)) {
      const attributes = { ...(value as Record<string, unknown>) };
      if (source.type === 'link_open') delete attributes.href;
      result[key] = attributes;
      continue;
    }
    if (key === 'content' && linkify && source.type === 'text') {
      result[key] = '<linkified-content>';
      continue;
    }
    if (
      key === 'content'
      && source.type === 'text'
      && (normalizeLeadingBoundary || normalizeTrailingBoundary)
      && typeof value === 'string'
    ) {
      let normalized = value;
      if (normalizeLeadingBoundary) normalized = normalized.replace(/^[\s\p{P}\p{S}]+/u, '<linkify-boundary>');
      if (normalizeTrailingBoundary) normalized = normalized.replace(/[\s\p{P}\p{S}]+$/u, '<linkify-boundary>');
      result[key] = normalized;
      continue;
    }
    result[key] = key === 'children' ? semanticAst(value, linkify) : value;
  }
  return result;
}

function semanticReport(report: unknown): unknown {
  if (!Array.isArray(report)) return report;
  return report.map((fixture) => {
    const entry = fixture as Record<string, unknown>;
    return {
      id: entry.id,
      blocks: entry.blocks,
      ast: semanticAst(entry.ast),
      security: entry.security
    };
  });
}

async function packPackage(packageName: string, destination: string): Promise<string> {
  const before = new Set(await readdir(destination));
  await command('pnpm', ['--filter', packageName, 'pack', '--pack-destination', destination]);
  const created = (await readdir(destination))
    .find((file) => !before.has(file) && file.endsWith('.tgz'));
  assert(created, `${packageName}: pnpm pack did not create a tarball.`);
  return resolve(destination, created);
}

async function runVersionProbe(
  target: typeof supportedMarkdownIt[number],
  coreTarball: string,
  markdownTarball: string,
  fixtures: CorpusFixture[],
  temporary: string
): Promise<unknown> {
  const { version } = target;
  const consumer = resolve(temporary, `markdown-it-${version}`);
  await mkdir(consumer, { recursive: true });
  await writeFile(resolve(consumer, 'package.json'), JSON.stringify({
    name: `bidilens-markdown-it-${version.replaceAll('.', '-')}-consumer`,
    private: true,
    type: 'module',
    dependencies: {
      '@bidilens/core': `file:${coreTarball.replaceAll('\\', '/')}`,
      '@bidilens/markdown': `file:${markdownTarball.replaceAll('\\', '/')}`,
      'markdown-it': version
    },
    devDependencies: {
      ...(target.types ? { '@types/markdown-it': target.types } : {}),
      typescript: '6.0.3'
    },
    pnpm: {
      overrides: {
        '@bidilens/core': `file:${coreTarball.replaceAll('\\', '/')}`,
        '@bidilens/markdown': `file:${markdownTarball.replaceAll('\\', '/')}`
      }
    }
  }, null, 2));
  await writeFile(resolve(consumer, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      strict: true,
      noEmit: true,
      skipLibCheck: false
    },
    include: ['index.ts']
  }, null, 2));
  await writeFile(resolve(consumer, 'index.ts'), `
import MarkdownIt from 'markdown-it';
import {
  analyzeBidiMarkdown,
  createBidiMarkdownStream,
  markdownItBidi,
  type BidiMarkdownDocument,
  type BidiMarkdownStreamSession
} from '@bidilens/markdown';

const source = 'React یک کتابخانه جاوااسکریپت بسیار محبوب است.';
const parser = new MarkdownIt({ html: false, linkify: true, typographer: true });
markdownItBidi(parser);
const document: BidiMarkdownDocument = analyzeBidiMarkdown(new MarkdownIt(), source);
const stream: BidiMarkdownStreamSession = createBidiMarkdownStream(new MarkdownIt());
stream.push(source);
void [parser.render(source), document.html, stream.finish().document.html];
`);
  await writeFile(resolve(consumer, 'fixtures.json'), JSON.stringify(fixtures));
  await writeFile(resolve(consumer, 'probe.mjs'), `
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import MarkdownIt from 'markdown-it';
import { analyzeBidiMarkdown, createBidiMarkdownStream, markdownItBidi } from '@bidilens/markdown';

const fixtures = JSON.parse(await readFile(new URL('./fixtures.json', import.meta.url), 'utf8'));
const results = [];
for (const fixture of fixtures) {
  const options = { html: false, linkify: true, typographer: true };
  const baseline = new MarkdownIt(options).render(fixture.text);
  const pluginParser = new MarkdownIt(options);
  markdownItBidi(pluginParser);
  const pluginHtml = pluginParser.render(fixture.text);
  const batch = analyzeBidiMarkdown(new MarkdownIt(options), fixture.text);
  assert.equal(batch.source, fixture.text, fixture.id + ': batch source changed');
  assert.equal(batch.html, pluginHtml, fixture.id + ': plugin and batch HTML differ');
  if (fixture.expectNoOp) {
    assert.equal(pluginHtml, baseline, fixture.id + ': pure-LTR output was modified');
  }

  const stream = createBidiMarkdownStream(new MarkdownIt(options));
  for (const character of fixture.text) stream.push(character);
  const final = stream.finish();
  assert.equal(final.source, fixture.text, fixture.id + ': stream source changed');
  assert.deepEqual(final.document, batch, fixture.id + ': stream and batch documents differ');

  results.push({
    id: fixture.id,
    baseline,
    pluginHtml,
    blocks: batch.blocks.map((block) => ({
      kind: block.kind,
      text: block.text,
      direction: block.direction,
      intervention: block.intervention,
      isolation: block.analysis.isolations.map((item) => ({
        start: item.start,
        end: item.end,
        text: item.text,
        direction: item.direction,
        kind: item.kind
      }))
    })),
    ast: batch.ast,
    security: batch.security
  });
}
process.stdout.write(JSON.stringify(results));
`);
  await command('pnpm', ['install', '--strict-peer-dependencies'], consumer);
  await command('pnpm', ['exec', 'tsc', '--noEmit'], consumer);
  const declarations = await readFile(resolve(
    consumer,
    'node_modules/@bidilens/markdown/dist/index.d.ts'
  ), 'utf8');
  assert(
    !/from ["']markdown-it(?:\/[^"']*)?["']/u.test(declarations),
    `Markdown-It ${version}: packed declarations leaked host parser types.`
  );
  return JSON.parse(await command(process.execPath, ['probe.mjs'], consumer)) as unknown;
}

const manifest = JSON.parse(
  await readFile(resolve(root, 'packages/markdown/package.json'), 'utf8')
) as PackageManifest;
assert(
  manifest.peerDependencies?.['markdown-it'] === expectedPeerRange,
  `@bidilens/markdown must declare markdown-it peer ${expectedPeerRange}.`
);
assert(
  manifest.dependencies?.['@types/markdown-it'] === undefined,
  '@bidilens/markdown must not expose one Markdown-It type line as a runtime dependency.'
);
assert(
  manifest.devDependencies?.['markdown-it']?.startsWith('^15.') === true,
  '@bidilens/markdown must build its source against the latest supported Markdown-It line.'
);
const fixtures = JSON.parse(
  await readFile(resolve(root, 'corpus/cases.json'), 'utf8')
) as CorpusFixture[];
assert(fixtures.length >= 900, 'The compatibility gate requires the complete canonical corpus.');
const probeFixtures = [...fixtures, ...structuralFixtures];

await command('pnpm', ['--filter', '@bidilens/core', 'run', 'build']);
await command('pnpm', ['--filter', '@bidilens/markdown', 'run', 'build']);
const temporary = await mkdtemp(resolve(tmpdir(), 'bidilens-markdown-it-compat-'));
try {
  const packs = resolve(temporary, 'packs');
  await mkdir(packs, { recursive: true });
  const coreTarball = await packPackage('@bidilens/core', packs);
  const markdownTarball = await packPackage('@bidilens/markdown', packs);
  const reports = new Map<string, unknown>();
  for (const target of supportedMarkdownIt) {
    const report = await runVersionProbe(
      target,
      coreTarball,
      markdownTarball,
      probeFixtures,
      temporary
    );
    reports.set(target.version, report);
    if (reportOutput) {
      await mkdir(resolve(reportOutput), { recursive: true });
      await writeFile(
        resolve(reportOutput, `markdown-it-${target.version}.json`),
        JSON.stringify(report, null, 2)
      );
    }
    console.log(`Markdown-It ${target.version}: strict TypeScript consumer, ${fixtures.length} canonical fixtures, and ${structuralFixtures.length} host-structure fixtures passed.`);
  }
  const referenceTarget = supportedMarkdownIt[0];
  assert(referenceTarget, 'The Markdown-It compatibility matrix must contain a reference target.');
  const referenceVersion = referenceTarget.version;
  const reference = reports.get(referenceVersion);
  for (const target of supportedMarkdownIt.slice(1)) {
    const candidate = reports.get(target.version);
    const left = target.comparison === 'semantic' ? semanticReport(reference) : reference;
    const right = target.comparison === 'semantic' ? semanticReport(candidate) : candidate;
    const difference = firstDifference(left, right);
    assert(
      difference === null,
      target.comparison === 'semantic'
        ? `Markdown-It ${referenceVersion} and ${target.version} produced different BidiLens semantic reports at ${difference ?? 'an unknown path'}.`
        : `Markdown-It ${referenceVersion} and ${target.version} produced different reports at ${difference ?? 'an unknown path'}.`
    );
  }
  console.log('Markdown-It 13.0.2 and 14.3.1 produced identical full reports; Markdown-It 15.0.1 produced identical BidiLens semantic reports (host parser rendering differences are expected after its linkify v6 change).');
  console.log(`Packed @bidilens/markdown ${basename(markdownTarball)} installed under strict peer resolution for all supported parser lines.`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
