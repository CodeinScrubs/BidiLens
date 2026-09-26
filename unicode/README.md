# Unicode data

BidiLens pins the Unicode Character Database at **Unicode 17.0.0**. The
runtime table in `packages/core/src/generated/bidi-ranges.ts` is generated
from the Unicode Consortium's `DerivedBidiClass.txt` and
`DerivedGeneralCategory.txt`; it is not maintained by hand. Bidi classes drive
strict strong-character behavior, while pinned general categories identify
natural-language letters and `Mn`/`Mc`/`Me` combining marks without depending
on a host runtime's Unicode version.

Unicode 17 remains the reproducible release baseline; it is not a claim to
track the latest Unicode release. Upgrade through the pinned-file, checksum,
native-port, and conformance review process below rather than silently
following host-runtime Unicode changes.

Inline isolation additionally uses Unicode 17 extended grapheme boundaries
([UAX #29 revision 47](https://www.unicode.org/reports/tr29/tr29-47.html)).
`scripts/generate-grapheme-data.ts` pins SHA-256 hashes for
`GraphemeBreakProperty`, `DerivedCoreProperties` (Indic conjunct properties),
`emoji-data` (extended pictographic properties), and `GraphemeBreakTest`.
The official grapheme test vectors run in the core test suite. Normal
generation and checks are offline. An explicit `--download` on this generator
fetches only these exact pinned files and rejects any checksum mismatch before
writing each file; it never updates version or checksum pins automatically.

The source file and generated table are checked into the repository so normal
builds and runtime analysis are offline. To verify them:

```bash
pnpm unicode:check
```

To reproduce the generated table from the vendored source:

```bash
pnpm unicode:generate
```

To deliberately refresh the pinned upstream files, download both exact source
URLs shown in `scripts/generate-bidi-data.ts` outside this repository, verify
their expected SHA-256 values, replace only the two vendored files, then update
the version and hashes in the generator. The generator deliberately has no
network-to-filesystem mode. Review with:

```bash
pnpm unicode:generate
git diff -- unicode \
  packages/core/src/generated/bidi-ranges.ts \
  android/core/src/main/kotlin/io/github/codeinscrubs/bidilens/core/generated/BidiRanges.kt \
  apple/Sources/BidiLens/Generated/BidiRanges.swift \
  windows/src/BidiLens.Core/Generated/BidiRanges.cs \
  rust/src/generated/bidi_ranges.rs
pnpm run check
```

Review every generated range diff and add regression cases for newly assigned
letters and RTL scripts before merging an upgrade. Unicode data is used under the
[Unicode Terms of Use](https://www.unicode.org/terms_of_use.html).
