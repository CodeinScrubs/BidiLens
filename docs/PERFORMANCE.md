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
once, and then measures fixed iterations. Each naïve full-reparse comparison is
run once without an additional warmup because its analyzer/parser path is
already exercised by the corresponding incremental workload.

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
| 1,024 | 1,000 | 0.5062 | 0.1007 | 0.3312 | 0.0361 |
| 10,240 | 100 | 4.8258 | 0.7754 | 3.5291 | 0.3693 |
| 102,400 | 10 | 54.1128 | 16.5454 | 35.5034 | 3.2120 |
| 1,048,576 | 1 | 510.9244 | 151.6411 | 539.2878 | 40.9023 |

## Streaming and structured workloads

| Workload | Measurement |
|---|---:|
| 100,000 units / 1,000 chunks, incremental core direction | 319.6915 ms average (5 iterations) |
| Same input, full accumulated core reparse after each chunk | 24,329.2887 ms (1 iteration) |
| 10,000 one-character core pushes | 49.7679 ms average (5 iterations) |
| 20,000 Markdown units / 400 chunks, rich checkpoint stream | 469.8347 ms average; 10 rich parses (5 iterations) |
| Same Markdown, full accumulated rich reparse after each chunk | 8,211.4203 ms (1 iteration) |
| 500-item / 20-indent-level list, 42,999 units, analyze | 20.1153 ms average |
| Same deep list, isolation / security | 10.8853 / 1.1278 ms average |
| 1,000-row table, 70,826 units, analyze | 42.8413 ms average |
| Same table, isolation / security | 25.8220 / 1.6817 ms average |

The incremental comparison demonstrates the cost avoided by not reparsing the
whole accumulated response after every chunk. It does not imply that every host
will achieve the same ratio.

The rich Markdown measurement calls `getUpdate()` after every chunk. Direction
state remains current on every push, but Markdown-It parses only at geometric
or context-changing structural checkpoints and once at `finish()`. The naïve
control runs the identical batch
AST/HTML/security pipeline after every chunk. On this input the checkpointed
path used 10 rich parses instead of 400; `pendingSourceRange` is the explicit
API signal while a rich document is between checkpoints.

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
- rich Markdown revisions use geometric and context-changing structural
  checkpoints, expose dirty and pending ranges, and perform one exact full
  reconciliation at `finish()`;
- a rich-stream unit alarm pushes 8,192 individual characters while asserting
  at most 14 live Markdown parses;
- a unit alarm permits 8,000 single-character pushes and dense isolation
  planning to finish within three seconds on the CI machine;
- an adversarial unit alarm scans 128,000 UTF-16 units of repeated unmatched
  `\(` delimiters within the batch budget, guarding the linear math scanner;
- release checks enforce aggregate emitted-JavaScript budgets, including
  code-split chunks.

The complete Unicode 17 paragraph-separator set (CR, LF, CRLF, NEL,
U+001C–U+001E, and U+2029) is recognized incrementally. An arbitrary custom
paragraph-separator regular expression is buffered and evaluated once by
`finish()`. This preserves chunk-boundary invariance for future-sensitive
lookarounds, anchors, and extendable matches without reparsing the accumulated
paragraph after every chunk. Applications that require live custom boundaries
should split those boundaries upstream and feed the default paragraph stream.
