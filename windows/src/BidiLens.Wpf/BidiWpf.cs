using System.Runtime.CompilerServices;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Data;

namespace BidiLens.Wpf;

public static class BidiWpf
{
    private sealed class ManagedState(FlowDirection flowDirection, TextAlignment textAlignment)
    {
        public FlowDirection OriginalFlowDirection { get; set; } = flowDirection;
        public TextAlignment OriginalTextAlignment { get; set; } = textAlignment;
        public FlowDirection? RenderedFlowDirection { get; set; }
        public TextAlignment? RenderedTextAlignment { get; set; }
        public object OriginalFlowLocalValue { get; set; } = DependencyProperty.UnsetValue;
        public object OriginalAlignmentLocalValue { get; set; } = DependencyProperty.UnsetValue;
        public object? RenderedFlowLocalValue { get; set; }
        public object? RenderedAlignmentLocalValue { get; set; }
        public ValueSource? RenderedFlowValueSource { get; set; }
        public ValueSource? RenderedAlignmentValueSource { get; set; }
    }

    private static readonly ConditionalWeakTable<FrameworkElement, ManagedState> ManagedStates = new();
    private static readonly ConditionalWeakTable<Paragraph, ManagedState> ParagraphStates = new();

    public static BidiAnalysis Apply(
        TextBlock control,
        BidiOptions? options = null,
        BidiAlignment alignment = BidiAlignment.ContentStart)
    {
        var analysis = BidiAnalyzer.Analyze(control.Text ?? string.Empty, OptionsFor(control, options));
        Apply(
            control,
            analysis,
            alignment,
            value => control.SetCurrentValue(TextBlock.TextAlignmentProperty, value));
        return analysis;
    }

    public static BidiAnalysis Apply(
        TextBox control,
        BidiOptions? options = null,
        BidiAlignment alignment = BidiAlignment.ContentStart)
    {
        var analysis = BidiAnalyzer.Analyze(control.Text ?? string.Empty, OptionsFor(control, options));
        var selectionStart = control.SelectionStart;
        var selectionLength = control.SelectionLength;
        Apply(
            control,
            analysis,
            alignment,
            value => control.SetCurrentValue(TextBox.TextAlignmentProperty, value));
        control.Select(selectionStart, selectionLength);
        return analysis;
    }

    /// <summary>Restores authored properties and ends the managed session.</summary>
    public static void Restore(TextBlock control) => Restore(
        control,
        value => control.SetCurrentValue(TextBlock.TextAlignmentProperty, value));

    /// <summary>Restores authored properties and ends the managed session.</summary>
    public static void Restore(TextBox control) => Restore(
        control,
        value => control.SetCurrentValue(TextBox.TextAlignmentProperty, value));

    /// <summary>Manages one document paragraph without rewriting any runs or source text.</summary>
    public static BidiAnalysis Apply(
        Paragraph paragraph,
        BidiOptions? options = null,
        BidiAlignment alignment = BidiAlignment.ContentStart)
    {
        ParagraphStates.TryGetValue(paragraph, out var state);
        if (state is not null)
        {
            ReconcileParagraphChanges(paragraph, state);
            RefreshInheritedParagraphState(paragraph, state);
        }
        var inherited = state?.OriginalFlowDirection ?? paragraph.FlowDirection;
        var analysis = BidiAnalyzer.Analyze(
            new TextRange(paragraph.ContentStart, paragraph.ContentEnd).Text,
            options ?? new BidiOptions { InheritedDirection = Direction(inherited) });
        if (!analysis.InterventionRequired)
        {
            Restore(paragraph);
            return analysis;
        }
        if (state is null)
        {
            state = new(paragraph.FlowDirection, paragraph.TextAlignment);
            state.OriginalFlowLocalValue = paragraph.ReadLocalValue(Paragraph.FlowDirectionProperty);
            state.OriginalAlignmentLocalValue = paragraph.ReadLocalValue(Paragraph.TextAlignmentProperty);
            ParagraphStates.Add(paragraph, state);
        }
        SetParagraphValue(paragraph, Paragraph.TextAlignmentProperty,
            Alignment(alignment, analysis.ResolvedDirection, state.OriginalTextAlignment), state.OriginalAlignmentLocalValue);
        SetParagraphValue(paragraph, Paragraph.FlowDirectionProperty,
            analysis.ResolvedDirection == BidiDirection.RightToLeft
                ? FlowDirection.RightToLeft : FlowDirection.LeftToRight, state.OriginalFlowLocalValue);
        state.RenderedTextAlignment = paragraph.TextAlignment;
        state.RenderedFlowDirection = paragraph.FlowDirection;
        state.RenderedAlignmentLocalValue = paragraph.ReadLocalValue(Paragraph.TextAlignmentProperty);
        state.RenderedFlowLocalValue = paragraph.ReadLocalValue(Paragraph.FlowDirectionProperty);
        state.RenderedFlowValueSource = DependencyPropertyHelper.GetValueSource(paragraph, Paragraph.FlowDirectionProperty);
        state.RenderedAlignmentValueSource = DependencyPropertyHelper.GetValueSource(paragraph, Paragraph.TextAlignmentProperty);
        return analysis;
    }

