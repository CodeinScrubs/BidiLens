using BidiLens;

internal static class TokenBoundaryTests
{
    internal static int Run()
    {
        var assertions = 0;
        void Equal(IEnumerable<string> actual, params string[] expected)
        {
            assertions++;
            if (!actual.SequenceEqual(expected)) throw new InvalidOperationException($"Token boundaries: {string.Join(", ", actual)} != {string.Join(", ", expected)}");
        }
        foreach (var token in new[] { "$10", "€12.50", "£25", "۱۰€", "10-20", "10–20", "-10--2", "۱۰-۲۰", "١٠-٢٠" })
        {
            var source = $"👋 مقدار {token} است.";
            var ranges = BidiAnalyzer.Analyze(source).Isolations;
            Equal(ranges.Select(range => range.Text), token);
            Equal(ranges.Select(range => source[range.Utf16Start..range.Utf16End]), token);
        }
        foreach (var quote in new[] { "\"", "'", "“", "”", "«", "»" })
            Equal(BidiAnalyzer.FindTechnicalTokenRanges($"مسیر {quote}/usr/local/bin{quote} است.").Select(range => range.Text), "/usr/local/bin");
        foreach (var source in new[] { "$ x$", "$x $", "$10 and $20", "\\$x\\$" })
            Equal(BidiAnalyzer.FindTechnicalTokenRanges(source).Where(range => range.Kind == TechnicalTokenKind.Math).Select(range => range.Text));
        foreach (var space in new[] { "\ufeff", "\u00a0", "\u202f" })
            foreach (var source in new[] { $"${space}x$", $"$x{space}$" })
                Equal(BidiAnalyzer.FindTechnicalTokenRanges(source).Where(range => range.Kind == TechnicalTokenKind.Math).Select(range => range.Text));
        foreach (var content in new[] { "\u0085", "\u001c" })
        {
            var source = $"${content}x$";
            Equal(BidiAnalyzer.FindTechnicalTokenRanges(source).Where(range => range.Kind == TechnicalTokenKind.Math).Select(range => range.Text), source);
        }
        Equal(BidiAnalyzer.FindTechnicalTokenRanges("هزینه این کتاب $10 و آن یکی $20 است.").Select(range => range.Text), "$10", "$20");
        foreach (var (source, expected) in new[] { ("قیمت $10 است و $x+1$ درست است.", "$x+1$"), ("$x\\$y$", "$x\\$y$") })
            Equal(BidiAnalyzer.FindTechnicalTokenRanges(source).Where(range => range.Kind == TechnicalTokenKind.Math).Select(range => range.Text), expected);
        return assertions;
    }
}
