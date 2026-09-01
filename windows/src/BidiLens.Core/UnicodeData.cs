using System.Text;

namespace BidiLens;

public static class BidiUnicodeData
{
    public const string Version = GeneratedBidiRanges.UnicodeVersion;
    public const string BidiSha256 = GeneratedBidiRanges.BidiSha256;
    public const string GeneralCategorySha256 = GeneratedBidiRanges.GeneralCategorySha256;
}

internal static class UnicodeClassifier
{
    private static bool Contains(int[] ranges, int codePoint)
    {
        var low = 0;
        var high = ranges.Length / 2 - 1;
        while (low <= high)
        {
            var middle = (low + high) >>> 1;
            var start = ranges[middle * 2];
            var end = ranges[middle * 2 + 1];
            if (codePoint < start) high = middle - 1;
            else if (codePoint > end) low = middle + 1;
            else return true;
        }
        return false;
    }

    internal static BidiDirection ClassifyStrong(int value)
    {
        if (Contains(GeneratedBidiRanges.NonStrong, value)) return BidiDirection.Neutral;
        return Contains(GeneratedBidiRanges.Rtl, value)
            ? BidiDirection.RightToLeft
            : BidiDirection.LeftToRight;
    }

    internal static BidiDirection ClassifyNatural(int value) =>
        Contains(GeneratedBidiRanges.NaturalLetters, value)
            ? ClassifyStrong(value)
            : BidiDirection.Neutral;

    internal static bool IsCombiningMark(int value) =>
        Contains(GeneratedBidiRanges.CombiningMarks, value);

    internal static IEnumerable<(Rune Rune, int Utf16Index, int CodePointIndex)> Enumerate(string text)
    {
        var utf16 = 0;
        var codePoint = 0;
        foreach (var rune in text.EnumerateRunes())
        {
            yield return (rune, utf16, codePoint);
            utf16 += rune.Utf16SequenceLength;
            codePoint++;
        }
    }

    internal static int CodePointOffset(string text, int utf16Offset)
    {
        if (utf16Offset < 0 || utf16Offset > text.Length) throw new ArgumentOutOfRangeException(nameof(utf16Offset));
        var count = 0;
        var consumed = 0;
        foreach (var rune in text.EnumerateRunes())
        {
            if (consumed >= utf16Offset) break;
            consumed += rune.Utf16SequenceLength;
            count++;
        }
        return count;
    }
}
