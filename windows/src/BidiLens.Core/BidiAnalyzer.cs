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

    private const string NumericValue = @"[0-9\u0660-\u0669\u06F0-\u06F9]+(?:[.,\u066B\u066C][0-9\u0660-\u0669\u06F0-\u06F9]+)*";
    private static readonly (Regex Regex, TechnicalTokenKind Kind)[] TechnicalPatterns =
    [
        (Pattern(@"```[\s\S]*?```|~~~[\s\S]*?~~~|`+[^`\r\n]+`+"), TechnicalTokenKind.Code),
        (Pattern(@"(?<![\\\p{L}\p{N}_])\\b[A-Za-z0-9_-]+\\b(?![\\\p{L}\p{N}_])"), TechnicalTokenKind.Code),
        (Pattern(@"(?<![\\\p{L}\p{N}_])\[\[:<:\]\][A-Za-z0-9_-]+\[\[:>:\]\](?![\\\p{L}\p{N}_])"), TechnicalTokenKind.Code),
        (Pattern(@"</?[A-Za-z][^<>\r\n]*>"), TechnicalTokenKind.Html),
        (Pattern(@"(?<![A-Za-z0-9_])(?:https?|ftp)://[^\s<>{}""']+", RegexOptions.IgnoreCase), TechnicalTokenKind.Url),
        (Pattern(@"(?<![\p{L}\p{N}_])(?:[A-Za-z]:[\\/]|\.{0,2}/|~/)[^\s<>()\[\]{}""'“”‘’«»]+"), TechnicalTokenKind.Path),
        (Pattern(@"(?<![A-Za-z0-9_@])@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*", RegexOptions.IgnoreCase), TechnicalTokenKind.Identifier),
        (Pattern(@"(?:\$\{?[A-Z_][A-Z0-9_]*\}?|%[A-Z_][A-Z0-9_]*%)"), TechnicalTokenKind.Identifier),
        (Pattern(@"(?<![A-Za-z0-9_])(?:npm|pnpm|yarn|npx|git|pip|python|node|cargo|go|docker|kubectl)(?:[ \t]+(?:--?[A-Za-z0-9_-]+|[@./\\A-Za-z0-9_:=+-]+|'[^'\r\n]*'|""[^""\r\n]*""))+"), TechnicalTokenKind.Command),
        (Pattern(@"(?<![A-Za-z0-9_])(?:[0-9]{1,3}\.){3}[0-9]{1,3}(?![A-Za-z0-9_])"), TechnicalTokenKind.Number),
        (Pattern(@"(?<![\p{L}\p{N}_])\+?[0-9][0-9 ()-]{6,}[0-9](?![\p{L}\p{N}_])"), TechnicalTokenKind.Number),
        (Pattern(@"(?<![A-Za-z0-9_])[0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2}(?:[T ][0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?(?:Z|[+-][0-9]{2}:?[0-9]{2})?)?(?![A-Za-z0-9_])"), TechnicalTokenKind.Number),
        (Pattern(@"(?<![A-Za-z0-9_])[0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?(?:\s?[AP]M)?(?![A-Za-z0-9_])", RegexOptions.IgnoreCase), TechnicalTokenKind.Number),
        (Pattern(@"(?<![\p{L}\p{N}_])(?:\p{Sc}[+-]?" + NumericValue + @"|[+-]?" + NumericValue + @"\p{Sc})(?![\p{L}\p{N}_])"), TechnicalTokenKind.Number),
        (Pattern(@"(?<![\p{L}\p{N}_])(?:[+-]?" + NumericValue + @"[%٪]|[%٪][+-]?" + NumericValue + @")(?![\p{L}\p{N}_])"), TechnicalTokenKind.Number),
        (Pattern(@"(?<![\p{L}\p{N}_])[+-]?" + NumericValue + "[-–][+-]?" + NumericValue + @"(?![\p{L}\p{N}_])"), TechnicalTokenKind.Number),
        (Pattern(@"(?<![A-Za-z0-9_])v?[0-9]+(?:\.[0-9]+){1,}(?![A-Za-z0-9_])"), TechnicalTokenKind.Version),
        (Pattern(@"(?<![A-Za-z0-9_])[0-9a-f]{7,40}(?![A-Za-z0-9_])", RegexOptions.IgnoreCase), TechnicalTokenKind.Hash),
        (Pattern(@"(?<![\p{L}\p{N}_])[+-]?" + NumericValue + @"(?![\p{L}\p{N}_])"), TechnicalTokenKind.Number),
    ];

    private static Regex Pattern(string value, RegexOptions options = RegexOptions.None) =>
        new(value, options | RegexOptions.CultureInvariant, TimeSpan.FromSeconds(1));
    private static readonly Regex CommandPrefix = Pattern(@"^([a-z]+)[ \t]+('[^']*'|""[^""]*""|[^ \t]+)");

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
        if (options.Intervention == BidiIntervention.Always || ContainsBidiControls(text)) return true;
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
        AddMathRanges(text, ranges);
        AddEmailAndRelativePathRanges(text, ranges);
        var normalizedCustomIdentifiers = customIdentifiers is null
            ? null
            : new HashSet<string>(customIdentifiers, StringComparer.OrdinalIgnoreCase);
        foreach (var (regex, kind) in TechnicalPatterns)
        {
            foreach (Match match in regex.Matches(text))
            {
                if (kind == TechnicalTokenKind.Command)
                {
                    var prefix = CommandPrefix.Match(match.Value);
                    if (!prefix.Success || !TechnicalCommands.IsCommandArgument(prefix.Groups[1].Value, prefix.Groups[2].Value)) continue;
                }
                var length = match.Length;
                if (kind is TechnicalTokenKind.Url or TechnicalTokenKind.Path)
                {
                    length = TrimTechnicalSuffix(match.Value, kind == TechnicalTokenKind.Url);
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
        var uppercaseProse = UsesUppercaseProse(text);
        foreach (Match match in IdentifierPattern().Matches(text))
        {
            var token = match.Value;
            var technical = IsKnownTechnicalWord(token, normalizedCustomIdentifiers)
                // A hyphenated token is technical when a segment is itself a known
                // technical word ("react-markdown"), not merely because it is
                // hyphenated: "well-known" is ordinary English direction evidence.
                || (token.Contains('-') && token.Split('-').Any(segment =>
                    segment.Length > 0 && IsKnownTechnicalWord(segment, normalizedCustomIdentifiers)))
                // Only digits, underscores, and dots are structural identifier syntax.
                || token.Any(character => char.IsDigit(character) || character is '_' or '.')
                || Regex.IsMatch(token, "[a-z][A-Z]", RegexOptions.CultureInvariant)
                || (!uppercaseProse
                    && token.Length >= 2
                    && token.Length <= AcronymMaximumLength
                    && token.All(character => character is >= 'A' and <= 'Z'));
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

    private static bool IsAsciiWord(char value) => value is >= 'A' and <= 'Z' or >= 'a' and <= 'z'
        or >= '0' and <= '9' or '_';

    // .NET's invariant ASCII ignore-case ranges also include Kelvin sign, but
    // do not include long s. Keep the former regex's native compatibility.
    private static bool IsEmailLetter(char value) => value is >= 'A' and <= 'Z' or >= 'a' and <= 'z' or '\u212a';
    private static bool IsEmailWord(char value) => IsEmailLetter(value) || value is >= '0' and <= '9' or '_';
    private static bool IsEmailLocal(char value) => IsEmailWord(value) || value is '.' or '%' or '+' or '-';
    private static bool IsEmailDomain(char value) => IsEmailLetter(value) || value is >= '0' and <= '9' or '.' or '-';
    private static bool IsRelativePathCharacter(char value) => IsAsciiWord(value) || value is '.' or '-' or '/' or '\\';

    private static void AddEmailAndRelativePathRanges(string text, List<TechnicalTokenRange> ranges)
    {
        // Consume each lexical run once. A missing @ or path separator must not
        // restart a greedy failed suffix search at every dot in untrusted prose.
        var runStart = 0;
        while (runStart < text.Length)
        {
            if (!IsEmailLocal(text[runStart]) && text[runStart] != '@') { runStart++; continue; }
            var runEnd = runStart + 1;
            while (runEnd < text.Length && (IsEmailLocal(text[runEnd]) || text[runEnd] == '@')) runEnd++;
            var localStart = runStart;
            for (var at = runStart; at < runEnd; at++)
            {
                if (text[at] != '@') continue;
                while (localStart < at && (!IsEmailWord(text[localStart])
                    || localStart > 0 && IsEmailWord(text[localStart - 1]))) localStart++;
                var cursor = at + 1;
                var dot = -1;
                var candidate = -1;
                var alphabetic = false;
                while (cursor < runEnd && IsEmailDomain(text[cursor]))
                {
                    var character = text[cursor];
                    if (character == '.') { dot = cursor; alphabetic = true; }
                    else if (!IsEmailLetter(character)) alphabetic = false;
                    cursor++;
                    if (alphabetic && dot > at + 1 && cursor - dot - 1 >= 2
                        && (cursor == text.Length || !IsEmailWord(text[cursor]))) candidate = cursor;
                }
                var matched = localStart < at && candidate > 0;
                if (matched) ranges.Add(new(text[localStart..candidate], localStart, candidate, TechnicalTokenKind.Email));
                // A successful domain is already consumed. Failed candidates
                // may become a later local part, matching legacy non-overlap.
                localStart = matched ? candidate : at + 1;
                at = cursor - 1;
            }
            runStart = runEnd;
        }

        runStart = 0;
        while (runStart < text.Length)
        {
            if (!IsRelativePathCharacter(text[runStart])) { runStart++; continue; }
            var runEnd = runStart + 1;
            while (runEnd < text.Length && IsRelativePathCharacter(text[runEnd])) runEnd++;
            var start = runStart;
            void Append(int end)
            {
                while (start < end && !IsAsciiWord(text[start])) start++;
                while (end > start && !IsAsciiWord(text[end - 1])) end--;
                var separator = start;
                while (separator < end && text[separator] is not ('/' or '\\')) separator++;
                if (separator < end) ranges.Add(new(text[start..end], start, end, TechnicalTokenKind.Path));
            }
            for (var index = runStart; index < runEnd; index++)
            {
                if (text[index] is not ('/' or '\\')) continue;
                if (index == start || text[index - 1] is '/' or '\\')
                {
                    Append(index);
                    start = index + 1;
                }
            }
            Append(runEnd);
            runStart = runEnd;
        }
    }

    private static int TrimTechnicalSuffix(string value, bool trimUnmatchedClosers)
    {
        var balance = new int[3];
        if (trimUnmatchedClosers)
            foreach (var character in value)
            {
                var opening = "([{".IndexOf(character);
                var closing = ")]}".IndexOf(character);
                if (opening >= 0) balance[opening]++;
                if (closing >= 0) balance[closing]--;
            }
        var length = value.Length;
        while (length > 0)
        {
            var character = value[length - 1];
            if (".,;:!?،؛؟。।۔".Contains(character)) { length--; continue; }
            var closing = ")]}".IndexOf(character);
            if (!trimUnmatchedClosers || closing < 0 || balance[closing] >= 0) break;
            balance[closing]++;
            length--;
        }
        return length;
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
        var isolateDepth = 0;
        foreach (var (rune, utf16Index, _) in UnicodeClassifier.Enumerate(text))
        {
            if (options.Strategy == BidiDetectionStrategy.StrictUax9)
            {
                if (rune.Value is 0x0a or 0x0d or 0x85 or 0x1c or 0x1d or 0x1e or 0x2029) isolateDepth = 0;
                else if (rune.Value is 0x2066 or 0x2067 or 0x2068) { isolateDepth++; continue; }
                else if (rune.Value == 0x2069) { isolateDepth = Math.Max(0, isolateDepth - 1); continue; }
                else if (isolateDepth > 0) continue;
            }
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
        // Technical recognizers end at their lexical token, which may be
        // followed by combining marks (including an emoji keycap's VS16/Me).
        // Keep those marks inside the display isolate and subtract the same
        // extended ranges when planning opposite runs to avoid overlaps.
        var displayTechnical = technical.Select(range =>
        {
            var end = range.End;
            while (end < text.Length)
            {
                var rune = UnicodeClassifier.RuneAt(text, end);
                if (!UnicodeClassifier.IsCombiningMark(rune.Value)) break;
                end += rune.Utf16SequenceLength;
            }
            return end == range.End ? range : range with { Text = text[range.Start..end], End = end };
        }).ToArray();
        var result = displayTechnical.Select(range => new BidiIsolation(
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
            while (technicalIndex < displayTechnical.Length && displayTechnical[technicalIndex].End <= run.Start)
                technicalIndex++;
            var cursor = run.Start;
            var index = technicalIndex;
            while (index < displayTechnical.Length)
            {
                var range = displayTechnical[index];
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
            var rune = UnicodeClassifier.RuneAt(text, start);
            if (UnicodeClassifier.ClassifyNatural(rune.Value) != BidiDirection.Neutral
                || UnicodeClassifier.IsCombiningMark(rune.Value))
                break;
            start += rune.Utf16SequenceLength;
        }
        while (end > start)
        {
            var runeStart = end - 1;
            if (char.IsLowSurrogate(text[runeStart])
                && runeStart > start
                && char.IsHighSurrogate(text[runeStart - 1]))
                runeStart--;
            var rune = UnicodeClassifier.RuneAt(text, runeStart);
            if (UnicodeClassifier.ClassifyNatural(rune.Value) != BidiDirection.Neutral
                || UnicodeClassifier.IsCombiningMark(rune.Value))
                break;
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
                var rune = UnicodeClassifier.RuneAt(text, cursor);
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
            var gap = previous is not null && previous.Utf16End <= isolation.Utf16Start
                ? text[previous.Utf16End..isolation.Utf16Start] : null;
            var orderedGap = gap is not null && (gap.All(char.IsWhiteSpace)
                || (previous?.Direction == BidiDirection.LeftToRight && gap.Trim(' ', '\t') == "+"));
            if (previous is not null && previous.Direction == isolation.Direction && orderedGap)
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
        var paragraphs = new List<BidiIsolation>();
        foreach (var isolation in merged)
        {
            var start = isolation.Utf16Start;
            void Append(int end)
            {
                if (start >= end) return;
                paragraphs.Add(isolation with
                {
                    Text = text[start..end], Utf16Start = start, Utf16End = end,
                    CodePointStart = UnicodeClassifier.CodePointOffset(text, start),
                    CodePointEnd = UnicodeClassifier.CodePointOffset(text, end),
                });
            }
            for (var index = isolation.Utf16Start; index < isolation.Utf16End; index++)
            {
                if (text[index] is '\r' or '\n' or '\u0085' or >= '\u001c' and <= '\u001e' or '\u2029')
                {
                    Append(index);
                    start = index + 1;
                }
            }
            if (start == isolation.Utf16Start) paragraphs.Add(isolation);
            else Append(isolation.Utf16End);
        }
        return paragraphs;
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

    /// <summary>
    /// Acronyms are short. A longer all-capital word is emphasized prose, not an
    /// identifier, and must keep deciding the natural-language base direction.
    /// </summary>
    private const int AcronymMaximumLength = 5;

    private static bool IsKnownTechnicalWord(string value, IReadOnlySet<string>? custom) =>
        DefaultTechnicalIdentifiers.Contains(value) || custom?.Contains(value) == true;

    /// <summary>
    /// Reports whether capitals are the block's prose style rather than an
    /// identifier signal. <c>PLEASE READ THIS WARNING</c> is emphasized natural
    /// language; the same <c>API</c> token inside mixed-case prose is an acronym.
    /// </summary>
    private static bool UsesUppercaseProse(string text)
    {
        var total = 0;
        var capitalized = 0;
        var hasLongCapitalizedWord = false;
        foreach (Match match in ProseWordPattern().Matches(text))
        {
            total += 1;
            if (!match.Value.All(character => character is >= 'A' and <= 'Z')) continue;
            capitalized += 1;
            if (match.Value.Length > AcronymMaximumLength) hasLongCapitalizedWord = true;
        }
        // `HTTP API` is an acronym sequence, not proof of uppercase prose.
        return total >= 2 && hasLongCapitalizedWord && capitalized * 2 > total;
    }

    [GeneratedRegex(@"(?<![A-Za-z0-9_])[A-Za-z][A-Za-z0-9_.-]*(?<=[A-Za-z0-9_])(?![A-Za-z0-9_])", RegexOptions.CultureInvariant)]
    private static partial Regex IdentifierPattern();

    [GeneratedRegex(@"(?<![A-Za-z0-9_])[A-Za-z]{2,}(?![A-Za-z0-9_])", RegexOptions.CultureInvariant)]
    private static partial Regex ProseWordPattern();
}
