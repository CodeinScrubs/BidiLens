using BidiLens;

internal static class AuditRegressionTests
{
    internal static int Run()
    {
        var failures = new List<string>();
        var assertions = 0;
        void Check(string name, Action assertion)
        {
            assertions++;
            try { assertion(); }
            catch (Exception error) { failures.Add($"{name}: {error.Message}"); }
        }
        void Equal<T>(T expected, T actual)
        {
            if (!EqualityComparer<T>.Default.Equals(expected, actual))
                throw new InvalidOperationException($"expected {expected}, received {actual}");
        }
        foreach (var strategy in new[] { BidiDetectionStrategy.FirstStrong, BidiDetectionStrategy.StrictUax9 })
        {
            var options = new BidiOptions { Strategy = strategy };
            Check($"{strategy} default", () => Equal(BidiDirection.LeftToRight,
                BidiAnalyzer.Analyze("React فارسی", options).Direction));
            Check($"{strategy} explicit exclusion", () => Equal(BidiDirection.RightToLeft,
                BidiAnalyzer.Analyze("React فارسی", options with { ExcludeTechnicalTokens = true }).Direction));
            Check($"{strategy} explicit inclusion", () => Equal(BidiDirection.LeftToRight,
                BidiAnalyzer.Analyze("React فارسی", options with { ExcludeTechnicalTokens = false }).Direction));
        }
        var strict = new BidiOptions { Strategy = BidiDetectionStrategy.StrictUax9 };
        foreach (var source in new[] { "\u2067עברית\u2069 ordinary", "\u2067א\u2066ABC\u2069ב\u2069 ordinary" })
            Check("strict isolate exclusion", () => Equal(BidiDirection.LeftToRight, BidiAnalyzer.Analyze(source, strict).Direction));
        Check("strict unclosed isolate", () => Equal(BidiDirection.Neutral,
            BidiAnalyzer.Analyze("\u2067עברית ordinary", strict).Direction));
        foreach (var separator in new[] { "\n", "\r\n", "\r", "\u0085", "\u001c", "\u001d", "\u001e", "\u2029" })
            Check("strict paragraph reset", () => Equal(BidiDirection.LeftToRight,
                BidiAnalyzer.Analyze($"\u2067עברית{separator}ordinary", strict).Direction));
        foreach (var source in new[] { "سلام hello\ud800 world", "سلام \udc00hello", "ordinary فارسی\ud800", "\ud800 ordinary فارسی \udc00" })
            Check("ill-formed UTF-16", () =>
            {
                var analysis = BidiAnalyzer.Analyze(source);
                Equal(source, analysis.Text);
                foreach (var range in analysis.Isolations)
                    Equal(range.Text, source[range.Utf16Start..range.Utf16End]);
            });
        foreach (var (source, expected) in new[] {
            ("برو https://example.com/foo)]!", "https://example.com/foo"),
            ("برو https://example.com/foo(bar).", "https://example.com/foo(bar)"),
            ("برو https://example.com/foo(bar))].", "https://example.com/foo(bar)") })
            Check("URL closing punctuation", () => Equal(expected,
                BidiAnalyzer.FindTechnicalTokenRanges(source).Single(range => range.Kind == TechnicalTokenKind.Url).Text));
        foreach (var source in new[] { "go is a verb that means رفتن.", "python is a language for humans زبان.", "git is a great tool ابزار." })
            Check("ordinary prose is not a command", () => Equal(false,
                BidiAnalyzer.FindTechnicalTokenRanges(source).Any(range => range.Kind == TechnicalTokenKind.Command)));
        foreach (var source in new[] { "npm install", "pnpm run test", "git status", "go run main.go", "python -m pip", "node script.js" })
            Check("recognizable command", () => Equal(true,
                BidiAnalyzer.FindTechnicalTokenRanges(source).Any(range => range.Kind == TechnicalTokenKind.Command)));
        if (failures.Count > 0) throw new InvalidOperationException(string.Join(Environment.NewLine, failures));
        return assertions;
    }
}
