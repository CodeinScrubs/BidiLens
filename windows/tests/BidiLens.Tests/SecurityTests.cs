using System.IO;
using System.Text.Json;
using BidiLens;

internal static class SecurityTests
{
    internal static int Run()
    {
        var assertions = 0;
        void Check(bool value, string message)
        {
            assertions++;
            if (!value) throw new InvalidOperationException(message);
        }
        var unclosed = BidiAnalyzer.ScanSecurity("\u2066hello", BidiSecurityMode.Warn);
        Check(!unclosed.Safe && unclosed.ShouldBlock, "unclosed isolate: warn mode");
        Check(unclosed.Findings.Any(value => value.Code == "BIDI_UNCLOSED_ISOLATE"), "unclosed isolate diagnostic");
        Check(BidiAnalyzer.ScanSecurity("\u2066hello\u2069").Safe, "balanced isolate is not high risk");
        Check(!BidiAnalyzer.ScanSecurity("\u2069").Safe, "unmatched PDI must be high risk");
        Check(!BidiAnalyzer.ScanSecurity("\u202c").Safe, "unmatched PDF must be high risk");
        Check(BidiAnalyzer.ScanSecurity("می\u200cروم 👩🏽‍💻").Findings.Count == 0, "legitimate joiners are not identifiers");
        Check(BidiAnalyzer.ScanSecurity("a\u200cb").Findings.Single().Code == "HIDDEN_IDENTIFIER_JOINER", "ASCII joiner");
        Check(BidiAnalyzer.ScanSecurity("\ufeffhello").Findings.Count == 0, "leading BOM");
        Check(BidiAnalyzer.ScanSecurity("hello\ufeff").Findings.Single().Code == "HIDDEN_MIDSTREAM_BOM", "midstream BOM");
        var emoji = BidiAnalyzer.ScanSecurity("👋\u2069").Findings.Single(value => value.Code == "BIDI_UNMATCHED_PDI");
        Check(emoji.Utf16Start == 2 && emoji.Utf16End == 3 && emoji.CodePointStart == 1 && emoji.CodePointEnd == 2,
            "emoji-aware finding offsets");
        foreach (var separator in new[] { "\n", "\r\n", "\r", "\u0085", "\u001c", "\u001d", "\u001e", "\u2029" })
        {
            var report = BidiAnalyzer.ScanSecurity($"\u2066a{separator}b\u2069");
            Check(report.Findings.Any(value => value.Code == "BIDI_UNCLOSED_ISOLATE"), "paragraph opener");
            Check(report.Findings.Any(value => value.Code == "BIDI_UNMATCHED_PDI"), "paragraph closer");
        }
        Check(BidiAnalyzer.ScanSecurity("\u2066a\u2028b\u2069").Safe, "line separator keeps the paragraph stack");
        var nested = BidiAnalyzer.ScanSecurity("\u2066\u202bhello\u2069");
        Check(nested.Findings.Any(value => value.Code == "BIDI_FORMAT_CROSSES_ISOLATE_BOUNDARY"), "crossing embedding");
        Check(!nested.Findings.Any(value => value.Code == "BIDI_UNCLOSED_EMBEDDING"), "PDI already consumed the embedding");
        var protectedEmbedding = BidiAnalyzer.ScanSecurity("\u202b\u2066\u202c\u2069\u202c");
        Check(protectedEmbedding.Findings.Count(value => value.Code == "BIDI_UNMATCHED_PDF") == 1, "PDF cannot cross an isolate");
        Check(!protectedEmbedding.Findings.Any(value => value.Code.StartsWith("BIDI_UNCLOSED", StringComparison.Ordinal)), "outer PDF remains available");
        const string source = "Plain English a\u200bb";
        var analysis = BidiAnalyzer.Analyze(source);
        Check(analysis.Text == source && !analysis.InterventionRequired, "security findings do not rewrite or activate LTR rendering");
        Check(BidiAnalyzer.FormatForDisplay(analysis) == source, "LTR display remains unchanged");
        var deep = BidiAnalyzer.ScanSecurity(new string('\u2066', 32_000) + new string('\u202c', 32_000));
        Check(deep.Findings.Count(value => value.Code == "BIDI_UNMATCHED_PDF") == 32_000, "deep unmatched PDFs");
        Check(deep.Findings.Count(value => value.Code == "BIDI_UNCLOSED_ISOLATE") == 32_000, "deep isolate openers");

        using var corpus = JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "native-security.json")));
        Check(corpus.RootElement.GetArrayLength() == 94, "native security fixture count");
        foreach (var fixture in corpus.RootElement.EnumerateArray())
        {
            var id = fixture.GetProperty("id").GetString();
            var text = fixture.GetProperty("text").GetString()!;
            var expectedFindings = fixture.GetProperty("findings");
            var expectedControls = fixture.GetProperty("controls");
            foreach (var mode in Enum.GetValues<BidiSecurityMode>())
            {
                var report = BidiAnalyzer.ScanSecurity(text, mode);
                var off = mode == BidiSecurityMode.Off;
                Check(report.Mode == mode, $"{id}: mode");
                Check(report.Safe == (off || fixture.GetProperty("safe").GetBoolean()), $"{id}: safe");
                Check(report.ShouldBlock == (mode == BidiSecurityMode.Strict ? expectedFindings.GetArrayLength() > 0
                    : mode == BidiSecurityMode.Warn && !fixture.GetProperty("safe").GetBoolean()), $"{id}: shouldBlock");
                Check(report.Findings.Count == (off ? 0 : expectedFindings.GetArrayLength()), $"{id}: finding count");
                Check(report.Controls.Count == (off ? 0 : expectedControls.GetArrayLength()), $"{id}: control count");
                if (off) continue;
                for (var index = 0; index < report.Findings.Count; index++)
                {
                    var actual = report.Findings[index];
                    var expected = expectedFindings[index];
                    Check(actual.Code == expected[0].GetString() && actual.Severity.ToString().ToLowerInvariant() == expected[1].GetString()
                        && actual.Utf16Start == expected[2].GetInt32() && actual.Utf16End == expected[3].GetInt32()
                        && actual.CodePointStart == expected[4].GetInt32() && actual.CodePointEnd == expected[5].GetInt32(), $"{id}: finding {index}");
                    Check(actual.Message.Length > 0 && actual.Remediation.Length > 0, $"{id}: explanation {index}");
                }
                for (var index = 0; index < report.Controls.Count; index++)
                {
                    var actual = report.Controls[index];
                    var expected = expectedControls[index];
                    Check(actual.CodePoint == expected[0].GetString() && actual.Utf16Start == expected[1].GetInt32()
                        && actual.Utf16End == expected[2].GetInt32() && actual.CodePointIndex == expected[3].GetInt32()
                        && actual.Name == expected[4].GetString() && actual.Risk == expected[5].GetString(), $"{id}: control {index}");
                    Check(text[actual.Utf16Start..actual.Utf16End] == actual.Character, $"{id}: source slice {index}");
                }
            }
        }
        return assertions;
    }
}
