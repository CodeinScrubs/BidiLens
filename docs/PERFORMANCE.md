# Performance methodology and measured snapshot

Performance results are environment-specific regression evidence, not a
universal latency guarantee.

## Reproduce

```bash
pnpm run benchmark
pnpm run benchmark:ci # also writes benchmarks/results/latest.json
pnpm run benchmark:regressions # isolated budgets only, without the slow comparative controls
pnpm run test:coverage
pnpm run release:check
```

The benchmark reports JSON, uses UTF-16 code-unit lengths, warms each operation
once, and then measures fixed iterations. Each naïve full-reparse comparison is
run once without an additional warmup because its analyzer/parser path is
already exercised by the corresponding incremental workload.

The manual/weekly benchmark workflow uploads that JSON for the exact commit as
a 30-day artifact. Comparative timings are not universal latency thresholds.
Two explicit, broad regression budgets now fail the benchmark command when
their warmed three-run average reaches 2,000 ms: 20,000 inline sibling groups
and 400 streamed Markdown list items. These run outside Vitest coverage and
parallel test-file scheduling. Run benchmarks without competing CPU-intensive
jobs; a failure requires reproduction and diagnosis, not an automatic budget
increase. The `--regressions-only` mode emits the same environment and budget
metadata, supports `--output`, and retains the measurement report before a
budget failure. The isolated per-PR CI job and `verify:production` command run
this shorter guard; the scheduled/manual workflow retains the full comparative
matrix. Neither provides a universal latency certification.

## Current audit measurement (2026-10-01)

An isolated run on Windows 10.0.19045 x64, Node.js 24.19.0, and an Intel Core
i7-4810MQ at 2.80 GHz (eight logical CPUs) completed both unchanged 2,000 ms
regression budgets. Each budget used one warmup and three timed iterations,
without V8 coverage or concurrent test/build jobs:

| Workload | Average | Regression budget |
| --- | ---: | ---: |
| 20,000 inline sibling groups, projection and content assertions | 414.3181 ms | 2,000 ms |
| 400 dense streamed list items with `getUpdate()` after every item | 378.2398 ms | 2,000 ms |
| 100,000 core units / 1,000 chunks | 642.2235 ms | Comparative only |
| Same core input, full accumulated reparse on every chunk | 51,612.8049 ms | Comparative only |
| 20,000 Markdown units / 400 chunks, checkpointed rich updates | 8,706.2715 ms | Comparative only |
| Same Markdown input, full rich reparse on every chunk | 17,917.7596 ms | Comparative only |

The general rich Markdown workload therefore demonstrates about a 2.06x
advantage on this audit revision, not the much larger ratio in the historical
July table below. Its 8.7-second aggregate cost is a remaining limitation, not
a fast-rendering guarantee: rich parse counts alone do not bound repeated
snapshot projection and reconciliation. The runtime and implementation have
also changed since July, so these snapshots do not isolate a causal regression.

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

These safeguards are workload-specific, not a global complexity guarantee.
An external-review follow-up reproduced pre-existing repeated full rescans on
character-by-character streams of `$A$1 ` repetitions. Such ambiguous
environment/math overlaps remain a worst-case limitation even though ordinary
price prose and dense delimiter regression tests pass. Batch input where
possible, limit untrusted response length, and reconcile at `finish()`.
Open bracketed display math also requires exact analysis at push boundaries
until it closes. Long unclosed spans with tiny chunks can therefore perform
quadratic total work. This correctness-first fallback is not active for
ordinary plain-text streams.
An external 11.8x BMP lookup microbenchmark targets a different implementation;
it is not an end-to-end BidiLens speedup and is not used as a product claim.

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
- dense inline projection retains a 20,000-group correctness workload, while
  an instrumented child array directly bounds reads to at most 12 per group
  at two input sizes. Reintroducing repeated `indexOf` scans fails this
  deterministic bound independently of machine speed or coverage;
- a 400-item streaming test counts actual Markdown-It parser calls and total
  parsed source lengths. Geometric checkpoints plus final reconciliation must
  parse less than three times the final source length and produce exact batch
  HTML. This bounds rich parsing, not all per-update work: snapshot projection
  and paragraph reconciliation can still accumulate quadratic work on dense
  growing lists. The separate benchmark times the complete live-update workload;
- a unit alarm permits 8,000 single-character pushes and dense isolation
  planning to finish within three seconds on the CI machine;
- an adversarial unit alarm scans 128,000 UTF-16 units of repeated unmatched
  `\(` delimiters within the batch budget, guarding the linear math scanner;
- the external-claims regressions scan 32,000 unmatched `\[` openers and
  16,000-group numbers with each supported separator, including rejected
  final word boundaries. Currency/percentage/range suffix recognition in the
  JavaScript core reuses a bounded numeric-candidate scan instead of restarting
  at every separator. These measured alarms do not establish native regex
  complexity parity or an unconditional whole-engine complexity guarantee;
- release checks enforce aggregate emitted-JavaScript budgets, including
  code-split chunks.

The September audit adds pinned extended-grapheme data and rich-formatting
ownership/selection handling. It deliberately increases the complete facade
size. The clean-tree 2026-09-27 artifact check at code revision `81119bc`
measured these complete emitted facades:

| Package | Aggregate JavaScript bytes | Gzip bytes |
| --- | ---: | ---: |
| Core | 142,449 | 30,089 |
| DOM | 25,567 | 5,773 |
| Markdown | 85,944 | 16,789 |

The subsequent external-claim repairs at code revision `7825d65`, checked from
a clean committed tree on 2026-09-27, measured core at 144,748 raw bytes and
30,608 gzip bytes. DOM and Markdown remained at the sizes above. The added
numeric scanner and streaming reconciliation cost 2,299 raw bytes and 519 gzip
bytes versus `81119bc`; no size budget was raised to accommodate these repairs.

Release gates bound both aggregate raw bytes (145/28/88 KiB) and gzip bytes
(32/7/18 KiB) for those packages. These are full emitted facades, not a claim
about a tree-shaken application's final bundle. The July timing tables above
are historical snapshots, not measurements of this audit branch.

The complete Unicode 17 paragraph-separator set (CR, LF, CRLF, NEL,
U+001C–U+001E, and U+2029) is recognized incrementally. An arbitrary custom
paragraph-separator regular expression is buffered and evaluated once by
`finish()`. This preserves chunk-boundary invariance for future-sensitive
lookarounds, anchors, and extendable matches without reparsing the accumulated
paragraph after every chunk. Applications that require live custom boundaries
should split those boundaries upstream and feed the default paragraph stream.
