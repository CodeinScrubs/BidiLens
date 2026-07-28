using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace BidiLens;

public static partial class BidiAnalyzer
{
    private static readonly HashSet<string> DefaultTechnicalIdentifiers = new(StringComparer.OrdinalIgnoreCase)
    {
        "ai", "api", "anthropic", "chatgpt", "claude", "cli", "codex", "copilot", "cursor",
        "deepseek", "electron", "gemini", "github", "gitlab", "grok", "huggingface", "javascript",
        "json", "llama", "markdown", "mistral", "node", "npm", "openai", "python", "qwen",
        "react", "rust", "svelte", "typescript", "url", "version", "vscode", "vue", "web",
        "webpack", "yaml", "angular", "astro", "chrome", "docker", "esbuild", "eslint",
        "firefox", "kubernetes", "kubectl", "nuxt", "playwright", "pnpm", "preact", "remix",
        "rollup", "safari", "stencil", "storybook", "tailwind", "turbopack", "vite", "vitest",
    };

    private static readonly (Regex Regex, TechnicalTokenKind Kind)[] TechnicalPatterns =
    [
        (Pattern(@"```[\s\S]*?```|~~~[\s\S]*?~~~|`+[^`\r\n]+`+"), TechnicalTokenKind.Code),
        (Pattern(@"</?[A-Za-z][^<>\r\n]*>"), TechnicalTokenKind.Html),
        (Pattern(@"\$\$[^\r\n]*?\$\$|\$[^\$\r\n]+\$|\\\([^\r\n]*?\\\)"), TechnicalTokenKind.Math),
        (Pattern(@"\b(?:https?|ftp)://[^\s<>{}""']+"), TechnicalTokenKind.Url),
        (Pattern(@"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", RegexOptions.IgnoreCase), TechnicalTokenKind.Email),
        (Pattern(@"(?<![\p{L}\p{N}_])(?:[A-Za-z]:[\\/]|\.{0,2}/|~/)[^\s<>()\[\]{}]+"), TechnicalTokenKind.Path),
        (Pattern(@"\b(?:[A-Za-z0-9_.-]+[\\/])+(?:[A-Za-z0-9_.-]+)\b"), TechnicalTokenKind.Path),
        (Pattern(@"(?<![\w@])@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*", RegexOptions.IgnoreCase), TechnicalTokenKind.Identifier),
        (Pattern(@"(?:\$\{?[A-Z_][A-Z0-9_]*\}?|%[A-Z_][A-Z0-9_]*%)"), TechnicalTokenKind.Identifier),
        (Pattern(@"\b(?:npm|pnpm|yarn|npx|git|pip|python|node|cargo|go|docker|kubectl)(?:\s+(?:--?[A-Za-z0-9_-]+|[@./\\A-Za-z0-9_:=+-]+|'[^'\r\n]*'|""[^""\r\n]*""))+"), TechnicalTokenKind.Command),
        (Pattern(@"\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b"), TechnicalTokenKind.Number),
        (Pattern(@"(?<![\p{L}\p{N}_])\+?[0-9][0-9 ()-]{6,}[0-9](?![\p{L}\p{N}_])"), TechnicalTokenKind.Number),
        (Pattern(@"\b[0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2}(?:[T ][0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?(?:Z|[+-][0-9]{2}:?[0-9]{2})?)?\b"), TechnicalTokenKind.Number),
        (Pattern(@"\b[0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?(?:\s?[AP]M)?\b", RegexOptions.IgnoreCase), TechnicalTokenKind.Number),
        (Pattern(@"\bv?[0-9]+(?:\.[0-9]+){1,}\b"), TechnicalTokenKind.Version),
        (Pattern(@"\b[0-9a-f]{7,40}\b", RegexOptions.IgnoreCase), TechnicalTokenKind.Hash),
        (Pattern(@"(?<![\p{L}\p{N}_])[+-]?(?:[0-9]+(?:[.,][0-9]+)?|[\u0660-\u0669]+(?:[\u066B\u066C][\u0660-\u0669]+)?|[\u06F0-\u06F9]+(?:[.,][\u06F0-\u06F9]+)?)(?![\p{L}\p{N}_])"), TechnicalTokenKind.Number),
    ];

