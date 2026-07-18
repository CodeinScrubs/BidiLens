import { performance } from 'node:perf_hooks';
import { analyzeText, segmentDirectionalRuns } from '../packages/core/src/index.js';

const sample = `این یک پاسخ ترکیبی است with English API names مثل fetchUser() و مسیر src/server/index.ts.\n`.repeat(500);
const iterations = 500;

const start = performance.now();
for (let index = 0; index < iterations; index += 1) {
  analyzeText(sample);
}
const analysisMs = performance.now() - start;

const segmentStart = performance.now();
for (let index = 0; index < iterations; index += 1) {
  segmentDirectionalRuns(sample);
}
const segmentMs = performance.now() - segmentStart;

console.log(JSON.stringify({
  characters: sample.length,
  iterations,
  analyzeTotalMs: Number(analysisMs.toFixed(2)),
  analyzeAverageMs: Number((analysisMs / iterations).toFixed(4)),
  segmentTotalMs: Number(segmentMs.toFixed(2)),
  segmentAverageMs: Number((segmentMs / iterations).toFixed(4))
}, null, 2));
