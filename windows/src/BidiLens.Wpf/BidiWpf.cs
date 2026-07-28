using System.Runtime.CompilerServices;
using System.Windows;
using System.Windows.Controls;

namespace BidiLens.Wpf;

public static class BidiWpf
{
    private sealed record OriginalState(FlowDirection FlowDirection, TextAlignment TextAlignment);
    private static readonly ConditionalWeakTable<FrameworkElement, OriginalState> OriginalStates = new();

    public static BidiAnalysis Apply(
        TextBlock control,
        BidiOptions? options = null,
        BidiAlignment alignment = BidiAlignment.ContentStart)
    {
        var analysis = BidiAnalyzer.Analyze(control.Text ?? string.Empty, options);
        Apply(control, analysis, alignment, value => control.TextAlignment = value);
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
        Apply(control, analysis, alignment, value => control.TextAlignment = value);
        control.Select(selectionStart, selectionLength);
        return analysis;
    }

    public static void Restore(TextBlock control) => Restore(control, value => control.TextAlignment = value);

    public static void Restore(TextBox control) => Restore(control, value => control.TextAlignment = value);

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
        if (!OriginalStates.TryGetValue(control, out var original))
        {
            original = new(control.FlowDirection, control switch
            {
                TextBlock textBlock => textBlock.TextAlignment,
                TextBox textBox => textBox.TextAlignment,
                _ => TextAlignment.Left,
            });
            OriginalStates.Add(control, original);
        }
        setAlignment(alignment switch
        {
            BidiAlignment.Preserve => original.TextAlignment,
            BidiAlignment.ContentStart => analysis.ResolvedDirection == BidiDirection.RightToLeft
                ? TextAlignment.Right
                : TextAlignment.Left,
            BidiAlignment.PhysicalLeft => TextAlignment.Left,
            BidiAlignment.PhysicalRight => TextAlignment.Right,
            BidiAlignment.Center => TextAlignment.Center,
            BidiAlignment.Justify => TextAlignment.Justify,
            _ => original.TextAlignment,
        });
        control.FlowDirection = analysis.ResolvedDirection == BidiDirection.RightToLeft
            ? FlowDirection.RightToLeft
            : FlowDirection.LeftToRight;
    }

    private static void Restore(FrameworkElement control, Action<TextAlignment> setAlignment)
    {
        if (!OriginalStates.TryGetValue(control, out var original)) return;
        setAlignment(original.TextAlignment);
        control.FlowDirection = original.FlowDirection;
        OriginalStates.Remove(control);
    }
}
