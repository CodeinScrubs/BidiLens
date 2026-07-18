# Unicode data

BidiLens pins the Unicode Character Database at **Unicode 17.0.0**. The
runtime table in `packages/core/src/generated/bidi-ranges.ts` is generated
from the Unicode Consortium's `DerivedBidiClass.txt` and
`DerivedGeneralCategory.txt`; it is not maintained by hand. Bidi classes drive
strict strong-character behavior, while pinned general categories identify
natural-language letters without depending on the host JavaScript runtime's
Unicode version.

The source file and generated table are checked into the repository so normal
builds and runtime analysis are offline. To verify them:

```bash
pnpm unicode:check
```

To reproduce the generated table from the vendored source:

```bash
pnpm unicode:generate
```

To deliberately refresh the pinned upstream file, first update the version,
URLs, and both expected SHA-256 values in `scripts/generate-bidi-data.ts`, then run:

```bash
pnpm unicode:download
git diff -- unicode packages/core/src/generated/bidi-ranges.ts
pnpm run check
```

Review every generated range diff and add regression cases for newly assigned
letters and RTL scripts before merging an upgrade. Unicode data is used under the
[Unicode Terms of Use](https://www.unicode.org/terms_of_use.html).