    private static Regex Pattern(string value, RegexOptions options = RegexOptions.None) =>
        new(value, options | RegexOptions.CultureInvariant, TimeSpan.FromSeconds(1));

    public static BidiDirection DetectDirection(string text, BidiOptions? options = null) =>
        Analyze(text, options).Direction;

    public static BidiAnalysis Analyze(string text, BidiOptions? options = null)
    {
        ArgumentNullException.ThrowIfNull(text);
        options ??= new BidiOptions();
        options.Validate();
        var technical = options.ExcludeTechnicalTokens
            ? FindTechnicalTokenRanges(text, options.TechnicalIdentifiers)
            : [];
        var adjusted = Count(text, options, technical);
        var raw = Count(text, options with { ExcludeTechnicalTokens = false }, []);
        var direction = Resolve(adjusted.Counts, adjusted.First, options);
        var resolved = direction != BidiDirection.Neutral
            ? direction
            : options.Fallback != BidiDirection.Neutral ? options.Fallback : options.InheritedDirection;
        var intervention = NeedsIntervention(text, options);
        return new BidiAnalysis(
            text,
            direction,
            resolved,
            adjusted.First,
            RawFirstStrong(text),
            adjusted.Counts,
            raw.Counts,
            Confidence(adjusted.Counts, direction),
            raw.Counts.LeftToRight > 0 && raw.Counts.RightToLeft > 0,
            intervention,
            technical,
            intervention ? PlanInlineIsolation(text, resolved, options, technical) : [],
            ScanSecurity(text));
    }

    public static BidiPresentation Present(
        string text,
        BidiAlignment alignment = BidiAlignment.ContentStart,
        BidiOptions? options = null)
    {
        var analysis = Analyze(text, options);
        return new BidiPresentation(analysis, analysis.ResolvedDirection, alignment);
    }

    public static bool NeedsIntervention(string text, BidiOptions? options = null)
    {
        options ??= new BidiOptions();
        options.Validate();
        if (options.Intervention == BidiIntervention.Always || ScanSecurity(text).Controls.Count > 0) return true;
        var hasLtr = false;
        var hasRtl = false;
        foreach (var (rune, _, _) in UnicodeClassifier.Enumerate(text))
        {
            switch (UnicodeClassifier.ClassifyStrong(rune.Value))
            {
                case BidiDirection.LeftToRight: hasLtr = true; break;
                case BidiDirection.RightToLeft: hasRtl = true; break;
            }
        }
        return hasRtl || (options.InheritedDirection == BidiDirection.RightToLeft && (hasLtr || text.Length > 0));
    }

    public static IReadOnlyList<TechnicalTokenRange> FindTechnicalTokenRanges(
        string text,
        IReadOnlySet<string>? customIdentifiers = null)
    {
        var ranges = new List<TechnicalTokenRange>();
        foreach (var (regex, kind) in TechnicalPatterns)
        {
            foreach (Match match in regex.Matches(text))
            {
                var length = match.Length;
                if (kind is TechnicalTokenKind.Url or TechnicalTokenKind.Path)
                {
                    while (length > 0 && ".,;:!?،؛؟。।۔".Contains(match.Value[length - 1]))
                        length--;
                }
                if (length <= 0) continue;
                var value = text.Substring(match.Index, length);
                var standaloneFence = kind == TechnicalTokenKind.Code
                    && (value.StartsWith("```", StringComparison.Ordinal)
                        || value.StartsWith("~~~", StringComparison.Ordinal))
                    && !UnicodeClassifier.Enumerate(text).Any(item =>
                        (item.Utf16Index < match.Index || item.Utf16Index >= match.Index + length)
                        && UnicodeClassifier.ClassifyNatural(item.Rune.Value) != BidiDirection.Neutral);
                // A standalone fenced block is itself the content and must be
                // classified. A fence embedded in prose remains technical.
                if (!standaloneFence)
                    ranges.Add(new(value, match.Index, match.Index + length, kind));
                else
                    AddStandaloneFenceDelimiters(text, match.Index, length, ranges);
            }
        }
        foreach (Match match in IdentifierPattern().Matches(text))
        {
            var token = match.Value;
            var technical = DefaultTechnicalIdentifiers.Contains(token)
                || customIdentifiers?.Contains(token) == true
                || token.Any(character => char.IsDigit(character) || character is '_' or '.' or '-')
                || token.All(character => !char.IsLetter(character) || char.IsUpper(character))
                || Regex.IsMatch(token, "[a-z][A-Z]", RegexOptions.CultureInvariant);
            if (technical) ranges.Add(new(token, match.Index, match.Index + match.Length, TechnicalTokenKind.Identifier));
        }
        ranges.Sort((left, right) =>
        {
            var byStart = left.Start.CompareTo(right.Start);
            return byStart != 0 ? byStart : right.End.CompareTo(left.End);
        });
        var merged = new List<TechnicalTokenRange>();
        foreach (var range in ranges)
        {
            var previous = merged.LastOrDefault();
            if (previous is not null && range.Start <= previous.End)
            {
                var end = Math.Max(previous.End, range.End);
                merged[^1] = previous with { Text = text[previous.Start..end], End = end };
            }
            else merged.Add(range);
        }
        return merged;
    }

