# Cross-platform hardening: September 2026

This records the local verification of the unpublished audit-fix branch based
on npm 0.4.0. It is not a claim that every platform, input, or downstream
application is certified. Release status remains in the changelog and registry.

## Fixes and regression coverage

| Area | Correction | Regression evidence |
| --- | --- | --- |
| Formatting security | Avoid repeated reverse-stack scans in TypeScript, Kotlin, and Rust | Deep isolate stacks followed by unmatched PDF controls |
| Inline isolation | Split generated ranges at Unicode paragraph boundaries in all five cores | CR, LF, CRLF, NEL, U+001C through U+001E, and U+2029 cases |
| Incremental DOM | Reconcile adjacent owned isolates and appended text without rebuilding stable nodes | Ordered `page 97`, observer settlement, source and node identity |
| DOM ownership | Respect own CSS direction, changed author `dir`, case-insensitive `dir=auto`, and host-enriched markup during cleanup | Real-browser direction/alignment tests and retained host elements |
| Markdown | Use decoded visible prose instead of hidden link targets/titles as direction evidence | Paragraph, heading, table, entity, and streamed/batch equivalence cases |
| UIKit | Restore managed scalar alignment independently of source replacement or paragraph-property handoff; retain host per-paragraph styles | New UILabel tests; macOS/iOS CI required for this patch |
| Compose | Keep default display layout source-safe; provide isolated read-only selection through `BidiSelectableText` | Real Android system-clipboard copy preserves source and an authored RLM |
| Maintenance | Update the supported npm security line and exclude generated browser reports from lint | Manifest-linked docs checks and lint after trace generation |

## Local results

- TypeScript type checking and ESLint passed.
- 498 JavaScript tests passed; line coverage was 95.2%, branch coverage 86.79%.
- 42 Playwright tests passed across Chromium, Firefox, and WebKit with one
  worker. Parallel runs exposed a Firefox page-load timeout; focused and full
  serial reruns passed. A serial result is not evidence of parallel stability.
  These include author-direction handoff coverage on all three engines.
- 932 corpus fixtures and generated Unicode/native representations passed
  reproducibility checks. None of these fixtures is native-speaker certified.
- All 12 package type-layout checks passed. Markdown-It 13, 14, and 15 packed
  compatibility checks passed. The npm dependency audit reported no known
  vulnerabilities at the time of the check.
- Android core/Compose unit tests passed (33 + 9), as did Compose lint. All
  five Compose instrumentation tests passed on the API 36.1 emulator. An
  initial clipboard failure was traced to a System UI ANR dialog taking focus;
  the test was rerun successfully without replacing the real clipboard.
- Windows verification passed 1,183 assertions, including 932 corpus cases.
  The local build used the available .NET 10 SDK; execution used the installed
  x86 .NET 8 Windows Desktop runtime. Pinned .NET 8 SDK/x64 validation belongs
  to the clean CI job.
- Rust 1.85 formatting, all-target compiler checks, strict Clippy, and all
  28 conformance tests passed locally on Windows.
- Full JavaScript/demo builds and the checked-in Action bundle checks passed.
- Clean release-artifact verification passed for all 12 packages, including
  packed examples and compiled integration guides. This is not publication.

## Compatibility and remaining gates

The original hardening revision `a6042bc` passed all 25 hosted checks, including
Swift CodeQL and the full functional matrix. Further changes require fresh
checks; that result does not automatically validate later commits.

### Native security follow-up

An independently authored .NET regression reproduced an unclosed isolate being
reported as safe. Swift and .NET now expose standalone read-only scanners with
the same inventory, paragraph-balance, and hidden-character rule set as the web
scanner. Both use an isolate-index stack so unmatched PDF controls do not
repeatedly scan the entire formatting stack. Findings retain UTF-16 and
code-point offsets. Rendering intervention uses a cheap control-presence check
instead of running the complete security scanner twice.

The follow-up adds 94 reproducible differential fixtures, exercised in four
modes on each native port, plus independently authored boundary, nested-stack,
legitimate-joiner, emoji-offset, source-preservation, and 32,000-frame tests.
Local .NET verification passed 5,631 assertions, including the existing 932-case
direction corpus. Swift execution for this follow-up requires fresh hosted
macOS/iOS evidence; no local Swift runtime is claimed on this Windows host.

The same follow-up rejects NaN majority thresholds in .NET and restores
direction evidence for custom Markdown-It text leaves. Six new Markdown
regressions cover custom-token RTL/mixed output, batch/stream equivalence,
pure-LTR non-intervention, and exclusion of hidden/structural metadata. The
JavaScript suite now passes 504 tests.

The [native security guide](NATIVE_SECURITY.md) explains the stricter `safe`
result and advisory blocking flags. These source-only APIs are not a new
registry release.

`BidiText` now defaults to no generated display controls. For full inline
isolation with source-safe copy, use the read-only `BidiSelectableText` API.
Its interaction model differs from multi-widget container selection; see the
[Android guide](../android/README.md). These changes are not in Maven 0.1.2.

Direction and physical alignment remain independent. Pure-LTR non-intervention
tests remain enabled; an LTR value inside an RTL host may still need direction
metadata. Source strings are never visually reordered for storage.

Before release, require the hosted CI matrix, including the updated Swift and
UIKit tests, Android sample/consumer/device checks, and clean package-consumer
verification. Native-speaker review, physical-device/IME and screen-reader
testing, external security review, and downstream pilots remain separate
requirements in the [limitations](LIMITATIONS.md) and
[accessibility checklist](ACCESSIBILITY.md).
