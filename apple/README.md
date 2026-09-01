# BidiLens for Apple platforms

The Swift package provides the same offline Unicode direction analysis used by
the web and Android integrations. It supports iOS 15+ and macOS 12+ at the core
API level, with native UIKit adapters for `UILabel`, `UITextView`, and
`UITextField` plus a UIKit-backed SwiftUI `BidiText` view.

For SwiftUI AI output and other read-only message text:

```swift
import BidiLens
import SwiftUI

struct MessageBody: View {
    let message: String

    var body: some View {
        BidiText(message, alignment: .physicalLeft) { label in
            label.font = .preferredFont(forTextStyle: .body)
            label.textColor = .label
            label.numberOfLines = 0
        }
        .frame(maxWidth: .infinity)
    }
}
```

`BidiText` keeps its source string unchanged, applies direction only to its
private `UILabel`, and does not change SwiftUI's surrounding
`layoutDirection`. The optional configuration closure runs before BidiLens
assigns the source, so it can style the label but cannot replace the logical
value. Unicode combining marks remain inside their neighboring isolate, and
pure LTR text in an LTR context receives no BidiLens paragraph attributes.

For editable UIKit controls:

```swift
import BidiLens

let analysis = BidiUIKit.apply(
    to: textView,
    alignment: .physicalLeft
)
```

This keeps an RTL Persian paragraph physically aligned to the left while its
base writing direction remains RTL. Source text and editable selection are
preserved.

Editable UIKit adapters adopt observable host changes to `textAlignment` and
base writing direction between calls, then restore those authored values when
intervention ends. If application code intentionally takes ownership with the
same value BidiLens is already rendering, call `BidiUIKit.restore(...)` before
the handoff. When no intervention is required, editable UIKit paragraph state
is left untouched.

Add the repository as a Swift Package in Xcode and select the `BidiLens`
library. The package intentionally does not force the layout direction of a
screen or mirror unrelated controls.

Run the core example on macOS with:

```bash
swift run BidiLensExample
```

## Current boundary

SwiftUI has a first-class read-only `BidiText` renderer. It deliberately uses a
private UIKit label because SwiftUI's leading/trailing alignment is
environment-relative, while the UIKit paragraph model can keep exact
physical-left alignment independent from RTL direction. A generic editable
SwiftUI wrapper is not claimed yet: marked-text composition, dictation,
selection, and third-party IMEs require dedicated validation. Use the UIKit
`UITextView` and `UITextField` adapters for editable integration today.

The Swift core inventories bidi formatting controls and flags high-risk
overrides. The richer balance/context diagnostics in the JavaScript and
Android implementations are not yet claimed as Swift parity. UIKit adapters
set block direction and alignment; `formatForDisplay` is an explicit,
display-only inline-isolation option and must never be persisted.