    private static void AddStandaloneFenceDelimiters(
        string text,
        int start,
        int length,
        List<TechnicalTokenRange> ranges)
    {
        var value = text.Substring(start, length);
        var firstMarkerLength = value.TakeWhile(character => character is '`' or '~').Count();
        var firstCodeLength = 2 * (firstMarkerLength / 2);
        if (firstCodeLength > 0)
            ranges.Add(new(
                text.Substring(start, firstCodeLength),
                start,
                start + firstCodeLength,
                TechnicalTokenKind.Code));

        var closingLineStart = value.LastIndexOf('\n');
        closingLineStart = closingLineStart >= 0 ? closingLineStart + 1 : 0;
        while (closingLineStart < value.Length && value[closingLineStart] == '\r')
            closingLineStart++;
        var closingMarkerLength = 0;
        while (closingLineStart + closingMarkerLength < value.Length
            && value[closingLineStart + closingMarkerLength] is '`' or '~')
            closingMarkerLength++;
        var closingCodeLength = 2 * (closingMarkerLength / 2);
        if (closingCodeLength > 0)
        {
            var absolute = start + closingLineStart;
            ranges.Add(new(
                text.Substring(absolute, closingCodeLength),
                absolute,
                absolute + closingCodeLength,
                TechnicalTokenKind.Code));
        }
    }

    public static string FormatForDisplay(BidiAnalysis analysis)
    {
        if (!analysis.InterventionRequired || analysis.Isolations.Count == 0) return analysis.Text;
        var output = new StringBuilder(analysis.Text.Length + analysis.Isolations.Count * 2);
        var cursor = 0;
        foreach (var isolation in analysis.Isolations.OrderBy(value => value.Utf16Start))
        {
            if (isolation.Utf16Start < cursor) continue;
            output.Append(analysis.Text, cursor, isolation.Utf16Start - cursor);
            output.Append(isolation.Direction == BidiDirection.RightToLeft ? '\u2067' : '\u2066');
            output.Append(analysis.Text, isolation.Utf16Start, isolation.Utf16End - isolation.Utf16Start);
            output.Append('\u2069');
            cursor = isolation.Utf16End;
        }
        output.Append(analysis.Text, cursor, analysis.Text.Length - cursor);
        return output.ToString();
    }

