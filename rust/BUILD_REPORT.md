# Rust core build report

**Evidence date:** 2026-08-01

## Implemented evidence

- native Rust implementation; no JavaScript subprocess or runtime dependency;
- generated Unicode 17.0.0 bidi and natural-letter tables from the repository's
  checksum-pinned canonical inputs;
- content-majority, first-strong, strict first-strong, inherited, and forced
  direction strategies;
- technical-token detection, inline isolation planning, transient display
  formatting, and hidden-control auditing;
- byte, UTF-16, and Unicode scalar-value ranges;
- exact pure-LTR/LTR-context no-op behavior;
- shared `corpus/cases.json` gate: 928 direction fixtures, all explicitly
  declared isolation plans, and all security-code fixtures;
- focused option, offset, mixed-direction, source-immutability, formatting, and
  independent direction/alignment assertions;
- runnable `examples/basic.rs` example;
- pinned Rust 1.85 Linux, macOS, and Windows CI matrix.

## Repeatable commands

```bash
cargo fmt --manifest-path rust/Cargo.toml --all -- --check
cargo check --manifest-path rust/Cargo.toml --all-targets
cargo clippy --manifest-path rust/Cargo.toml --all-targets --all-features -- -D warnings
cargo test --manifest-path rust/Cargo.toml --all-targets
cargo run --manifest-path rust/Cargo.toml --example basic
```

The complete command set passed locally on Windows 10 x64 with the declared
minimum Rust `1.85.0` GNU toolchain on 2026-08-01. The conformance executable
reported 18/18 test groups passing; the corpus groups cover all 928 direction
cases and every declared isolation/security expectation. The protected
[pull-request run](https://github.com/CodeinScrubs/BidiLens/actions/runs/30702127236)
passed the Rust core gate on
[Linux](https://github.com/CodeinScrubs/BidiLens/actions/runs/30702127236/job/91374861109),
[macOS](https://github.com/CodeinScrubs/BidiLens/actions/runs/30702127236/job/91374861123),
and [Windows](https://github.com/CodeinScrubs/BidiLens/actions/runs/30702127236/job/91374861124).

## Distribution and validation boundary

This is source validation, not a crates.io release or production-adoption claim.
The crate remains `publish = false` until its API receives downstream review.
It does not ship an adapter for Zed or another editor. Hosted CI proves that the
crate compiles and its deterministic tests pass on the named runner images; it
does not replace application-level rendering, selection, accessibility, IME,
performance, or rollback validation in a real host.
