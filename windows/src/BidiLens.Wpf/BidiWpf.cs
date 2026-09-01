using System.Runtime.CompilerServices;
using System.Windows;
using System.Windows.Controls;

namespace BidiLens.Wpf;

public static class BidiWpf
{
    private sealed class ManagedState(FlowDirection flowDirection, TextAlignment textAlignment)
    {
        public FlowDirection OriginalFlowDirection { get; set; } = flowDirection;
        public TextAlignment OriginalTextAlignment { get; set; } = textAlignment;
        public FlowDirection? RenderedFlowDirection { get; set; }
        public TextAlignment? RenderedTextAlignment { get; set; }
    }

    private static readonly ConditionalWeakTable<FrameworkElement, ManagedState> ManagedStates = new();

    public static BidiAnalysis Apply(
        TextBlock control,
        BidiOptions? options = null,
        BidiAlignment alignment = BidiAlignment.ContentStart)
    {
        var analysis = BidiAnalyzer.Analyze(control.Text ?? string.Empty, options);
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
        var analysis = BidiAnalyzer.Analyze(control.Text ?? string.Empty, options);
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

    public static void Restore(TextBlock control) => Restore(
        control,
        value => control.SetCurrentValue(TextBlock.TextAlignmentProperty, value));

    public static void Restore(TextBox control) => Restore(
        control,
        value => control.SetCurrentValue(TextBox.TextAlignmentProperty, value));

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
            ManagedStates.Add(control, state);
        }
        else ReconcileHostChanges(control, state);
        setAlignment(alignment switch
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
        });
        control.SetCurrentValue(
            FrameworkElement.FlowDirectionProperty,
            analysis.ResolvedDirection == BidiDirection.RightToLeft
                ? FlowDirection.RightToLeft
                : FlowDirection.LeftToRight);
        state.RenderedTextAlignment = GetAlignment(control);
        state.RenderedFlowDirection = control.FlowDirection;
    }

    private static void Restore(FrameworkElement control, Action<TextAlignment> setAlignment)
    {
        if (!ManagedStates.TryGetValue(control, out var state)) return;
        ReconcileHostChanges(control, state);
        setAlignment(state.OriginalTextAlignment);
        control.SetCurrentValue(FrameworkElement.FlowDirectionProperty, state.OriginalFlowDirection);
        ManagedStates.Remove(control);
    }

    private static TextAlignment GetAlignment(FrameworkElement control) => control switch
    {
        TextBlock textBlock => textBlock.TextAlignment,
        TextBox textBox => textBox.TextAlignment,
        _ => TextAlignment.Left,
    };

    private static void ReconcileHostChanges(FrameworkElement control, ManagedState state)
    {
        var currentAlignment = GetAlignment(control);
        if (state.RenderedTextAlignment is { } renderedAlignment
            && currentAlignment != renderedAlignment)
            state.OriginalTextAlignment = currentAlignment;
        if (state.RenderedFlowDirection is { } renderedDirection
            && control.FlowDirection != renderedDirection)
            state.OriginalFlowDirection = control.FlowDirection;
    }
}
