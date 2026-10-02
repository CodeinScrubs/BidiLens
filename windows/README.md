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
Apply and restore on the control's owning UI thread, as with other WPF property changes.
Unicode combining marks remain attached to their neighboring grapheme when
mixed-direction runs are isolated.
It applies dependency properties without detaching existing WPF bindings and
adopts observable host changes made while a control is managed. Call
`BidiWpf.Restore(control)` before intentionally handing off a property with the
same value BidiLens is currently rendering.

Originally inherited or styled control properties use reversible local overrides;
restoration removes those overrides rather than pinning an old parent value.
The next source release refreshes changed parent/style baselines and dynamic
resources before analysis or restoration, while retaining local bindings and
the original shareable resource expressions. A same-valued literal host write
to an already local managed override cannot identify a new owner: call `Restore`
before that intentional handoff. Tests do not establish real editor/IME or
Windows screen-reader acceptance.

## Independent document paragraphs (next source release)

Use a `RichTextBox`/`FlowDocument` when English and Persian paragraphs share
one control:

```csharp
var paragraphs = BidiWpf.Apply(messageRichTextBox,
    alignment: BidiAlignment.PhysicalLeft);
// Also supported: BidiWpf.Apply(oneParagraph, ...).
BidiWpf.Restore(messageRichTextBox);
```

Each `Paragraph` gets its own base direction, including paragraphs inside
sections, lists, and table cells. The control's shell direction, logical runs,
and selection pointers are not rewritten. Default options use the current
authored/inherited host direction; explicit `BidiOptions` remain authoritative.
Originally inherited paragraph properties return to inheritance on restoration,
and observable host binding/property changes are adopted. As with other
controls, call `Restore` before a deliberate same-value scalar ownership handoff.

`TextBlock` and plain `TextBox` integrations still apply one whole-control
direction. They cannot express an independent content-majority base for each
paragraph; BidiLens does not silently replace these controls. Windows Forms,
WinUI, and MAUI remain separate integrations, not WPF-compatible adapters.

Native isolation currently retains combining marks, not the complete pinned
extended-grapheme implementation added to the JavaScript core. Do not treat
native and JavaScript grapheme handling as fully equivalent yet.

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

The source core exposes `BidiAnalyzer.ScanSecurity(text, BidiSecurityMode.Warn)`
for control inventory, paragraph-scoped balance checks, hidden-character
diagnostics, UTF-16/code-point ranges, and advisory blocking decisions. See the
[native security guide](../docs/NATIVE_SECURITY.md) for modes and limitations.
WPF adapters set block direction and alignment; `BidiAnalyzer.FormatForDisplay` is an explicit,
display-only inline-isolation option and must never be persisted or applied to
editable source.
