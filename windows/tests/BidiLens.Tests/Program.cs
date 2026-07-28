using System.IO;
using System.Text.Json;
using System.Windows;
using System.Windows.Controls;
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
}