    /// <summary>Applies independent bases to paragraphs, including nested lists, sections and tables.
    /// Does not change the RichTextBox shell direction, document content or selection.</summary>
    public static IReadOnlyList<BidiAnalysis> Apply(
        RichTextBox control,
        BidiOptions? options = null,
        BidiAlignment alignment = BidiAlignment.ContentStart) =>
        Paragraphs(control.Document.Blocks).Select(paragraph => Apply(paragraph, options, alignment)).ToArray();

    public static void Restore(Paragraph paragraph)
    {
        if (!ParagraphStates.TryGetValue(paragraph, out var state)) return;
        ReconcileParagraphChanges(paragraph, state);
        RestoreParagraphValue(paragraph, Paragraph.TextAlignmentProperty,
            state.OriginalTextAlignment, state.OriginalAlignmentLocalValue);
        RestoreParagraphValue(paragraph, Paragraph.FlowDirectionProperty,
            state.OriginalFlowDirection, state.OriginalFlowLocalValue);
        ParagraphStates.Remove(paragraph);
    }

    public static void Restore(RichTextBox control)
    {
        foreach (var paragraph in Paragraphs(control.Document.Blocks)) Restore(paragraph);
    }

    private static IEnumerable<Paragraph> Paragraphs(BlockCollection blocks)
    {
        foreach (var block in blocks)
        {
            if (block is Paragraph paragraph) yield return paragraph;
            else
            {
                IEnumerable<BlockCollection> children = block switch
                {
                    Section section => [section.Blocks],
                    List list => list.ListItems.Select(item => item.Blocks),
                    Table table => table.RowGroups.SelectMany(group => group.Rows)
                        .SelectMany(row => row.Cells).Select(cell => cell.Blocks),
                    _ => [],
                };
                foreach (var child in children)
                    foreach (var descendant in Paragraphs(child)) yield return descendant;
            }
        }
    }

    private static void ReconcileParagraphChanges(Paragraph paragraph, ManagedState state)
    {
        if (state.RenderedTextAlignment is { } alignment
            && (paragraph.TextAlignment != alignment
                || DependencyPropertyHelper.GetValueSource(paragraph, Paragraph.TextAlignmentProperty) != state.RenderedAlignmentValueSource
                || !Equals(paragraph.ReadLocalValue(Paragraph.TextAlignmentProperty), state.RenderedAlignmentLocalValue)))
        {
            state.OriginalTextAlignment = paragraph.TextAlignment;
            state.OriginalAlignmentLocalValue = paragraph.ReadLocalValue(Paragraph.TextAlignmentProperty);
        }
        if (state.RenderedFlowDirection is { } direction
            && (paragraph.FlowDirection != direction
                || DependencyPropertyHelper.GetValueSource(paragraph, Paragraph.FlowDirectionProperty) != state.RenderedFlowValueSource
                || !Equals(paragraph.ReadLocalValue(Paragraph.FlowDirectionProperty), state.RenderedFlowLocalValue)))
        {
            state.OriginalFlowDirection = paragraph.FlowDirection;
            state.OriginalFlowLocalValue = paragraph.ReadLocalValue(Paragraph.FlowDirectionProperty);
        }
    }

