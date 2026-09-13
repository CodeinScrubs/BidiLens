namespace BidiLens;

public static partial class BidiAnalyzer
{
    // Pin ECMAScript whitespace for parity; host char.IsWhiteSpace differs.
    private static bool IsMathWhitespace(char value) => value is >= '\u0009' and <= '\u000d'
        or >= '\u2000' and <= '\u200a' or ' ' or '\u00a0' or '\u1680' or '\u2028'
        or '\u2029' or '\u202f' or '\u205f' or '\u3000' or '\ufeff';
    // Forward-only math heuristic, matching the core dollar-boundary policy.
    private static void AddMathRanges(string text, List<TechnicalTokenRange> ranges)
    {
        var scanned = new Dictionary<string, int> { ["$"] = -1, ["$$"] = -1, [@"\)"] = -1 };
        var i = 0;
        bool At(string delimiter, int index) => text.AsSpan(index).StartsWith(delimiter, StringComparison.Ordinal);
        while (i < text.Length)
        {
            var paren = At(@"\(", i);
            if (text[i] == '\\' && !paren) { i += 2; continue; }
            var delimiter = text[i] == '$' ? (At("$$", i) ? "$$" : "$") : paren ? @"\)" : "";
            if (delimiter.Length == 0 || i < scanned[delimiter]) { i++; continue; }
            if (delimiter == "$" && (i + 1 == text.Length || IsMathWhitespace(text[i + 1]))) { i++; continue; }
            var end = i + (paren ? 2 : delimiter.Length);
            while (end < text.Length && text[end] is not ('\r' or '\n') && !At(delimiter, end))
                end += text[end] == '\\' && end + 1 < text.Length && text[end + 1] is not ('\r' or '\n') ? 2 : 1;
            if (At(delimiter, end) && (delimiter != "$" || end > i + 1))
            {
                var next = end + 1 < text.Length ? text[end + 1] : '\0';
                if (delimiter == "$" && (IsMathWhitespace(text[end - 1])
                    || next is >= '0' and <= '9' or >= '\u0660' and <= '\u0669' or >= '\u06f0' and <= '\u06f9'))
                {
                    i = end;
                    continue;
                }
                ranges.Add(new(text[i..(end + delimiter.Length)], i, end + delimiter.Length, TechnicalTokenKind.Math));
                i = end + delimiter.Length;
            }
            else
            {
                scanned[delimiter] = end;
                i++;
            }
        }
    }
}
