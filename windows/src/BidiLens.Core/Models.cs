namespace BidiLens;

public enum BidiDirection
{
    Neutral,
    LeftToRight,
    RightToLeft,
}

public enum BidiDetectionStrategy
{
    ContentMajority,
    FirstStrong,
    StrictUax9,
    Inherit,
    LeftToRight,
    RightToLeft,
}

public enum BidiIntervention
{
    Auto,
    Always,
}

public enum BidiAlignment
{
    Preserve,
    ContentStart,
    PhysicalLeft,
    PhysicalRight,
    Center,
    Justify,
}

public sealed record BidiOptions
{
    public BidiDetectionStrategy Strategy { get; init; } = BidiDetectionStrategy.ContentMajority;
    public BidiDirection Fallback { get; init; } = BidiDirection.Neutral;
    public BidiDirection InheritedDirection { get; init; } = BidiDirection.LeftToRight;
    public int MinimumStrongCharacters { get; init; } = 1;
    public double MajorityThreshold { get; init; } = 0.5;
    public bool ExcludeTechnicalTokens { get; init; } = true;
    public IReadOnlySet<string> TechnicalIdentifiers { get; init; } = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
    public BidiIntervention Intervention { get; init; } = BidiIntervention.Auto;

    internal void Validate()
    {
        if (InheritedDirection == BidiDirection.Neutral)
            throw new ArgumentException("InheritedDirection must be LeftToRight or RightToLeft.");
        if (MinimumStrongCharacters < 1)
            throw new ArgumentOutOfRangeException(nameof(MinimumStrongCharacters));
        if (MajorityThreshold is < 0.5 or > 1.0)
            throw new ArgumentOutOfRangeException(nameof(MajorityThreshold));
    }
}

public readonly record struct StrongCharacterCounts(int LeftToRight, int RightToLeft)
{
    public int Total => LeftToRight + RightToLeft;
}

public enum TechnicalTokenKind
{
    Code,
    Url,
    Email,
    Path,
    Version,
    Hash,
    Identifier,
    Number,
    Command,
    Math,
    Html,
}

public sealed record TechnicalTokenRange(string Text, int Start, int End, TechnicalTokenKind Kind);

public enum BidiIsolationKind
{
    Code,
    Url,
    Email,
    Path,
    Version,
    Hash,
    Identifier,
    Number,
    Command,
    Math,
    Html,
    OppositeDirectionRun,
}

public sealed record BidiIsolation(
    string Text,
    BidiDirection Direction,
    int Utf16Start,
    int Utf16End,
    int CodePointStart,
    int CodePointEnd,
    BidiIsolationKind Kind);

public sealed record BidiControlFinding(
    string Character,
    string CodePoint,
    int Utf16Start,
    int Utf16End,
    string Name,
    string Risk);

public sealed record BidiSecurityReport(bool Safe, IReadOnlyList<BidiControlFinding> Controls);

public sealed record BidiAnalysis(
    string Text,
    BidiDirection Direction,
    BidiDirection ResolvedDirection,
    BidiDirection FirstStrong,
    BidiDirection RawFirstStrong,
    StrongCharacterCounts Counts,
    StrongCharacterCounts RawCounts,
    double Confidence,
    bool Mixed,
    bool InterventionRequired,
    IReadOnlyList<TechnicalTokenRange> TechnicalTokens,
    IReadOnlyList<BidiIsolation> Isolations,
    BidiSecurityReport Security);

public sealed record BidiPresentation(
    BidiAnalysis Analysis,
    BidiDirection Direction,
    BidiAlignment Alignment);