    private static void SetParagraphValue(Paragraph paragraph, DependencyProperty property, object value, object originalLocal)
    {
        // A current value on a purely inherited content-element property is
        // discarded by WPF text-container invalidations. Use a reversible local
        // override in that case; retain expressions/bindings when already local.
        if (originalLocal == DependencyProperty.UnsetValue) paragraph.SetValue(property, value);
        else paragraph.SetCurrentValue(property, value);
    }

    private static void RefreshInheritedParagraphState(Paragraph paragraph, ManagedState state)
    {
        // Managed local overrides mask parent changes. Briefly remove only
        // properties which were originally inherited to read today's baseline.
        // Never clear a host-installed binding or other local expression.
        if (state.OriginalFlowLocalValue == DependencyProperty.UnsetValue)
        {
            var rendered = paragraph.FlowDirection;
            paragraph.ClearValue(Paragraph.FlowDirectionProperty);
            state.OriginalFlowDirection = paragraph.FlowDirection;
            paragraph.SetValue(Paragraph.FlowDirectionProperty, rendered);
        }
        else
        {
            var rendered = paragraph.FlowDirection;
            if (RefreshResourceReference(paragraph, Paragraph.FlowDirectionProperty, state.OriginalFlowLocalValue))
            {
                state.OriginalFlowDirection = paragraph.FlowDirection;
                paragraph.SetCurrentValue(Paragraph.FlowDirectionProperty, rendered);
            }
        }
        if (state.OriginalAlignmentLocalValue == DependencyProperty.UnsetValue)
        {
            var rendered = paragraph.TextAlignment;
            paragraph.ClearValue(Paragraph.TextAlignmentProperty);
            state.OriginalTextAlignment = paragraph.TextAlignment;
            paragraph.SetValue(Paragraph.TextAlignmentProperty, rendered);
        }
        else
        {
            var rendered = paragraph.TextAlignment;
            if (RefreshResourceReference(paragraph, Paragraph.TextAlignmentProperty, state.OriginalAlignmentLocalValue))
            {
                state.OriginalTextAlignment = paragraph.TextAlignment;
                paragraph.SetCurrentValue(Paragraph.TextAlignmentProperty, rendered);
            }
        }
    }

    private static void RestoreParagraphValue(Paragraph paragraph, DependencyProperty property, object value, object originalLocal)
    {
        if (originalLocal == DependencyProperty.UnsetValue) paragraph.ClearValue(property);
        else if (!RefreshResourceReference(paragraph, property, originalLocal)) paragraph.SetCurrentValue(property, value);
    }

    private static BidiOptions OptionsFor(FrameworkElement control, BidiOptions? options)
    {
        if (options is not null) return options;
        ManagedStates.TryGetValue(control, out var state);
        if (state is not null)
        {
            ReconcileHostChanges(control, state);
            RefreshInheritedControlState(control, state);
        }
        return new BidiOptions { InheritedDirection = Direction(state?.OriginalFlowDirection ?? control.FlowDirection) };
    }

    private static BidiDirection Direction(FlowDirection direction) =>
        direction == FlowDirection.RightToLeft ? BidiDirection.RightToLeft : BidiDirection.LeftToRight;

    private static TextAlignment Alignment(BidiAlignment alignment, BidiDirection direction, TextAlignment original) =>
        alignment switch
        {
            BidiAlignment.Preserve => original,
            BidiAlignment.ContentStart => direction == BidiDirection.RightToLeft ? TextAlignment.Right : TextAlignment.Left,
            BidiAlignment.PhysicalLeft => TextAlignment.Left,
            BidiAlignment.PhysicalRight => TextAlignment.Right,
            BidiAlignment.Center => TextAlignment.Center,
            BidiAlignment.Justify => TextAlignment.Justify,
            _ => original,
        };

