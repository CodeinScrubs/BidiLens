# BidiLens for Windows

The Windows implementation contains an offline `net8.0` core and a
`net8.0-windows` WPF adapter. It uses generated Unicode 17 tables and the same
canonical corpus as the web and Android implementations.

```csharp
var analysis = BidiWpf.Apply(
    messageTextBlock,
    alignment: BidiAlignment.PhysicalLeft);
```

`FlowDirection` remains `RightToLeft` for Persian-majority text while
`TextAlignment` can remain physically left. The WPF adapter does not change
`TextBlock.Text` or `TextBox.Text`, and preserves `TextBox` selection.
Unicode combining marks remain attached to their neighboring grapheme when
mixed-direction runs are isolated.
It applies dependency properties without detaching existing WPF bindings and
adopts observable host changes made while a control is managed. Call
`BidiWpf.Restore(control)` before intentionally handing off a property with the
same value BidiLens is currently rendering.

Run:

```powershell
dotnet build windows/tests/BidiLens.Tests/BidiLens.Tests.csproj
dotnet run --project windows/tests/BidiLens.Tests/BidiLens.Tests.csproj
dotnet run --project windows/samples/BidiLens.Wpf.Sample
```

The executable test project covers the canonical direction corpus, source and
selection preservation, pure-LTR non-interference, and independent physical
alignment, adapter ownership, and WPF binding preservation. WinUI 3, Windows
Forms, MAUI, and accessibility laboratory testing remain separate
host-specific work; the pure core can be consumed by them without taking a
WPF dependency.

The .NET core inventories bidi formatting controls and flags high-risk
overrides. The richer balance/context diagnostics in the JavaScript and
Android implementations are not yet claimed as .NET parity. WPF adapters set
block direction and alignment; `BidiAnalyzer.FormatForDisplay` is an explicit,
display-only inline-isolation option and must never be persisted or applied to
editable source.
