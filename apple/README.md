# BidiLens for Apple platforms

The Swift package provides the same offline Unicode direction analysis used by
the web and Android integrations. It supports iOS 15+ and macOS 12+ at the core
API level, with native UIKit adapters for `UILabel`, `UITextView`, and
`UITextField`.

```swift
import BidiLens

let analysis = BidiUIKit.apply(
    to: textView,
    alignment: .physicalLeft
)
```

This keeps an RTL Persian paragraph physically aligned to the left while its
base writing direction remains RTL. Source text and editable selection are
preserved. Pure LTR text in an LTR context remains a strict no-op.

Add the repository as a Swift Package in Xcode and select the `BidiLens`
library. The package intentionally does not force the layout direction of a
screen or mirror unrelated controls.

Run the core example on macOS with:

```bash
swift run BidiLensExample
```

## Current boundary

UIKit has first-class adapters. SwiftUI can use `BidiAnalyzer.presentation`
directly, but a dedicated SwiftUI view is not claimed yet because SwiftUI's
leading/trailing alignment is environment-relative; exact physical-left
alignment plus independent RTL paragraph direction is best rendered with a
UIKit-backed view.

The Swift core inventories bidi formatting controls and flags high-risk
overrides. The richer balance/context diagnostics in the JavaScript and
Android implementations are not yet claimed as Swift parity. UIKit adapters
set block direction and alignment; `formatForDisplay` is an explicit,
display-only inline-isolation option and must never be persisted.
