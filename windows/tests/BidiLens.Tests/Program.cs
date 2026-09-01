using System.IO;
using System.Text.Json;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using BidiLens;
using BidiLens.Wpf;

internal static class Program
{
    [STAThread]
    private static int Main()
    {
        var assertions = 0;
        void Equal<T>(T expected, T actual, string message)
        {
            assertions++;
            if (!EqualityComparer<T>.Default.Equals(expected, actual))
                throw new InvalidOperationException($"{message}: expected {expected}, received {actual}");
        }
        void True(bool value, string message)
        {
            assertions++;
            if (!value) throw new InvalidOperationException(message);
        }

        const string flagship = "React یک کتابخانه جاوااسکریپت بسیار محبوب است.";
        const string mirror = "The Persian word کتاب means book.";
        Equal(BidiDirection.RightToLeft, BidiAnalyzer.DetectDirection(flagship), "flagship direction");
        Equal(BidiDirection.LeftToRight, BidiAnalyzer.DetectDirection(mirror), "mirror direction");
        Equal(BidiDirection.Neutral, BidiAnalyzer.DetectDirection("---"), "neutral direction");
        Equal(BidiDirection.RightToLeft, BidiAnalyzer.Analyze(flagship).ResolvedDirection, "resolved direction");
        True(BidiAnalyzer.Analyze(flagship).Isolations.Any(value => value.Text == "React"), "React isolation missing");

        var combiningMarkIsolations = BidiAnalyzer.Analyze("The word مثلاً appears here.").Isolations;
        True(
            combiningMarkIsolations.Any(value =>
                value.Text == "مثلاً"
                && value.Direction == BidiDirection.RightToLeft
                && value.Kind == BidiIsolationKind.OppositeDirectionRun),
            "combining mark detached from opposite-direction isolate");

        const string compounds = "The well-known state-of-the-art open-source کتابخانه";
        Equal(BidiDirection.LeftToRight, BidiAnalyzer.DetectDirection(compounds), "hyphenated prose direction");
        Equal(0, BidiAnalyzer.FindTechnicalTokenRanges(compounds).Count, "hyphenated prose technical ranges");
        const string emphasized = "PLEASE READ THIS IMPORTANT WARNING کتاب";
        Equal(BidiDirection.LeftToRight, BidiAnalyzer.DetectDirection(emphasized), "uppercase prose direction");
        Equal(0, BidiAnalyzer.FindTechnicalTokenRanges(emphasized).Count, "uppercase prose technical ranges");
        Equal(
            2,
            BidiAnalyzer.FindTechnicalTokenRanges("Use the HTTP API for this").Count,
            "mixed-case acronym ranges");
        Equal(
            2,
            BidiAnalyzer.FindTechnicalTokenRanges("HTTP API").Count,
            "all-capital acronym phrase ranges");
        Equal(
            1,
            BidiAnalyzer.FindTechnicalTokenRanges(
                "Widget کتاب",
                new HashSet<string> { "widget" }).Count,
            "custom identifiers are case-insensitive");
        Equal(
            1,
            BidiAnalyzer.FindTechnicalTokenRanges("react-markdown").Count,
            "hyphenated technical range");

        var textBlock = new TextBlock { Text = flagship, TextAlignment = TextAlignment.Left };
        var blockAnalysis = BidiWpf.Apply(textBlock, alignment: BidiAlignment.PhysicalLeft);
        Equal(BidiDirection.RightToLeft, blockAnalysis.ResolvedDirection, "WPF analysis direction");
        Equal(FlowDirection.RightToLeft, textBlock.FlowDirection, "WPF flow direction");
        Equal(TextAlignment.Left, textBlock.TextAlignment, "WPF physical-left alignment");
        Equal(flagship, textBlock.Text, "WPF source preservation");

        var textBox = new TextBox { Text = "سلام React", TextAlignment = TextAlignment.Left };
        textBox.Select(2, 2);
        BidiWpf.Apply(textBox, alignment: BidiAlignment.PhysicalLeft);
        Equal("سلام React", textBox.Text, "TextBox source preservation");
        Equal(2, textBox.SelectionStart, "TextBox selection start");
        Equal(2, textBox.SelectionLength, "TextBox selection length");
        Equal(TextAlignment.Left, textBox.TextAlignment, "TextBox physical-left alignment");

        var hostManaged = new TextBlock
        {
            Text = flagship,
            FlowDirection = FlowDirection.LeftToRight,
            TextAlignment = TextAlignment.Left,
        };
        BidiWpf.Apply(hostManaged);
        hostManaged.FlowDirection = FlowDirection.LeftToRight;
        hostManaged.TextAlignment = TextAlignment.Center;
        BidiWpf.Apply(hostManaged, alignment: BidiAlignment.Preserve);
        Equal(FlowDirection.RightToLeft, hostManaged.FlowDirection, "managed WPF direction reapplied");
        Equal(TextAlignment.Center, hostManaged.TextAlignment, "host WPF alignment adopted");
        hostManaged.Text = "Plain English";
        BidiWpf.Apply(hostManaged);
        Equal(FlowDirection.LeftToRight, hostManaged.FlowDirection, "host WPF direction restored");
        Equal(TextAlignment.Center, hostManaged.TextAlignment, "host WPF alignment restored");

        var boundSource = new BoundProperties();
        var boundBlock = new TextBlock { Text = flagship };
        BindingOperations.SetBinding(
            boundBlock,
            TextBlock.TextAlignmentProperty,
            new Binding(nameof(BoundProperties.Alignment)) { Source = boundSource });
        BindingOperations.SetBinding(
            boundBlock,
            FrameworkElement.FlowDirectionProperty,
            new Binding(nameof(BoundProperties.Direction)) { Source = boundSource });
        BidiWpf.Apply(boundBlock);
        True(
            BindingOperations.IsDataBound(boundBlock, TextBlock.TextAlignmentProperty),
            "WPF alignment binding preserved while managed");
        True(
            BindingOperations.IsDataBound(boundBlock, FrameworkElement.FlowDirectionProperty),
            "WPF direction binding preserved while managed");
        BidiWpf.Restore(boundBlock);
        True(
            BindingOperations.IsDataBound(boundBlock, TextBlock.TextAlignmentProperty),
            "WPF alignment binding preserved after restore");
        True(
            BindingOperations.IsDataBound(boundBlock, FrameworkElement.FlowDirectionProperty),
            "WPF direction binding preserved after restore");

        var plain = new TextBlock
        {
            Text = "Plain English",
            FlowDirection = FlowDirection.LeftToRight,
            TextAlignment = TextAlignment.Center,
        };
        BidiWpf.Apply(plain);
        Equal(FlowDirection.LeftToRight, plain.FlowDirection, "pure LTR flow no-op");
        Equal(TextAlignment.Center, plain.TextAlignment, "pure LTR alignment no-op");

        var cases = JsonSerializer.Deserialize<CorpusCase[]>(
            File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "cases.json")),
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
            ?? throw new InvalidOperationException("Corpus could not be loaded.");
        var corpusFailures = new List<string>();
        foreach (var item in cases)
        {
            var expected = item.Expected switch
            {
                "rtl" => BidiDirection.RightToLeft,
                "ltr" => BidiDirection.LeftToRight,
                _ => BidiDirection.Neutral,
            };
            var actual = BidiAnalyzer.DetectDirection(item.Text);
            assertions++;
            if (actual != expected) corpusFailures.Add($"{item.Id}: expected {expected}, received {actual}");
            if (item.ExpectedIsolations is not null)
            {
                var actualIsolations = BidiAnalyzer.Analyze(item.Text).Isolations
                    .Select(value => new CorpusIsolation(
                        value.Text,
                        value.Direction == BidiDirection.RightToLeft ? "rtl" : "ltr",
                        IsolationKind(value.Kind)))
                    .ToArray();
                assertions++;
                if (!actualIsolations.SequenceEqual(item.ExpectedIsolations))
                {
                    corpusFailures.Add(
                        $"{item.Id}: actual [{string.Join(", ", actualIsolations.Select(value => value.ToString()))}], "
                        + $"expected [{string.Join(", ", item.ExpectedIsolations.Select(value => value.ToString()))}]");
                }
            }
        }
        if (corpusFailures.Count > 0)
            throw new InvalidOperationException(
                $"{corpusFailures.Count} corpus failures:\n{string.Join('\n', corpusFailures.Take(30))}");

        Console.WriteLine($"Windows verification passed: {assertions} assertions, {cases.Length} corpus cases.");
        return 0;
    }

    private static string IsolationKind(BidiIsolationKind kind) => kind switch
    {
        BidiIsolationKind.OppositeDirectionRun => "opposite-direction-run",
        _ => kind.ToString().ToLowerInvariant(),
    };

    private sealed record CorpusCase(
        string Id,
        string Text,
        string Expected,
        CorpusIsolation[]? ExpectedIsolations);

    private sealed record CorpusIsolation(string Text, string Direction, string Kind);

    private sealed class BoundProperties
    {
        public TextAlignment Alignment { get; init; } = TextAlignment.Left;
        public FlowDirection Direction { get; init; } = FlowDirection.LeftToRight;
    }
}
