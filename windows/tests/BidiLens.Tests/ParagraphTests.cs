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
        foreach (var control in new FrameworkElement[] {
            new TextBlock { Text = "فارسی React" }, new TextBox { Text = "فارسی React" } })
        {
            var host = new StackPanel { FlowDirection = FlowDirection.LeftToRight };
            TextBlock.SetTextAlignment(host, TextAlignment.Left);
            host.Children.Add(control);
            if (control is TextBlock textBlock) BidiWpf.Apply(textBlock, alignment: BidiAlignment.Preserve);
            else BidiWpf.Apply((TextBox)control, alignment: BidiAlignment.Preserve);
            host.FlowDirection = FlowDirection.RightToLeft;
            TextBlock.SetTextAlignment(host, TextAlignment.Center);
            BidiAnalysis updated;
            if (control is TextBlock changedBlock)
            {
                changedBlock.Text = "Plain English";
                updated = BidiWpf.Apply(changedBlock, alignment: BidiAlignment.Preserve);
                Check(changedBlock.TextAlignment == TextAlignment.Center, "TextBlock must adopt current inherited alignment");
                BidiWpf.Restore(changedBlock);
            }
            else
            {
                var changedBox = (TextBox)control;
                changedBox.Text = "Plain English";
                updated = BidiWpf.Apply(changedBox, alignment: BidiAlignment.Preserve);
                Check(changedBox.TextAlignment == TextAlignment.Center, "TextBox must adopt current inherited alignment");
                BidiWpf.Restore(changedBox);
            }
            Check(updated.InterventionRequired, "Current RTL host must still protect English after source replacement");
            Check(control.FlowDirection == FlowDirection.RightToLeft,
                $"{control.GetType().Name}: Restore must follow today's parent direction; actual {control.FlowDirection}, local {control.ReadLocalValue(FrameworkElement.FlowDirectionProperty)}");
            Check(control.ReadLocalValue(FrameworkElement.FlowDirectionProperty) == DependencyProperty.UnsetValue,
                "Restoring an inherited property must not pin a stale local direction");
            host.FlowDirection = FlowDirection.LeftToRight;
            Check(control.FlowDirection == FlowDirection.LeftToRight, "Restored control must continue inheriting parent updates");

            // A host can install a binding with the same effective value as
            // the managed override; ownership must still move to that binding.
            if (control is TextBlock bindingBlock) bindingBlock.Text = "فارسی React";
            else ((TextBox)control).Text = "فارسی React";
            if (control is TextBlock managedBlock) BidiWpf.Apply(managedBlock);
            else BidiWpf.Apply((TextBox)control);
            BindingOperations.SetBinding(control, FrameworkElement.FlowDirectionProperty,
                new Binding(nameof(DirectionSource.Direction)) { Source = new DirectionSource() });
            if (control is TextBlock restoredBlock) BidiWpf.Restore(restoredBlock);
            else BidiWpf.Restore((TextBox)control);
            Check(BindingOperations.IsDataBound(control, FrameworkElement.FlowDirectionProperty),
                "Restore must retain a host-installed control binding with the managed value");
            Check(control.FlowDirection == FlowDirection.RightToLeft, "The host's new binding remains authoritative");
        }
        var styled = new TextBlock { Text = "فارسی React" };
        var originalStyle = new Style(typeof(TextBlock));
        originalStyle.Setters.Add(new Setter(FrameworkElement.FlowDirectionProperty, FlowDirection.LeftToRight));
        originalStyle.Setters.Add(new Setter(TextBlock.TextAlignmentProperty, TextAlignment.Left));
        styled.Style = originalStyle;
        BidiWpf.Apply(styled, alignment: BidiAlignment.Preserve);
        var replacementStyle = new Style(typeof(TextBlock));
        replacementStyle.Setters.Add(new Setter(FrameworkElement.FlowDirectionProperty, FlowDirection.RightToLeft));
        replacementStyle.Setters.Add(new Setter(TextBlock.TextAlignmentProperty, TextAlignment.Center));
        styled.Style = replacementStyle;
        styled.Text = "Plain English";
        Check(BidiWpf.Apply(styled, alignment: BidiAlignment.Preserve).InterventionRequired,
            "A new RTL host style must be considered while a managed override is active");
        Check(styled.TextAlignment == TextAlignment.Center, "Preserve must adopt the current host style's alignment");
        BidiWpf.Restore(styled);
        Check(styled.FlowDirection == FlowDirection.RightToLeft, "Restore must expose the current host style");
        Check(styled.ReadLocalValue(FrameworkElement.FlowDirectionProperty) == DependencyProperty.UnsetValue,
            "A style restoration must not leave a local direction override");
        foreach (var resourceControl in new FrameworkElement[] {
            new TextBlock { Text = "فارسی React" }, new TextBox { Text = "فارسی React" } })
        {
            var alignmentProperty = resourceControl is TextBox
                ? TextBox.TextAlignmentProperty : TextBlock.TextAlignmentProperty;
            resourceControl.Resources["flow"] = FlowDirection.LeftToRight;
            resourceControl.Resources["alignment"] = TextAlignment.Left;
            resourceControl.SetResourceReference(FrameworkElement.FlowDirectionProperty, "flow");
            resourceControl.SetResourceReference(alignmentProperty, "alignment");
            var originalResource = resourceControl.ReadLocalValue(FrameworkElement.FlowDirectionProperty);
            if (resourceControl is TextBlock resourceBlock) BidiWpf.Apply(resourceBlock);
            else BidiWpf.Apply((TextBox)resourceControl);
            resourceControl.Resources["flow"] = FlowDirection.RightToLeft;
            resourceControl.Resources["alignment"] = TextAlignment.Right;
            BidiAnalysis resourceUpdate;
            if (resourceControl is TextBlock updatedResourceBlock)
            {
                updatedResourceBlock.Text = "Plain English";
                resourceUpdate = BidiWpf.Apply(updatedResourceBlock, alignment: BidiAlignment.Preserve);
            }
            else
            {
                var updatedResourceBox = (TextBox)resourceControl;
                updatedResourceBox.Text = "Plain English";
                resourceUpdate = BidiWpf.Apply(updatedResourceBox, alignment: BidiAlignment.Preserve);
            }
            Check(resourceUpdate.InterventionRequired, "Updated dynamic RTL host must still protect English");
            Check(resourceControl.FlowDirection == FlowDirection.LeftToRight, "English keeps its content base in a dynamic RTL host");
            if (resourceControl is TextBlock restoredResourceBlock) BidiWpf.Restore(restoredResourceBlock);
            else BidiWpf.Restore((TextBox)resourceControl);
            Check(resourceControl.FlowDirection == FlowDirection.RightToLeft,
                "Restore must resolve today's dynamic resource, even when it matches the managed direction");
            Check((TextAlignment)resourceControl.GetValue(alignmentProperty) == TextAlignment.Right,
                "Restore must resolve today's alignment dynamic resource");
            Check(ReferenceEquals(originalResource, resourceControl.ReadLocalValue(FrameworkElement.FlowDirectionProperty)),
                "Restore must retain the original shareable resource expression");
            resourceControl.Resources["flow"] = FlowDirection.LeftToRight;
            resourceControl.Resources["alignment"] = TextAlignment.Center;
            Check(resourceControl.FlowDirection == FlowDirection.LeftToRight, "Restored dynamic flow reference must remain live");
            Check((TextAlignment)resourceControl.GetValue(alignmentProperty) == TextAlignment.Center,
                "Restored dynamic alignment reference must remain live");
        }
        var resourceRun = new Run("فارسی React");
        var resourceParagraph = new Paragraph(resourceRun);
        resourceParagraph.Resources["flow"] = FlowDirection.LeftToRight;
        resourceParagraph.Resources["alignment"] = TextAlignment.Left;
        resourceParagraph.SetResourceReference(Paragraph.FlowDirectionProperty, "flow");
        resourceParagraph.SetResourceReference(Paragraph.TextAlignmentProperty, "alignment");
        var originalParagraphResource = resourceParagraph.ReadLocalValue(Paragraph.FlowDirectionProperty);
        BidiWpf.Apply(resourceParagraph);
        resourceParagraph.Resources["flow"] = FlowDirection.RightToLeft;
        resourceParagraph.Resources["alignment"] = TextAlignment.Right;
        resourceRun.Text = "Plain English";
        Check(BidiWpf.Apply(resourceParagraph, alignment: BidiAlignment.Preserve).InterventionRequired,
            "Paragraph analysis must use the current dynamic RTL host");
        Check(resourceParagraph.FlowDirection == FlowDirection.LeftToRight, "Dynamic-host English paragraph base");
        Check(resourceParagraph.TextAlignment == TextAlignment.Right, "Paragraph must adopt current dynamic alignment");
        BidiWpf.Restore(resourceParagraph);
        Check(resourceParagraph.FlowDirection == FlowDirection.RightToLeft, "Paragraph dynamic flow restoration");
        Check(ReferenceEquals(originalParagraphResource, resourceParagraph.ReadLocalValue(Paragraph.FlowDirectionProperty)),
            "Paragraph keeps its original resource expression");
        resourceParagraph.Resources["flow"] = FlowDirection.LeftToRight;
        Check(resourceParagraph.FlowDirection == FlowDirection.LeftToRight, "Paragraph dynamic reference remains live");
        return assertions;
    }
    private sealed class DirectionSource
    {
        public FlowDirection Direction => FlowDirection.RightToLeft;
    }
}
