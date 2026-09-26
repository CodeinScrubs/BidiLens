using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Data;
using BidiLens;
using BidiLens.Wpf;

internal static class ParagraphTests
{
    public static int Run()
    {
        var assertions = 0;
        void Check(bool condition, string message)
        {
            assertions++;
            if (!condition) throw new InvalidOperationException(message);
        }
        var rtl = new Paragraph(new Run("سلام دنیا")) { TextAlignment = TextAlignment.Left };
        var ltr = new Paragraph(new Run("Plain English")) { TextAlignment = TextAlignment.Center };
        var nested = new Paragraph(new Run("فارسی React"));
        var document = new FlowDocument();
        document.Blocks.Add(rtl);
        document.Blocks.Add(ltr);
        document.Blocks.Add(new Section(nested));
        var box = new RichTextBox(document) { FlowDirection = FlowDirection.LeftToRight };
        var before = new TextRange(document.ContentStart, document.ContentEnd).Text;
        box.Selection.Select(rtl.ContentStart.GetPositionAtOffset(1)!, ltr.ContentEnd);
        var start = box.Selection.Start;
        var end = box.Selection.End;
        var result = BidiWpf.Apply(box, alignment: BidiAlignment.PhysicalLeft);
        Check(result.Count == 3, "Nested document paragraphs must be analyzed");
        Check(rtl.FlowDirection == FlowDirection.RightToLeft, "Persian paragraph base");
        Check(ltr.FlowDirection == FlowDirection.LeftToRight, "Independent English paragraph base");
        Check(nested.FlowDirection == FlowDirection.RightToLeft,
            $"Nested Persian paragraph base: {result[2].Text}, {result[2].ResolvedDirection}, {result[2].Counts}; "
            + $"actual={nested.FlowDirection}, local={nested.ReadLocalValue(Paragraph.FlowDirectionProperty)}, "
            + $"source={DependencyPropertyHelper.GetValueSource(nested, Paragraph.FlowDirectionProperty).BaseValueSource}, "
            + $"same={ReferenceEquals(nested, ((Section)document.Blocks.LastBlock).Blocks.FirstBlock)}");
        Check(rtl.TextAlignment == TextAlignment.Left, "RTL paragraph can be physically left aligned");
        Check(ltr.TextAlignment == TextAlignment.Center, "LTR paragraph in LTR host is a strict no-op");
        Check(box.FlowDirection == FlowDirection.LeftToRight, "RichTextBox shell must not be flipped");
        Check(new TextRange(document.ContentStart, document.ContentEnd).Text == before, "Document source preservation");
        Check(box.Selection.Start.CompareTo(start) == 0 && box.Selection.End.CompareTo(end) == 0,
            "Selection pointers must survive direction changes");
        rtl.TextAlignment = TextAlignment.Justify;
        BidiWpf.Apply(rtl, alignment: BidiAlignment.Preserve);
        Check(rtl.TextAlignment == TextAlignment.Justify, "Host paragraph alignment must be adopted");
        BidiWpf.Restore(box);
        Check(rtl.FlowDirection == FlowDirection.LeftToRight, "Paragraph direction restoration");
        Check(rtl.TextAlignment == TextAlignment.Justify, "Restore must preserve host edits");
        Check(ltr.TextAlignment == TextAlignment.Center, "Restore must leave unmanaged paragraph alone");
        Check(new TextRange(document.ContentStart, document.ContentEnd).Text == before, "Restore cannot rewrite source");

        var rtlHost = new TextBlock { Text = "Plain English", FlowDirection = FlowDirection.RightToLeft };
        BidiWpf.Apply(rtlHost, alignment: BidiAlignment.Preserve);
        Check(rtlHost.FlowDirection == FlowDirection.LeftToRight, "Default options must detect an RTL host");
        BidiWpf.Restore(rtlHost);
        Check(rtlHost.FlowDirection == FlowDirection.RightToLeft, "Authored RTL host restoration");
        var inherited = new Paragraph(new Run("Plain English"));
        var rtlDocument = new FlowDocument(inherited) { FlowDirection = FlowDirection.RightToLeft };
        BidiWpf.Apply(inherited, alignment: BidiAlignment.Preserve);
        Check(inherited.FlowDirection == FlowDirection.LeftToRight, "Paragraph must honor inherited RTL host");
        BidiWpf.Restore(inherited);
        Check(inherited.FlowDirection == FlowDirection.RightToLeft, "Inherited paragraph direction restoration");
        GC.KeepAlive(rtlDocument);
        var managedBinding = new Paragraph(new Run("سلام"));
        BidiWpf.Apply(managedBinding);
        BindingOperations.SetBinding(managedBinding, Paragraph.FlowDirectionProperty,
            new Binding(nameof(DirectionSource.Direction)) { Source = new DirectionSource() });
        BidiWpf.Restore(managedBinding);
        Check(BindingOperations.IsDataBound(managedBinding, Paragraph.FlowDirectionProperty),
            "A host-installed binding with the rendered value must survive restore");
        Check(managedBinding.FlowDirection == FlowDirection.RightToLeft, "Host binding value must survive restore");
        var changingRun = new Run("فارسی");
        var changingParagraph = new Paragraph(changingRun);
        var changingDocument = new FlowDocument(changingParagraph);
        BidiWpf.Apply(changingParagraph);
        changingDocument.FlowDirection = FlowDirection.RightToLeft;
        changingDocument.TextAlignment = TextAlignment.Center;
        changingRun.Text = "Plain English";
        var changed = BidiWpf.Apply(changingParagraph, alignment: BidiAlignment.Preserve);
        Check(changed.InterventionRequired, "Inherited host change must refresh intervention gate");
        Check(changingParagraph.FlowDirection == FlowDirection.LeftToRight, "English must remain LTR in newly RTL host");
        Check(changingParagraph.TextAlignment == TextAlignment.Center, "Inherited alignment change must be adopted");
        BidiWpf.Restore(changingParagraph);
        Check(changingParagraph.FlowDirection == FlowDirection.RightToLeft, "Restore must follow current inherited host");
        Check(changingParagraph.ReadLocalValue(Paragraph.FlowDirectionProperty) == DependencyProperty.UnsetValue,
            "Restore must reinstate inheritance, not a stale local snapshot");
        return assertions;
    }
    private sealed class DirectionSource
    {
        public FlowDirection Direction => FlowDirection.RightToLeft;
    }
}
