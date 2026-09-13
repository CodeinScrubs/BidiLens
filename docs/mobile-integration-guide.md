<!-- SPDX-License-Identifier: Apache-2.0 -->
# Mobile Integration Guide: iOS, Android, and React Native

## Overview

BidiLens provides first-class native SDKs for iOS (Swift/SwiftUI/UIKit), Android (Kotlin/Jetpack Compose), and React Native, ensuring that bidirectional text isolation rules remain 100% consistent across web and mobile apps.

---

## 1. Swift & iOS (SwiftUI / UIKit)

### SwiftUI
```swift
import BidiLens
import SwiftUI

struct MessageView: View {
    let content: String

    var body: some View {
        BidiText(content)
            .padding()
    }
}
```

### UIKit
```swift
import BidiLens
import UIKit

let label = UILabel()
label.setBidiText("متن فارسی با شناسه API_KEY_123")
```

---

## 2. Android (Kotlin / Jetpack Compose)

```kotlin
import androidx.compose.runtime.Composable
import io.github.codeinscrubs.bidilens.compose.BidiText

@Composable
fun MessageBubble(text: String) {
    BidiText(text = text)
}
```

---

## 3. Copy-Safe Text Selection

On native mobile devices, inserting Unicode formatting controls directly into user-selectable text can corrupt clipboard copies. BidiLens native adapters provide display-only isolation while preserving raw, unformatted source text on clipboard copy.