    private static (StrongCharacterCounts Counts, BidiDirection First) Count(
        string text,
        BidiOptions options,
        IReadOnlyList<TechnicalTokenRange> technical)
    {
        var ltr = 0;
        var rtl = 0;
        var first = BidiDirection.Neutral;
        var technicalIndex = 0;
        var strict = options.Strategy is BidiDetectionStrategy.FirstStrong or BidiDetectionStrategy.StrictUax9;
        foreach (var (rune, utf16Index, _) in UnicodeClassifier.Enumerate(text))
        {
            while (technicalIndex < technical.Count && utf16Index >= technical[technicalIndex].End) technicalIndex++;
            var range = technicalIndex < technical.Count ? technical[technicalIndex] : null;
            if (range is not null && utf16Index >= range.Start && utf16Index < range.End) continue;
            var direction = strict
                ? UnicodeClassifier.ClassifyStrong(rune.Value)
                : UnicodeClassifier.ClassifyNatural(rune.Value);
            if (direction == BidiDirection.LeftToRight) ltr++;
            if (direction == BidiDirection.RightToLeft) rtl++;
            if (first == BidiDirection.Neutral && direction != BidiDirection.Neutral) first = direction;
        }
        return (new(ltr, rtl), first);
    }

    private static BidiDirection Resolve(StrongCharacterCounts counts, BidiDirection first, BidiOptions options)
    {
        if (options.Strategy == BidiDetectionStrategy.LeftToRight) return BidiDirection.LeftToRight;
        if (options.Strategy == BidiDetectionStrategy.RightToLeft) return BidiDirection.RightToLeft;
        if (options.Strategy == BidiDetectionStrategy.Inherit) return options.InheritedDirection;
        if (counts.Total < options.MinimumStrongCharacters) return options.Fallback;
        if (options.Strategy is BidiDetectionStrategy.FirstStrong or BidiDetectionStrategy.StrictUax9)
            return first == BidiDirection.Neutral ? options.Fallback : first;
        if (counts.RightToLeft > counts.LeftToRight && (double)counts.RightToLeft / counts.Total >= options.MajorityThreshold)
            return BidiDirection.RightToLeft;
        if (counts.LeftToRight > counts.RightToLeft && (double)counts.LeftToRight / counts.Total >= options.MajorityThreshold)
            return BidiDirection.LeftToRight;
        return first == BidiDirection.Neutral ? options.Fallback : first;
    }

    private static double Confidence(StrongCharacterCounts counts, BidiDirection direction)
    {
        if (counts.Total == 0 || direction == BidiDirection.Neutral) return 0;
        var matching = direction == BidiDirection.RightToLeft ? counts.RightToLeft : counts.LeftToRight;
        return Math.Round((double)matching / counts.Total, 4, MidpointRounding.AwayFromZero);
    }

    private static BidiDirection RawFirstStrong(string text)
    {
        foreach (var (rune, _, _) in UnicodeClassifier.Enumerate(text))
        {
            var direction = UnicodeClassifier.ClassifyStrong(rune.Value);
            if (direction != BidiDirection.Neutral) return direction;
        }
        return BidiDirection.Neutral;
    }

    private static IReadOnlyList<BidiIsolation> PlanInlineIsolation(
        string text,
        BidiDirection blockDirection,
        BidiOptions options,
        IReadOnlyList<TechnicalTokenRange> technical)
    {
        var result = technical.Select(range => new BidiIsolation(
            range.Text,
            BidiDirection.LeftToRight,
            range.Start,
            range.End,
            UnicodeClassifier.CodePointOffset(text, range.Start),
            UnicodeClassifier.CodePointOffset(text, range.End),
            Enum.Parse<BidiIsolationKind>(range.Kind.ToString())))
            .ToList();

        var technicalIndex = 0;
        foreach (var run in SegmentDirectionalRuns(text))
        {
            if (run.Direction is BidiDirection.Neutral || run.Direction == blockDirection) continue;
            while (technicalIndex < technical.Count && technical[technicalIndex].End <= run.Start)
                technicalIndex++;
            var cursor = run.Start;
            var index = technicalIndex;
            while (index < technical.Count)
            {
                var range = technical[index];
                if (range.End <= cursor)
                {
                    index++;
                    continue;
                }
                if (range.Start >= run.End) break;
                AddOppositeRun(text, result, run.Direction, cursor, Math.Min(range.Start, run.End));
                cursor = Math.Max(cursor, range.End);
                if (cursor >= run.End) break;
                index++;
            }
            AddOppositeRun(text, result, run.Direction, cursor, run.End);
        }
        return NormalizeIsolationPlan(text, result);
    }

    private sealed record DirectionalRun(BidiDirection Direction, int Start, int End);

