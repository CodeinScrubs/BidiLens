# BidiLens for native Android

BidiLens Android fixes mixed Persian/Arabic/Hebrew and English text at the
native rendering boundary. It uses the same Unicode 17 data, content-majority
policy, technical-token rules, security scanner, and 932-case canonical corpus
as the JavaScript packages.

The Android implementation has three small libraries:

| Module | Minimum SDK | Purpose |
|---|---:|---|
| `:core` | 21 | Pure Kotlin analysis, isolation planning, Unicode data, and control auditing |
| `:views` | 21 | Non-destructive `TextView` and `EditText` integration |
| `:compose` | 23 | `BidiText`, `BidiBasicTextField`, styles, semantics, and offset-safe visual isolation |

The `:sample` application reproduces the photographed form-field, mixed-label,
and leading-English cases. The project builds with JDK 21, Gradle 9.5.0,
Android Gradle Plugin 9.3.1, compile SDK 36, and Kotlin 2.4.10.

## Safety contract

- Logical source strings are never reversed.
- Unicode combining marks remain attached to their neighboring grapheme during
  inline isolation.
- Editable values never receive bidi controls.
- Compose isolation is a visual transformation with monotonic cursor offsets.
- Non-editable accessibility semantics expose the original source, not the
  display-only controls.
- Ordinary LTR text in an LTR host is an exact metadata/style no-op.
- View state is saved only when intervention is needed and restored when the
  value becomes ordinary LTR or a controller detaches.
- BidiLens changes text direction and content-edge alignment, not the
  application or screen layout direction.

## Use with Jetpack Compose

Version `0.1.1` is signed and public on Maven Central. Normal Gradle setup is:

```kotlin
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
    }
}

dependencies {
    implementation("io.github.codeinscrubs.bidilens:bidilens-android-compose:0.1.1")
}
```

The other coordinates are
`io.github.codeinscrubs.bidilens:bidilens-core:0.1.1` and
`io.github.codeinscrubs.bidilens:bidilens-android-views:0.1.1`. Choose the
surface used by the application; adapter dependencies bring in the core
transitively.

For source-checkout development, publish the current modules to Maven Local:

```bash
./android/gradlew -p android publishToMavenLocal
```

Then add:

```kotlin
dependencies {
    implementation("io.github.codeinscrubs.bidilens:bidilens-android-compose:0.1.1")
}
```

Use `BidiText` for display and `BidiBasicTextField` for editable values:

```kotlin
var value by remember { mutableStateOf("از جلد سه qb، page 97") }

BidiBasicTextField(
    value = value,
    onValueChange = { value = it },
)

BidiText("React یک کتابخانه جاوااسکریپت بسیار محبوب است.")
```

The rest of the screen can remain LTR. Each value is analyzed independently.
For pure English content, the original `TextStyle` instance and unmodified
modifier path are retained.

Direction does not force alignment. To keep a Persian paragraph physically on
the left while still applying an RTL paragraph base:

```kotlin
BidiText(
    text = "این پاراگراف فارسی چپ‌چین می‌ماند.",
    style = TextStyle(textAlign = TextAlign.Left),
    alignToContent = false,
)
```

## Use with Android Views

Android Views require the normal application-level RTL capability flag. Add
this once to the host application's manifest:

```xml
<application
    android:supportsRtl="true"
    ... />
```

BidiLens does not merge that flag from its library manifest because it can
affect unrelated layouts. Apps can verify their configuration with
`context.supportsBidiLensRtl()`.

For a displayed value:

```kotlin
titleTextView.text = source
titleTextView.applyBidiLens()
```

To preserve an authored physical-left alignment:

```kotlin
titleTextView.gravity = Gravity.LEFT
titleTextView.applyBidiLens(alignToContent = false)
```

Switching `alignToContent` from `true` to `false` restores the original
alignment/gravity immediately while retaining the detected text direction.
Observable application changes to direction, alignment, or gravity made while
a view is managed become its new authored state. Before deliberately taking
ownership with the same value BidiLens is currently rendering, call
`titleTextView.restoreBidiLens()` and then apply the application value.

For an editable field:

```kotlin
val controller = BidiEditTextController.attach(editText)

// Dispose with the view/lifecycle owner.
controller.detach()
```

`applyBidiLens()` never changes `TextView.text`. When a display-only string
needs explicit inline isolation, use `setBidiDisplayText(source)` and continue
to persist/search the original `source`.

For labels assembled from separate semantic values:

```kotlin
val label = BidiTextBuilder(BidiDirection.LTR)
    .appendLiteral("Next: ")
    .appendFragment("۷ مرداد ۱۴۰۵")
    .toString()
```

## Direction policy

The default is content majority after excluding recognized technical tokens.
That deliberately differs from Android/Compose first-strong behavior:

```text
React یک کتابخانه جاوااسکریپت بسیار محبوب است.
```

The paragraph resolves RTL and `React` remains an isolated LTR fragment.
First-strong, strict UAX #9 base selection, inherited, explicit LTR/RTL,
threshold, fallback, and caller-specific identifier options are also exposed
through `BidiOptions`.

## Verification

```bash
pnpm run corpus:check
pnpm run android:check
./android/gradlew -p android \
  :views:connectedDebugAndroidTest \
  :compose:connectedDebugAndroidTest
```

Current executable evidence includes:

- all 932 canonical direction fixtures and declared isolation plans in Kotlin;
- 29 core, 11 Views/Robolectric, and 9 Compose JVM tests;
- 3 Views and 3 Compose UI tests on an Android 16/API 36.1 emulator;
- release AAR assembly, sample APK assembly, and Android lint;
- an isolated consumer build against the generated Maven-local coordinates;
- CI builds plus an API 35 hardware-accelerated emulator gate.

## Distribution status

Version `0.1.1` is publicly available from Maven Central as three signed
modules. After publication, all 15 primary artifacts were downloaded and
matched byte-for-byte against the protected workflow outputs; all detached
signatures and published checksums verified; and a clean Gradle consumer with
an empty Maven Local resolved all three coordinates and built successfully.
The immutable
[`android-v0.1.1` GitHub release](https://github.com/CodeinScrubs/BidiLens/releases/tag/android-v0.1.1)
retains the individual AARs, sample APK, Maven repository, public Central
evidence, public signing key, and SHA-256 checksums. The older
[`android-v0.1.0` GitHub release](https://github.com/CodeinScrubs/BidiLens/releases/tag/android-v0.1.0)
remains available only as the immutable pre-Central archive. Source checkout
and `publishToMavenLocal` remain supported. The npm packages are a separate
JavaScript/web distribution.

See the repository [limitations](../docs/LIMITATIONS.md), [architecture](../docs/ARCHITECTURE.md),
and [security policy](../SECURITY.md) before production rollout.
