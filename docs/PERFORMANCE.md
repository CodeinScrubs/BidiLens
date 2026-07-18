# Performance methodology and measured snapshot

Performance results are environment-specific regression evidence, not a
universal latency guarantee.

## Reproduce

```bash
pnpm run benchmark
pnpm run test:coverage
pnpm run release:check
```

The benchmark reports JSON, uses UTF-16 code-unit lengths, warms each operation
once, and then measures fixed iterations. The naïve full-reparse comparison is
run once without an additional warmup because the same analyzer is already
warmed by the batch matrix.

## Environment

Measured 2026-07-18 on:

- Windows 10.0.19045 x64;
- Node.js 24.18.0 LTS;
- Intel Core i7-4810MQ at 2.80 GHz, 8 logical CPUs;
- local interactive machine; power state was not instrumented.

## Batch matrix

Average milliseconds per operation:

| UTF-16 units | Iterations | Analyze | Segment | Isolate | Security |
|---:|---:|---:|---:|---:|---:|
| 1,024 | 1,000 | 1.0391 | 0.1243 | 0.2961 | 0.0367 |
| 10,240 | 100 | 8.5716 | 0.9234 | 2.3767 | 0.3251 |
| 102,400 | 10 | 99.4084 | 18.9249 | 35.6918 | 3.1792 |
| 1,048,576 | 1 | 869.9294 | 199.0513 | 459.5628 | 32.6089 |

## Streaming and structured workloads

| Workload | Measurement |
|---|---:|
| 100,000 units / 1,000 chunks, incremental | 102.0627 ms average (5 iterations) |
| Same input, full accumulated reparse after each chunk | 56,853.5192 ms (1 iteration) |
| 10,000 one-character pushes | 28.8889 ms average (5 iterations) |
| 500-item / 20-indent-level list, 42,999 units, analyze | 43.6502 ms average |
| Same deep list, isolation / security | 11.7461 / 1.2562 ms average |
| 1,000-row table, 70,826 units, analyze | 79.3424 ms average |
| Same table, isolation / security | 22.6197 / 1.9844 ms average |

The incremental comparison demonstrates the cost avoided by not reparsing the
whole accumulated response after every chunk. It does not imply that every host
will achieve the same ratio.

## Complexity and regression safeguards

- generated bidi-class and natural-letter ranges use binary search;
- technical ranges are sorted and traversed with a monotonic cursor;
- isolation planning does not rescan completed ranges;
- completed stream paragraphs are cached and immutable;
- the default separator uses incremental paragraph state;
- open content uses chunk-independent, exponentially spaced source-length and
  strong-evidence checkpoints;
- property tests cover one-character, random, token-like, CRLF, UTF-16
  surrogate-half, URL, and Markdown-fence chunk boundaries;
- a unit alarm permits 8,000 single-character pushes and dense isolation
  planning to finish within three seconds on the CI machine;
- release checks enforce aggregate emitted-JavaScript budgets, including
  code-split chunks.

A custom arbitrary paragraph-separator regular expression may require more
open-paragraph work than the optimized default. Benchmark custom separators in
the consuming application.
