# BidiLens for Rust

`bidilens-core` is the native Rust direction-analysis and inline-isolation core
for mixed right-to-left and left-to-right text. It has no JavaScript runtime,
network access, process-wide configuration, or UI-framework dependency.

The crate is currently source-distributed and deliberately has
`publish = false`. It is not on crates.io, is not a Zed plugin, and has no
downstream adoption claim. The public API should receive integration feedback
before a permanent registry release.

## What it does

- selects semantic block direction from natural-language evidence;
- excludes code, URLs, paths, commands, versions, identifiers, and numbers from
  the default content-majority decision;
- reports byte, UTF-16, and Unicode scalar-value ranges;
- plans display-only LRI/RLI/PDI isolation without rewriting stored source;
- audits hidden bidi controls, unbalanced formatting, and selected invisible
  characters;
- returns an exact no-op for ordinary LTR content in an LTR context.

The host text engine still performs Unicode bidirectional layout, glyph shaping,
font fallback, line breaking, selection, and cursor movement.

## Run the example

Rust 1.85 or newer is required.

```bash
cargo run --manifest-path rust/Cargo.toml --example basic
```

From a Rust file:

```rust
use bidilens_core::{AnalysisOptions, Direction, analyze, format_for_display};

let source = "React یک کتابخانه جاوااسکریپت بسیار محبوب است.";
let analysis = analyze(source, &AnalysisOptions::default())?;

assert_eq!(analysis.direction, Direction::Rtl);
assert_eq!(analysis.text, source); // storage stays immutable

// Use only as a transient plain-text display value when semantic host markup
// is unavailable. Do not persist the returned isolation controls.
let display = format_for_display(&analysis);
# Ok::<(), bidilens_core::OptionsError>(())
```

Prefer native host direction and isolation APIs over inserting controls. The
display helper exists for plain-text boundaries that lack semantic markup.

## Direction is not alignment

`analysis.direction` is the paragraph's semantic base. Physical placement is a
separate host decision. An application may keep Persian text physically aligned
left while applying an RTL paragraph base:

```text
analysis.direction = Rtl
host alignment      = PhysicalLeft
```

The core intentionally does not choose alignment, mirror the application shell,
or mutate sibling controls.

## Verification

```bash
cargo fmt --manifest-path rust/Cargo.toml --all -- --check
cargo check --manifest-path rust/Cargo.toml --all-targets
cargo clippy --manifest-path rust/Cargo.toml --all-targets --all-features -- -D warnings
cargo test --manifest-path rust/Cargo.toml --all-targets
```

The conformance suite checks all 923 shared direction fixtures, every declared
isolation plan, security expectations, index conversions, invalid options, and
the LTR identity contract. CI repeats the gate on Linux, macOS, and Windows.
See the [Rust build report](BUILD_REPORT.md) and project-wide
[limitations](../docs/LIMITATIONS.md).

## Integration boundary

For an editor or application integration:

1. analyze each semantic paragraph or message, not the entire screen;
2. apply the returned base direction at the host text-layout boundary;
3. keep alignment independently configurable;
4. isolate only the returned inline ranges using native span/attribute APIs;
5. preserve the original string for storage, editing, copy, search, logs, and accessibility;
6. add host-level fixtures for selection, cursor behavior, IME composition, and shaping.

The crate supplies deterministic policy and evidence; it cannot repair a host
renderer that lacks Arabic shaping or Unicode bidi support.
