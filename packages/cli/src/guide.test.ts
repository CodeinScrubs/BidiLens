import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCli } from './index.js';

const targets = ['react', 'dom', 'html', 'markdown-it', 'vue', 'svelte', 'web-component', 'remark', 'android', 'apple', 'windows', 'rust'];

async function invoke(args: string[], cwd = '/bidilens-does-not-need-a-project') {
  let stdout = '';
  let stderr = '';
  const code = await runCli(['node', 'bidilens', 'guide', ...args], {
    cwd,
    stdout: (value) => { stdout += value; },
    stderr: (value) => { stderr += value; }
  });
  return { code, stdout, stderr };
}

describe('offline integration guide', () => {
  it('keeps the getting-started snippets identical to the executable recipes', async () => {
    const docs = await readFile(new URL('../../../docs/GETTING_STARTED.md', import.meta.url), 'utf8');
    for (const target of ['react', 'dom', 'html', 'markdown-it']) {
      const { stdout } = await invoke([target, '--json']);
      expect(docs.replaceAll('\r\n', '\n')).toContain(JSON.parse(stdout).guide.example.code.trim());
    }
  });

  it('lists one adapter choice at a time and does not need a project directory', async () => {
    const result = await invoke([]);
    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('you do not need every package');
    for (const target of targets) expect(result.stdout).toContain(target);
    expect(result.stdout).toContain('no project scanning, file changes, installs, telemetry, or network requests');
    expect(result.stdout).toContain('npx itself may download');
  });

  it('returns a versioned JSON index without prose mixed into stdout', async () => {
    const result = await invoke(['--json']);
    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toMatchObject({
      schemaVersion: 1,
      readOnly: true,
      targets: targets.map((target) => ({ target }))
    });
  });

  it.each(targets)('prints useful text and equivalent JSON guidance for %s', async (target) => {
    const text = await invoke([target]);
    const json = await invoke([target, '--json']);
    expect(text.code).toBe(0);
    expect(json.code).toBe(0);
    expect(text.stderr + json.stderr).toBe('');
    const report = JSON.parse(json.stdout);
    expect(report).toMatchObject({ schemaVersion: 1, readOnly: true, guide: { target } });
    expect(report.guide.steps.length).toBeGreaterThan(0);
    expect(text.stdout).toContain(report.guide.title);
    expect(text.stdout).toContain(report.guide.docs);
    expect(text.stdout).toContain(report.guide.rollback);
    expect(text.stdout).toContain('Before rollout:');
    for (const safeguard of report.safeguards) expect(text.stdout).toContain(safeguard);
    for (const check of report.checks) expect(text.stdout).toContain(check);
    if (report.guide.example) expect(text.stdout).toContain(report.guide.example.code.trimEnd());
  });

  it.each(['react', 'dom', 'html', 'markdown-it'])('ships a copyable typed recipe for %s', async (target) => {
    const { stdout } = await invoke([target, '--json']);
    const { guide } = JSON.parse(stdout);
    expect(guide.example.filename).toMatch(/\.tsx?$/u);
    expect(guide.example.code).toContain('export function ');
    expect(guide.install).toBe(`npm install @bidilens/${target === 'markdown-it' ? 'markdown' : target}`);
    expect(guide.install).not.toMatch(/react-dom|@latest|--force|--legacy-peer-deps/u);
  });

  it.each(['apple', 'windows', 'rust'])('does not imply registry publication for %s', async (target) => {
    const { stdout } = await invoke([target, '--json']);
    const { guide } = JSON.parse(stdout);
    expect(guide.install).toBeNull();
    expect(guide.compatibility).toContain('Source integration, not ');
  });

  it.each(['unknown', '../react', 'constructor', '__proto__', '\u001b[2J'])('rejects unsupported target %j without echoing terminal controls', async (target) => {
    const result = await invoke([target, '--json']);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Unknown guide target. Choose one of:');
    expect(result.stderr).not.toContain('\u001b');
  });

  it('preserves an existing project including malformed manifests', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'bidilens-guide-'));
    try {
      const original = '{ intentionally invalid package.json: do not read or repair }';
      await writeFile(join(cwd, 'package.json'), original);
      const before = await readdir(cwd);
      const result = await invoke(['react'], cwd);
      expect(result.code).toBe(0);
      expect(await readdir(cwd)).toEqual(before);
      expect(await readFile(join(cwd, 'package.json'), 'utf8')).toBe(original);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('advertises the command in CLI help', async () => {
    let output = '';
    const code = await runCli(['node', 'bidilens', '--help'], { stdout: (value) => { output += value; } });
    expect(code).toBe(0);
    expect(output).toContain('guide [options] [target]');
    expect(output).toContain('without modifying your project');
  });
});
