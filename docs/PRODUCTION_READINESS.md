# Production readiness review — 2026-10-02

**The project is not validated for every language, renderer, device or production host.**
It has useful published web and Android packages and substantial automated
coverage. Advertising is not the only remaining work. Choose a supported
renderer, test exact source/copy/alignment behavior in that host, and roll out
with an explicit rollback. No comparison establishes that one toolkit is best
for every developer, renderer, or language.

## Which code was examined

This review started from audit revision `74fe1ad` on draft
[PR #162](https://github.com/CodeinScrubs/BidiLens/pull/162), which is newer
than the public `main` revision `ad7cf20`. At review time, PR #162 and the
outreach documentation [PR #163](https://github.com/CodeinScrubs/BidiLens/pull/163)
each had 25 successful hosted checks and remained unmerged drafts. Those
checks validate their recorded heads; they do not validate the changes added
in this review. The [audit ledger](audit-repair-status.md) retains earlier
results without treating them as current certification.

| Surface | Distribution | What is still required |
| --- | --- | --- |
| JavaScript/web | npm `0.4.0`, ESM, Node ≥22.12 | Release the newer reviewed repairs, exercise the downstream renderer, complete accessibility and native-language review |
| Android Kotlin/Views/Compose | Maven Central `0.1.2` | Release newer source repairs, physical-device/OEM/IME/TalkBack tests and a downstream pilot |
| Swift/UIKit/SwiftUI | Source package and Apple CI | Repair independent paragraph bases/restoration, validate the composition guard on Apple hosts/devices, VoiceOver validation and distribution decision |
| .NET/WPF | Source projects and Windows CI | Broader ownership/inheritance/IME/accessibility validation, native cluster parity, NuGet release decision |
| Rust | Source crate and three-OS CI | Native cluster parity, editor-specific rendering integration, crates.io release decision and a downstream pilot |
| Flutter, React Native, WinUI, Windows Forms, MAUI, PDF | No dedicated adapter | Design, implementation and platform validation; do not infer coverage from the core analyzer |

Source on this branch still declares web version `0.4.0`; an actual new
publication needs a version bump and the protected publishing workflow.
Installing an existing registry version does not install these unpublished
fixes. Registry integrity/provenance verifies artifact origin, not correctness
on every input or host.

## Verified defects found in this review

| Finding | Correction in this branch | Regression boundary |
| --- | --- | --- |
| React mixed-direction streaming children reset a caller's physical-left alignment to `start`; React/Vue inline defaults also beat host stylesheets | Omit automatic text alignment and inherit the host; explicit caller alignment remains available | SSR/unit tests and browser checks cover left-aligned independent blocks |
| The optional DOM helper stylesheet overrides a parent's physical-left alignment | Remove automatic alignment declarations; retain direction/isolation rules | Installed-style browser checks in Chromium, Firefox and WebKit |
| Hidden DOM metadata, `script`, `style`, or `template` content can select a base for visible prose | Analyze the current displayed light-DOM projection and keep unrendered nodes intact | Hidden/style/script cases, authored CSS visibility overrides, restoration, logical source and node identity |
| Absent inline metadata splits a visually continuous URL into separate isolates | Skip absent nodes without ending the visible projection; retain their node identity | Stable, single-isolate URL checks across all three browser engines |
| .NET malformed dotted input can throw `RegexMatchTimeoutException` | Bounded email and relative-path scanners replace the two greedy recognizers | Long failed candidates plus existing native lexical compatibility cases |
| .NET technical isolation can split a keycap's digit from variation selector/combining mark | Extend display ranges over generated combining-mark data and subtract those extended ranges from opposite runs | Keycap/combining-mark source and dual-offset invariants; this is not full native grapheme parity |
| WPF TextBlock/TextBox keep a stale inherited host direction after parent changes or restoration | Use reversible overrides for originally inherited/style properties and refresh the current baseline | Parent/style changes, continued inheritance after restoration, source preservation and binding ownership |
| WPF dynamic resources can restore a stale cached baseline when their new value matches a managed override | Reattach the original shareable resource expression to resolve the current resource; never detach local binding expressions | Control/paragraph resource updates, reanalysis, expression identity and future resource changes |
| UIKit editable apply/restore can mutate provisional marked text | Add early composition guards retaining source, selection and managed state until explicit retry | Deterministic marked-text stand-in tests added; hosted Apple compilation and real IME validation are still required |
| Coverage/parallel scheduling distort two workload timing assertions | Keep deterministic array-read/parser-input alarms in unit tests and unchanged 2,000 ms ceilings in isolated PR/release benchmark checks | Deliberate repeated-scan and zero-budget failure controls; actual minimum-Node isolated workload passes |
| Firefox demo callback checks intermittently miss native-timer assertion deadlines | Install the browser test clock before application timers; advance real streaming/clipboard-timeout callbacks deterministically | Exact completion/source/direction/status checks remain; the separate playground still exercises real timers, and these tests do not certify actual browser timer cadence |
| Current development dependencies contain newly reported advisories | Update four pinned overrides: `fast-uri` 3.1.8, `undici` 7.29.1, `brace-expansion` 5.0.12, `devalue` 5.9.3 | Frozen installation and fresh full/production dependency audits |
| Support docs wrongly describe all native implementations as absent | Record published Android versus source-only Apple/Windows/Rust scope | Documentation and release-status review |

The [September 30 scheduled audit](https://github.com/CodeinScrubs/BidiLens/actions/runs/36716905084)
failed on the older `main`. Fresh reproduction found 16 development-toolchain
advisories (6 high, 7 moderate, 3 low); the production-only npm audit returned
zero. Updating the first three overrides cleared those findings. A later
October 1 scan reported six newly listed development-toolchain advisories in
`devalue` (3 high, 2 moderate, 1 low); its override was then raised to 5.9.3.
Fresh audit results must be checked again at the release boundary. Dated
registry evidence is not a permanent security guarantee or a claim of known
vulnerabilities in the published consumer runtime.

On October 2, Node 22.12.0/pnpm 10.27.0 frozen installation and both the full
and production-only audits passed with zero known advisories at the `low`
threshold. The lockfile remained byte-identical through installation; its
four updated dependency integrities matched registry metadata.

The [problem gallery](problem-gallery/README.md) records real controlled
before/after captures, source strings, inputs, environment and artifact hashes.
Original ChatGPT captures illustrate user-reported symptoms. Neither set
establishes deployment in a proprietary application or how frequently its
users encounter the problem.

## Current local verification boundary

On October 2, the minimum-runtime `pnpm run check` completed successfully on
Windows with Node 22.12.0: 25 test files, 760 passed tests and two Windows-specific
skips, 95.36% line coverage, 941 corpus cases and 94 reproducible native security
fixtures. The two skips cover POSIX-only filename semantics and a symlink
fixture requiring Windows developer-mode privileges; hosted Linux checks must
cover those paths. Generated Unicode/command data, types, lint, package-depth
checks, 89 Markdown documents/219 local links, six gallery pairs, all builds,
and the GitHub Action execution probes passed. Workflow lint also passed.

The source-linked Windows core/WPF runner passed 5,853 assertions and all
941 corpus cases on the locally available .NET 10 SDK. That is not a substitute
for the repository's .NET 8 hosted job. Apple guards were statically reviewed;
Windows cannot execute the Apple device/compiler matrix.

The first fresh full browser run passed 79 cases and failed two Firefox demo
native-timer deadline checks. The test-clock repair retains exact output and
status assertions; one four-worker stress repeat also reported a Firefox
compositor/context timeout. These failed runs are not counted as green. The
final browser, packed-consumer, SBOM and isolated-budget checks, and hosted
native/security jobs must be evaluated on the final reviewed head before
merging or releasing. See the pull request's actual check status rather than
inferring success from this dated snapshot.

## Remaining blockers and acceptance work

1. **UIKit correctness:** one control still supplies one whole-text paragraph
   base; independent original paragraph directions can be flattened on
   restoration. Editable apply/restore now defers marked-text mutation, but the
   new guard requires hosted Apple validation and an explicit host retry after
   composition ends. Use separate read-only controls for independent paragraph
   intent until the whole-control ownership model is repaired and tested.
2. **Native clusters and hostile workloads:** native ports do not yet share the
   pinned JavaScript extended-grapheme implementation. The Windows combining
   fix closes a specific keycap defect, not all emoji/Indic/cluster cases.
   Other native recognizers and offset construction need adversarial workload
   review. Windows controls now cover specific inherited/style parent-change
   regressions, but still need real editor/IME validation; Android Views callers must supply the actual inherited
   direction when its default is not appropriate.
3. **Untrusted streams:** unfinished bracket math and ambiguous dollar/env
   overlaps can require repeated exact rescans; tiny chunks can cause quadratic
   work. Bound or batch untrusted streams. `finish()` is the exact batch boundary.
   Keep provisional and completed output distinct.
   The current general 20,000-unit/400-chunk rich Markdown benchmark took 8.7
   seconds in aggregate, versus 17.9 seconds for full reparsing. This is about
   2.06x on this machine, not the much larger historical July ratio. Dense growing
   snapshot/reconciliation work remains a performance improvement target; see
   [current performance evidence](PERFORMANCE.md).
4. **Global language quality:** the generated classifier covers scripts, but
   the corpus records zero native-speaker-certified templates and lacks dedicated
   Sindhi, Syriac, Divehi and Yiddish tagged material. Recruit reviewers for
   exact source, intended base, punctuation and semantic isolation decisions.
5. **Real-world acceptance:** physical Android/iOS device and OEM IME matrices,
   VoiceOver/TalkBack/Windows screen-reader labs, an independent security review,
   and downstream production pilots remain open. Browser screenshots, compiler
   jobs and shared corpus passes cannot substitute for these.
6. **Release:** run the full current functional/packed-consumer/native/browser
   matrix, review the combined diff, merge appropriate fixes, bump versions,
   publish immutable artifacts and test a clean public consumer. The previous
   draft-head checks do not cover new changes automatically.

The current DOM observer watches child/text mutations, not every CSS or
visibility change. Call `flush()` or `applyBidi()` after changing visibility
without a source mutation. CSS-generated text and shadow-tree content are
outside the light-DOM source projection.

## How alternatives compare

These tools solve different layers. The correct choice can be a native API,
BidiLens, another library, or a combination.

| Alternative | Where it can be preferable | BidiLens's useful extra layer |
| --- | --- | --- |
| [Native HTML `dir` and `bdi`](https://html.spec.whatwg.org/multipage/dom.html#the-dir-attribute) | Known author/language intent; smallest dependency and runtime cost | Heuristic paragraph policy, technical isolation plans, framework/Markdown adapters and shared regression tooling |
| [Android BidiFormatter](https://developer.android.com/reference/androidx/core/text/BidiFormatter) | Established Android plain-text wrapping in a known surrounding context | Paragraph policy and scoped Views/Compose rendering, with explicit source-safe copy constraints |
| [ICU bidi](https://unicode-org.github.io/icu/userguide/transforms/bidi.html) and [FriBidi](https://github.com/fribidi/fribidi) | Implementing bidi layout/reordering in a renderer; ICU also exposes Arabic shaping APIs | Application policy and host integration; BidiLens relies on the host for reordering and shaping |
| [bidi-js](https://github.com/lojjic/bidi-js) | Full Unicode bidi reordering in JavaScript | Integration policy, isolation, streaming and security tooling rather than a replacement UBA engine |
| [markdown-it-bidi](https://github.com/dobidi/markdown-it-bidi) | Simple Markdown `dir="auto"` integration and CommonJS usage | Content-majority policy, technical-token isolation, structured streaming and wider adapters |

The [Unicode higher-level protocol rule HL1](https://unicode.org/reports/tr9/#HL1)
permits heuristic paragraph-base selection, including majority approaches.
Majority inference alone is not a new invention, and it cannot infer every
writer's intention. Respect explicit author choices. BidiLens's value is the
combined source-preserving integration and verification work.

Unicode's [current UAX #9](https://unicode.org/reports/tr9/) is version 18,
published September 1, 2026. BidiLens reproducibly pins Unicode 17. That is a
declared compatibility baseline, not a claim to implement newly added Unicode
18 data. Review data and vectors across every port before an upgrade.

## Production rollout contract

Start with one display component. Specify the fallback/known direction and
physical alignment independently. Keep logical source immutable; test copy,
selection, links/code, streaming completion, hostile input and authored
direction boundaries in the actual host. Measure added work on representative
long messages. Test assistive technologies and keyboard/IME paths that the
product supports. Keep the native/old renderer available as rollback.

Use [limitations](LIMITATIONS.md), [accessibility checks](ACCESSIBILITY.md),
[native HTML decision guidance](NATIVE_OR_BIDILENS.md), and the
[case template](problem-gallery/CASE_TEMPLATE.md) for concrete acceptance.