    private static void Apply(
        FrameworkElement control,
        BidiAnalysis analysis,
        BidiAlignment alignment,
        Action<TextAlignment> setAlignment)
    {
        if (!analysis.InterventionRequired)
        {
            Restore(control, setAlignment);
            return;
        }
        if (!ManagedStates.TryGetValue(control, out var state))
        {
            state = new(control.FlowDirection, GetAlignment(control));
            state.OriginalFlowLocalValue = control.ReadLocalValue(FrameworkElement.FlowDirectionProperty);
            state.OriginalAlignmentLocalValue = control.ReadLocalValue(AlignmentProperty(control));
            ManagedStates.Add(control, state);
        }
        else
        {
            ReconcileHostChanges(control, state);
            RefreshInheritedControlState(control, state);
        }
        var resolvedAlignment = alignment switch
        {
            BidiAlignment.Preserve => state.OriginalTextAlignment,
            BidiAlignment.ContentStart => analysis.ResolvedDirection == BidiDirection.RightToLeft
                ? TextAlignment.Right
                : TextAlignment.Left,
            BidiAlignment.PhysicalLeft => TextAlignment.Left,
            BidiAlignment.PhysicalRight => TextAlignment.Right,
            BidiAlignment.Center => TextAlignment.Center,
            BidiAlignment.Justify => TextAlignment.Justify,
            _ => state.OriginalTextAlignment,
        };
        SetControlValue(control, AlignmentProperty(control), resolvedAlignment, state.OriginalAlignmentLocalValue);
        SetControlValue(control,
            FrameworkElement.FlowDirectionProperty,
            analysis.ResolvedDirection == BidiDirection.RightToLeft
                ? FlowDirection.RightToLeft
                : FlowDirection.LeftToRight, state.OriginalFlowLocalValue);
        state.RenderedTextAlignment = GetAlignment(control);
        state.RenderedFlowDirection = control.FlowDirection;
        state.RenderedAlignmentLocalValue = control.ReadLocalValue(AlignmentProperty(control));
        state.RenderedFlowLocalValue = control.ReadLocalValue(FrameworkElement.FlowDirectionProperty);
        state.RenderedFlowValueSource = DependencyPropertyHelper.GetValueSource(control, FrameworkElement.FlowDirectionProperty);
        state.RenderedAlignmentValueSource = DependencyPropertyHelper.GetValueSource(control, AlignmentProperty(control));
    }

    private static void Restore(FrameworkElement control, Action<TextAlignment> setAlignment)
    {
        if (!ManagedStates.TryGetValue(control, out var state)) return;
        ReconcileHostChanges(control, state);
        if (state.OriginalAlignmentLocalValue == DependencyProperty.UnsetValue)
            control.ClearValue(AlignmentProperty(control));
        else if (!RefreshResourceReference(control, AlignmentProperty(control), state.OriginalAlignmentLocalValue))
            setAlignment(state.OriginalTextAlignment);
        if (state.OriginalFlowLocalValue == DependencyProperty.UnsetValue)
            control.ClearValue(FrameworkElement.FlowDirectionProperty);
        else if (!RefreshResourceReference(control, FrameworkElement.FlowDirectionProperty, state.OriginalFlowLocalValue))
            control.SetCurrentValue(FrameworkElement.FlowDirectionProperty, state.OriginalFlowDirection);
        ManagedStates.Remove(control);
    }

    private static TextAlignment GetAlignment(FrameworkElement control) => control switch
    {
        TextBlock textBlock => textBlock.TextAlignment,
        TextBox textBox => textBox.TextAlignment,
        _ => TextAlignment.Left,
    };

