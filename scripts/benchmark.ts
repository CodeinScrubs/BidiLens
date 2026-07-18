import { cpus, platform, release } from 'node:os';
import process from 'node:process';
import { performance } from 'node:perf_hooks';
import {
  analyzeText,
  createBidiStream,
  planInlineIsolation,
  scanBidiSecurity,
  segmentDirectionalRuns
} from '../packages/core/src/index.js';

const BASE = 'React یک کتابخانه جاوااسکریپت محبوب است. The API path is src/server/index.ts. سلام دنیا.\n';

function sample(length: number): string {
  return BASE.repeat(Math.ceil(length / BASE.length)).slice(0, length);
}

function measure(operation: () => void, iterations: number, warmupRuns = 1): { totalMs: number; averageMs: number } {
  for (let run = 0; run < warmupRuns; run += 1) operation();
  const start = performance.now();
  for (let index = 0; index < iterations; index += 1) operation();
  const totalMs = performance.now() - start;
  return {
    totalMs: Number(totalMs.toFixed(3)),
    averageMs: Number((totalMs / iterations).toFixed(4))
  };
}

const matrix = [
  { utf16CodeUnits: 1_024, iterations: 1_000 },
  { utf16CodeUnits: 10_240, iterations: 100 },
  { utf16CodeUnits: 102_400, iterations: 10 },
  { utf16CodeUnits: 1_048_576, iterations: 1 }
].map(({ utf16CodeUnits, iterations }) => {
  const text = sample(utf16CodeUnits);
  return {
    utf16CodeUnits,
    iterations,
    analyze: measure(() => { analyzeText(text); }, iterations),
    segment: measure(() => { segmentDirectionalRuns(text); }, iterations),
    isolate: measure(() => { planInlineIsolation(text, 'rtl'); }, iterations),
    security: measure(() => { scanBidiSecurity(text); }, iterations)
  };
});

const streamSource = sample(100_000);
const chunkSize = Math.ceil(streamSource.length / 1_000);
const chunks: string[] = [];
for (let index = 0; index < streamSource.length; index += chunkSize) {
  chunks.push(streamSource.slice(index, index + chunkSize));
}
const incremental = measure(() => {
  const stream = createBidiStream();
  for (const chunk of chunks) stream.push(chunk);
  stream.finish();
}, 5);
const naiveReparse = measure(() => {
  let accumulated = '';
  for (const chunk of chunks) {
    accumulated += chunk;
    analyzeText(accumulated);
  }
}, 1, 0);

const oneCharacterSource = sample(10_000);
const oneCharacterStream = measure(() => {
  const stream = createBidiStream();
  for (const character of oneCharacterSource) stream.push(character);
  stream.finish();
}, 5);

const deepList = Array.from({ length: 500 }, (_, index) =>
  `${'  '.repeat(index % 20)}- React یک کتابخانه محبوب است و مسیر src/app.ts را استفاده می‌کند.`
).join('\n');
const largeTable = [
  '| Feature | توضیح | Path |',
  '| --- | --- | --- |',
  ...Array.from({ length: 1_000 }, (_, index) =>
    `| streaming-${index} | پردازش جریانی بسیار سریع است | src/messages/${index}.ts |`
  )
].join('\n');

function structuredMeasurement(text: string, iterations: number): object {
  return {
    utf16CodeUnits: text.length,
    iterations,
    analyze: measure(() => { analyzeText(text); }, iterations),
    isolate: measure(() => { planInlineIsolation(text, 'rtl'); }, iterations),
    security: measure(() => { scanBidiSecurity(text); }, iterations)
  };
}

console.log(JSON.stringify({
  environment: {
    node: process.version,
    platform: `${platform()} ${release()}`,
    architecture: process.arch,
    cpu: cpus()[0]?.model ?? 'unknown',
    logicalCpuCount: cpus().length
  },
  methodology: {
    unit: 'milliseconds',
    lengthUnit: 'UTF-16 code units',
    warmupRuns: '1 per operation except the already-warmed one-pass naive reparse',
    note: 'Local comparative measurement; not a universal latency guarantee.'
  },
  batchMatrix: matrix,
  streaming: {
    utf16CodeUnits: streamSource.length,
    requestedChunks: 1_000,
    actualChunks: chunks.length,
    incremental,
    naiveFullReparse: naiveReparse,
    oneCharacter: {
      utf16CodeUnits: oneCharacterSource.length,
      iterations: 5,
      ...oneCharacterStream
    }
  },
  structured: {
    deepList: {
      items: 500,
      maximumIndentLevels: 20,
      ...structuredMeasurement(deepList, 5)
    },
    largeTable: {
      bodyRows: 1_000,
      ...structuredMeasurement(largeTable, 5)
    }
  }
}, null, 2));
