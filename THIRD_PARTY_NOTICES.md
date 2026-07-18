# Third-party notices

## Unicode Character Database

BidiLens vendors `DerivedBidiClass-17.0.0.txt` and
`DerivedGeneralCategory-17.0.0.txt` from the Unicode Character Database and
generates runtime range tables from them.

Copyright © 1991–2025 Unicode, Inc. All rights reserved. Distributed under the
Unicode Terms of Use. Unicode and the Unicode Logo are registered trademarks
of Unicode, Inc. in the United States and other countries.

Source: `https://www.unicode.org/Public/17.0.0/ucd/extracted/DerivedBidiClass.txt`

Source: `https://www.unicode.org/Public/17.0.0/ucd/extracted/DerivedGeneralCategory.txt`

Terms: `https://www.unicode.org/terms_of_use.html`

The vendored source retains its upstream header. BidiLens's MIT license applies
to original project code and does not replace the Unicode data terms.

## JavaScript dependencies

Runtime and development dependencies retain their own licenses. Exact versions
are recorded in `pnpm-lock.yaml`; `pnpm run sbom` produces a validated
CycloneDX inventory for the release commit. This project does not copy their
source into its package outputs except as permitted by their licenses and the
build configuration.