    private static DependencyProperty AlignmentProperty(FrameworkElement control) =>
        control is TextBox ? TextBox.TextAlignmentProperty : TextBlock.TextAlignmentProperty;

    private static void SetControlValue(FrameworkElement control, DependencyProperty property, object value, object originalLocal)
    {
        // A reversible local override avoids stale current-value masks on
        // inherited properties. Existing local expressions/bindings are retained.
        if (originalLocal == DependencyProperty.UnsetValue) control.SetValue(property, value);
        else control.SetCurrentValue(property, value);
    }

    private static bool RefreshResourceReference(DependencyObject target, DependencyProperty property, object originalLocal)
    {
        // SetCurrentValue can keep a DynamicResource's cached baseline stale.
        // Reattaching the same shareable resource expression invalidates that
        // cache. Never detach a non-shareable binding expression or a literal.
        if (originalLocal == DependencyProperty.UnsetValue
            || property.PropertyType.IsInstanceOfType(originalLocal)
            || !DependencyPropertyHelper.GetValueSource(target, property).IsExpression
            || BindingOperations.IsDataBound(target, property)) return false;
        target.ClearValue(property);
        target.SetValue(property, originalLocal);
        return true;
    }

    private static void RefreshInheritedControlState(FrameworkElement control, ManagedState state)
    {
        // Managed overrides mask new inherited/style values. Read the current
        // baseline without clearing any host-installed local value or binding.
        if (state.OriginalFlowLocalValue == DependencyProperty.UnsetValue)
        {
            var rendered = control.FlowDirection;
            control.ClearValue(FrameworkElement.FlowDirectionProperty);
            state.OriginalFlowDirection = control.FlowDirection;
            control.SetValue(FrameworkElement.FlowDirectionProperty, rendered);
        }
        else
        {
            var rendered = control.FlowDirection;
            if (RefreshResourceReference(control, FrameworkElement.FlowDirectionProperty, state.OriginalFlowLocalValue))
            {
                state.OriginalFlowDirection = control.FlowDirection;
                control.SetCurrentValue(FrameworkElement.FlowDirectionProperty, rendered);
            }
        }
        if (state.OriginalAlignmentLocalValue == DependencyProperty.UnsetValue)
        {
            var property = AlignmentProperty(control);
            var rendered = GetAlignment(control);
            control.ClearValue(property);
            state.OriginalTextAlignment = GetAlignment(control);
            control.SetValue(property, rendered);
        }
        else
        {
            var property = AlignmentProperty(control);
            var rendered = GetAlignment(control);
            if (RefreshResourceReference(control, property, state.OriginalAlignmentLocalValue))
            {
                state.OriginalTextAlignment = GetAlignment(control);
                control.SetCurrentValue(property, rendered);
            }
        }
    }

    private static void ReconcileHostChanges(FrameworkElement control, ManagedState state)
    {
        var currentAlignment = GetAlignment(control);
        if (state.RenderedTextAlignment is { } renderedAlignment
            && (currentAlignment != renderedAlignment
                || DependencyPropertyHelper.GetValueSource(control, AlignmentProperty(control)) != state.RenderedAlignmentValueSource
                || !Equals(control.ReadLocalValue(AlignmentProperty(control)), state.RenderedAlignmentLocalValue)))
        {
            state.OriginalTextAlignment = currentAlignment;
            state.OriginalAlignmentLocalValue = control.ReadLocalValue(AlignmentProperty(control));
        }
        if (state.RenderedFlowDirection is { } renderedDirection
            && (control.FlowDirection != renderedDirection
                || DependencyPropertyHelper.GetValueSource(control, FrameworkElement.FlowDirectionProperty) != state.RenderedFlowValueSource
                || !Equals(control.ReadLocalValue(FrameworkElement.FlowDirectionProperty), state.RenderedFlowLocalValue)))
        {
            state.OriginalFlowDirection = control.FlowDirection;
            state.OriginalFlowLocalValue = control.ReadLocalValue(FrameworkElement.FlowDirectionProperty);
        }
    }
}
