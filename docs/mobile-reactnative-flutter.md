# Bidirectional Mobile Development: React Native & Flutter

## Overview

Cross-platform mobile frameworks provide built-in primitives for Right-to-Left (RTL) mirroring, but require proper integration to handle dynamic, user-generated content seamlessly.

---

## 1. React Native

In React Native:
- **Application-wide layout:** Handled via `I18nManager.forceRTL(true)` (requires app reload on iOS/Android).
- **Per-message dynamic content:** Use `@bidilens/core` to dynamically assign `writingDirection`:

```tsx
import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { detectDirection } from '@bidilens/core';

export function DynamicBidiMessage({ content }: { content: string }) {
  const dir = detectDirection(content);
  return (
    <View style={dir === 'rtl' ? styles.bubbleRtl : styles.bubbleLtr}>
      <Text style={{ writingDirection: dir === 'rtl' ? 'rtl' : 'ltr', textAlign: dir === 'rtl' ? 'right' : 'left' }}>
        {content}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubbleRtl: { alignSelf: 'flex-end', backgroundColor: '#e1ffc7' },
  bubbleLtr: { alignSelf: 'flex-start', backgroundColor: '#ffffff' }
});
```

---

## 2. Flutter

In Flutter, wrap dynamic message trees with the `Directionality` widget:

```dart
Directionality(
  textDirection: isRtl ? TextDirection.rtl : TextDirection.ltr,
  child: Text(
    messageText,
    textAlign: isRtl ? TextAlign.right : TextAlign.left,
  ),
)
```
