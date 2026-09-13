/** Non-gating diagnostic for the 2026-09 external review; run at repo root.
 * Only detect/stream are substituted from the pinned baseline. The historical
 * sample generator and first-failure stopping rule are intentionally retained.
 */
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import * as current from '../packages/core/src/index.js';

const baselineCommit = '643bcba75935c9f8bbd5f412e47e0ced7832a195';
const seed = 19403;
const sources = new Map(['detect', 'stream'].map((name) => [name,
  execFileSync('git', ['show', `${baselineCommit}:packages/core/src/${name}.ts`], { encoding: 'utf8' })
]));
const bundle = await build({
  entryPoints: ['packages/core/src/index.ts'], bundle: true, write: false,
  format: 'esm', platform: 'node',
  plugins: [{
    name: 'pinned-review-baseline',
    setup(builder) {
      builder.onLoad({ filter: /[\\/](detect|stream)\.ts$/ }, (args) => ({
        contents: sources.get(args.path.match(/(detect|stream)\.ts$/)![1]!)!, loader: 'ts'
      }));
    }
  }]
});
const baseline = await import('data:text/javascript;base64,'
  + Buffer.from(bundle.outputFiles![0]!.text).toString('base64')) as typeof current;
const atoms = ['$', '$x$', '$x $', '$ x$', '$10', '$20', '$A', '${A}', '$$', '\\', '\\$', '\\(', '\\)', 'x', 'hello', 'سلام', ' ', ';', '1', '۱۰'];
let state = seed;
function random(): number {
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  return state;
}
const cases = new Set(['$$x$$1', '$$x$$۱۰', '\\\\(x\\)', '\\(x\\\\)', '$$x\\$$y$$', '$x$1$y$', '$x$$y$', '$A $x$', '$A$x$1']);
for (let sample = 0; sample < 1200; sample++) {
  let source = '';
  // Re-drawing this bound preserves the original reviewer sample set.
  for (let index = 0; index < 3 + random() % 6; index++) source += atoms[random() % atoms.length]!;
  cases.add(source);
}
type Finding = { source: string; prefix: string; expected: string; actual: string; baselineExpected: string; baselineActual: string };
const newFailures: Finding[] = [];
const preExistingFailures: Finding[] = [];
for (const source of cases) {
  const options = { strategy: 'majority', fallback: 'neutral' } as const;
  const stream = current.createBidiStream(options);
  const oldStream = baseline.createBidiStream(options);
  let prefix = '';
  for (const character of source) {
    prefix += character;
    const actual = stream.push(character).direction;
    const baselineActual = oldStream.push(character).direction;
    const expected = current.detectDirection(prefix, options);
    const baselineExpected = baseline.detectDirection(prefix, options);
    if (actual !== expected) {
      (baselineActual === baselineExpected ? newFailures : preExistingFailures).push({ source, prefix, expected, actual, baselineExpected, baselineActual });
      break;
    }
  }
}
console.log(JSON.stringify({ baseline: baselineCommit, seed, uniqueCases: cases.size, newFailures,
  preExistingFailureCount: preExistingFailures.length, preExistingSamples: preExistingFailures.slice(0, 5),
  scope: 'First current failing prefix per source; non-gating diagnostic, not a universal correctness claim.'
}, null, 2));
