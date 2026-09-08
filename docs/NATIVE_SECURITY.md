# Native security scanning

Swift and .NET source expose a standalone, offline security scanner. These
APIs are unreleased source work, not a Maven, NuGet, or new Swift release.
Scanning does not alter strings, change a control's layout, perform network
requests, or block application actions. The host chooses what to do with the
report.

```swift
let report = BidiAnalyzer.scanSecurity(message, mode: .warn)
for finding in report.findings {
    print(finding.code, finding.utf16Range, finding.remediation)
}
```

```csharp
var report = BidiAnalyzer.ScanSecurity(message, BidiSecurityMode.Warn);
foreach (var finding in report.Findings)
    Console.WriteLine($"{finding.Code} at {finding.Utf16Start}: {finding.Remediation}");
```

`BidiAnalyzer.analyze(...).security` / `BidiAnalyzer.Analyze(...).Security`
includes the audit-mode report. It does not enforce a policy. Ordinary LTR
text still takes the adapter's non-intervention path; a hidden zero-width
space finding does not itself activate layout changes.

## Modes and decisions

| Mode | Findings | `shouldBlock` / `ShouldBlock` |
| --- | --- | --- |
| `off` / `Off` | No scanning; empty findings and controls | Always false |
| `audit` / `Audit` (default) | Full report | Always false |
| `warn` / `Warn` | Full report | True for high-severity findings |
| `strict` / `Strict` | Full report | True for any finding, including informational marks |

`safe` / `Safe` means that no high-severity finding was identified. It does
**not** certify that text is harmless. Off mode returns true because scanning
is disabled, not because the text was checked. A strict report can have
`safe == true` and `shouldBlock == true` when only warnings or informational
findings exist. Strict mode is intentionally unsuitable for indiscriminately
rejecting multilingual prose containing legitimate authored directional marks.

## What is detected

- All 18 recognized bidi marks, embeddings, overrides, isolates, pops, and
  deprecated controls, with names and risk levels.
- Unmatched PDF/PDI, unclosed formatting, and embeddings crossing an isolate
  boundary. Balancing resets at CR, LF, CRLF, NEL, U+001C–U+001E, and U+2029;
  U+2028 is a line separator and does not reset the paragraph stack.
- Zero-width spaces, word joiners, and midstream BOMs. A leading decoded BOM
  is not flagged.
- ZWJ/ZWNJ between ASCII identifier-like characters. Persian word joiners and
  emoji ZWJ sequences are not flagged by this rule.

Every finding has a stable code, severity, explanation, remediation, and
half-open UTF-16 and Unicode code-point ranges. These are not grapheme-cluster
or UTF-8 byte offsets. Use UTF-16 positions for native APIs that accept them;
do not use them directly as Swift `String.Index` values. Control inventory
also exposes its code-point index.

The balance policy deliberately reports structural risks rather than trying
to reproduce a renderer's depth-overflow behavior. Each formatting frame is
removed at most once; final diagnostic sorting is O(f log f) for f findings.

## Compatibility and evidence

Earlier Swift/.NET source only inventoried controls. Unclosed isolates and
unmatched pops could therefore leave `safe` true. They now produce a
high-severity finding and a false `safe` result. Existing control inventory
remains available; the source value remains unchanged.

94 generated differential fixtures compare the web and native scanners'
codes, severities, inventory, offsets, and mode decisions. Hand-authored native
assertions independently cover important behavior so the web implementation
is not the only oracle. `pnpm corpus:check` rejects stale generated fixtures;
`pnpm corpus:generate` regenerates them after an intentional contract change.
These fixtures are security-structure checks, not native-speaker certification.

This is not a source-language parser, whole-script confusable detector,
sanitizer, native SARIF exporter, or external security audit. A security report
cannot infer malicious intent. Keep the original input for editing and
storage, and apply product-specific review or blocking policies explicitly.
