# Performance methodology and measured snapshot

Performance results are environment-specific regression evidence, not a
universal latency guarantee.

## Reproduce

```bash
pnpm run benchmark
pnpm run benchmark:ci # also writes benchmarks/results/latest.json
pnpm run test:coverage
pnpm run release:check
```

The benchmark reports JSON, uses UTF-16 code-unit lengths, warms each operation
once, and then measures fixed iterations. The naïve full-reparse comparison is
run once without an additional warmup because the same analyzer is already
warmed by the batch matrix.

The manual/weekly benchmark workflow uploads that JSON for the exact commit as
a 30-day artifact. Benchmarks remain non-gating because shared CI hardware is
not stable enough for a universal latency threshold.

## Environment

Measured 2026-07-22 on:

- Windows 10.0.19045 x64;
- Node.js 25.2.1;
- Intel Core i7-4810MQ at 2.80 GHz, 8 logical CPUs;
- local interactive machine; power state was not instrumented.

## Batch matrix

Average milliseconds per operation:

| UTF-16 units | Iterations | Analyze | Segment | Isolate | Security |
|---:|---:|---:|---:|---:|---:|
| 1,024 | 1,000 | 0.4718 | 0.0968 | 0.3030 | 0.0356 |
| 10,240 | 100 | 4.3712 | 0.7715 | 2.6978 | 0.2992 |
| 102,400 | 10 | 43.8334 | 12.0886 | 28.5110 | 2.9937 |
| 1,048,576 | 1 | 478.6787 | 153.5806 | 380.7700 | 30.2445 |

## Streaming and structured workloads

| Workload | Measurement |
|---|---:|
| 100,000 units / 1,000 chunks, incremental | 251.4544 ms average (5 iterations) |
| Same input, full accumulated reparse after each chunk | 22,624.4040 ms (1 iteration) |
| 10,000 one-character pushes | 44.6316 ms average (5 iterations) |
| 500-item / 20-indent-level list, 42,999 units, analyze | 15.9302 ms average |
| Same deep list, isolation / security | 8.7808 / 1.0634 ms average |
| 1,000-row table, 70,826 units, analyze | 32.2007 ms average |
| Same table, isolation / security | 18.9468 / 1.7496 ms average |

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
  strong-evidence checkpoints, while the default content-majority result stays
  revisable until the paragraph is complete;
- property tests cover one-character, random, token-like, CRLF, UTF-16
  surrogate-half, URL, and Markdown-fence chunk boundaries;
- a unit alarm permits 8,000 single-character pushes and dense isolation
  planning to finish within three seconds on the CI machine;
- release checks enforce aggregate emitted-JavaScript budgets, including
  code-split chunks.

The default newline separator is recognized incrementally. An arbitrary custom
paragraph-separator regular expression is buffered and evaluated once by
`finish()`. This preserves chunk-boundary invariance for future-sensitive
lookarounds, anchors, and extendable matches without reparsing the accumulated
paragraph after every chunk. Applications that require live custom boundaries
should split those boundaries upstream and feed the default paragraph stream.