    private static IReadOnlyList<DirectionalRun> SegmentDirectionalRuns(string text)
    {
        if (text.Length == 0) return [];
        var raw = new List<DirectionalRun>();
        BidiDirection? currentDirection = null;
        var currentStart = 0;
        var currentEnd = 0;
        foreach (var (rune, utf16Index, _) in UnicodeClassifier.Enumerate(text))
        {
            var direction = UnicodeClassifier.ClassifyNatural(rune.Value);
            var end = utf16Index + rune.Utf16SequenceLength;
            if (currentDirection is null)
            {
                currentDirection = direction;
                currentStart = utf16Index;
                currentEnd = end;
            }
            else if (currentDirection == direction)
            {
                currentEnd = end;
            }
            else
            {
                raw.Add(new(currentDirection.Value, currentStart, currentEnd));
                currentDirection = direction;
                currentStart = utf16Index;
                currentEnd = end;
            }
        }
        raw.Add(new(currentDirection!.Value, currentStart, currentEnd));

        var previous = new BidiDirection[raw.Count];
        var next = new BidiDirection[raw.Count];
        var seen = BidiDirection.Neutral;
        for (var index = 0; index < raw.Count; index++)
        {
            previous[index] = seen;
            if (raw[index].Direction != BidiDirection.Neutral) seen = raw[index].Direction;
        }
        seen = BidiDirection.Neutral;
        for (var index = raw.Count - 1; index >= 0; index--)
        {
            next[index] = seen;
            if (raw[index].Direction != BidiDirection.Neutral) seen = raw[index].Direction;
        }

        var merged = new List<DirectionalRun>();
        for (var index = 0; index < raw.Count; index++)
        {
            var run = raw[index];
            if (run.Direction == BidiDirection.Neutral)
            {
                var resolved = previous[index] != BidiDirection.Neutral
                    ? previous[index]
                    : next[index];
                run = run with { Direction = resolved };
            }
            if (merged.LastOrDefault() is { } last && last.Direction == run.Direction)
                merged[^1] = last with { End = run.End };
            else
                merged.Add(run);
        }
        return merged;
    }

    private static (int Start, int End) TrimNeutralBoundaries(string text, int originalStart, int originalEnd)
    {
        var start = originalStart;
        var end = originalEnd;
        while (start < end)
        {
            var rune = Rune.GetRuneAt(text, start);
            if (UnicodeClassifier.ClassifyNatural(rune.Value) != BidiDirection.Neutral) break;
            start += rune.Utf16SequenceLength;
        }
        while (end > start)
        {
            var runeStart = end - 1;
            if (char.IsLowSurrogate(text[runeStart])
                && runeStart > start
                && char.IsHighSurrogate(text[runeStart - 1]))
                runeStart--;
            var rune = Rune.GetRuneAt(text, runeStart);
            if (UnicodeClassifier.ClassifyNatural(rune.Value) != BidiDirection.Neutral) break;
            end = runeStart;
        }
        return (start, end);
    }

    private static void AddOppositeRun(
        string text,
        List<BidiIsolation> result,
        BidiDirection direction,
        int originalStart,
        int originalEnd)
    {
        var (start, end) = TrimNeutralBoundaries(text, originalStart, originalEnd);
        if (start >= end) return;
        result.Add(new(
            text[start..end],
            direction,
            start,
            end,
            UnicodeClassifier.CodePointOffset(text, start),
            UnicodeClassifier.CodePointOffset(text, end),
            BidiIsolationKind.OppositeDirectionRun));
    }

    private static readonly HashSet<char> HardFragmentSeparators =
        [',', '\u060c', ';', '\u061b', ':', '!', '?', '\u061f', '|'];

    private static IReadOnlyList<BidiIsolation> NormalizeIsolationPlan(
        string text,
        IReadOnlyList<BidiIsolation> isolations)
    {
        var split = new List<BidiIsolation>();
        foreach (var isolation in isolations)
        {
            if (isolation.Kind != BidiIsolationKind.OppositeDirectionRun)
            {
                split.Add(isolation);
                continue;
            }
            var pieceStart = isolation.Utf16Start;
            var cursor = isolation.Utf16Start;
            while (cursor < isolation.Utf16End)
            {
                var rune = Rune.GetRuneAt(text, cursor);
                var end = cursor + rune.Utf16SequenceLength;
                if (rune.IsAscii && HardFragmentSeparators.Contains((char)rune.Value)
                    || rune.Value is 0x060c or 0x061b or 0x061f)
                {
                    AddNormalizedPiece(text, split, isolation, pieceStart, cursor);
                    pieceStart = end;
                }
                cursor = end;
            }
            AddNormalizedPiece(text, split, isolation, pieceStart, isolation.Utf16End);
        }

        var merged = new List<BidiIsolation>();
        foreach (var isolation in split.OrderBy(value => value.Utf16Start).ThenBy(value => value.Utf16End))
        {
            var previous = merged.LastOrDefault();
            var whitespaceGap = previous is not null
                && previous.Utf16End <= isolation.Utf16Start
                && text[previous.Utf16End..isolation.Utf16Start].All(char.IsWhiteSpace);
            if (previous is not null && previous.Direction == isolation.Direction && whitespaceGap)
            {
                var kind = previous.Kind == isolation.Kind
                    ? previous.Kind
                    : BidiIsolationKind.OppositeDirectionRun;
                merged[^1] = previous with
                {
                    Text = text[previous.Utf16Start..isolation.Utf16End],
                    Utf16End = isolation.Utf16End,
                    CodePointEnd = UnicodeClassifier.CodePointOffset(text, isolation.Utf16End),
                    Kind = kind,
                };
            }
            else
            {
                merged.Add(isolation);
            }
        }
        return merged;
    }

    private static void AddNormalizedPiece(
        string text,
        List<BidiIsolation> split,
        BidiIsolation template,
        int originalStart,
        int originalEnd)
    {
        var (start, end) = TrimNeutralBoundaries(text, originalStart, originalEnd);
        if (start >= end) return;
        split.Add(template with
        {
            Text = text[start..end],
            Utf16Start = start,
            Utf16End = end,
            CodePointStart = UnicodeClassifier.CodePointOffset(text, start),
            CodePointEnd = UnicodeClassifier.CodePointOffset(text, end),
        });
    }

    private static BidiSecurityReport ScanSecurity(string text)
    {
        var metadata = new Dictionary<int, (string Name, string Risk)>
        {
            [0x061C] = ("ARABIC LETTER MARK", "low"), [0x200E] = ("LEFT-TO-RIGHT MARK", "low"),
            [0x200F] = ("RIGHT-TO-LEFT MARK", "low"), [0x202A] = ("LEFT-TO-RIGHT EMBEDDING", "high"),
            [0x202B] = ("RIGHT-TO-LEFT EMBEDDING", "high"), [0x202C] = ("POP DIRECTIONAL FORMATTING", "medium"),
            [0x202D] = ("LEFT-TO-RIGHT OVERRIDE", "high"), [0x202E] = ("RIGHT-TO-LEFT OVERRIDE", "high"),
            [0x2066] = ("LEFT-TO-RIGHT ISOLATE", "medium"), [0x2067] = ("RIGHT-TO-LEFT ISOLATE", "medium"),
            [0x2068] = ("FIRST STRONG ISOLATE", "medium"), [0x2069] = ("POP DIRECTIONAL ISOLATE", "medium"),
        };
        var controls = new List<BidiControlFinding>();
        foreach (var (rune, utf16, _) in UnicodeClassifier.Enumerate(text))
        {
            if (!metadata.TryGetValue(rune.Value, out var value)) continue;
            controls.Add(new(
                rune.ToString(),
                $"U+{rune.Value:X4}",
                utf16,
                utf16 + rune.Utf16SequenceLength,
                value.Name,
                value.Risk));
        }
        return new(!controls.Any(control => control.Risk == "high"), controls);
    }

    [GeneratedRegex(@"\b[A-Za-z][A-Za-z0-9_.-]*\b", RegexOptions.CultureInvariant)]
    private static partial Regex IdentifierPattern();
}
