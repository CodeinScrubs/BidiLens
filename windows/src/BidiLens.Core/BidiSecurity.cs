namespace BidiLens;

public static partial class BidiAnalyzer
{
    private static readonly IReadOnlyDictionary<int, (string Name, string Risk, string Category)> ControlMetadata =
        new Dictionary<int, (string, string, string)>
        {
            [0x061c] = ("ARABIC LETTER MARK", "low", "DIRECTIONAL_MARK"),
            [0x200e] = ("LEFT-TO-RIGHT MARK", "low", "DIRECTIONAL_MARK"),
            [0x200f] = ("RIGHT-TO-LEFT MARK", "low", "DIRECTIONAL_MARK"),
            [0x202a] = ("LEFT-TO-RIGHT EMBEDDING", "high", "EMBEDDING_CONTROL"),
            [0x202b] = ("RIGHT-TO-LEFT EMBEDDING", "high", "EMBEDDING_CONTROL"),
            [0x202c] = ("POP DIRECTIONAL FORMATTING", "medium", "POP_CONTROL"),
            [0x202d] = ("LEFT-TO-RIGHT OVERRIDE", "high", "OVERRIDE_CONTROL"),
            [0x202e] = ("RIGHT-TO-LEFT OVERRIDE", "high", "OVERRIDE_CONTROL"),
            [0x2066] = ("LEFT-TO-RIGHT ISOLATE", "medium", "ISOLATE_CONTROL"),
            [0x2067] = ("RIGHT-TO-LEFT ISOLATE", "medium", "ISOLATE_CONTROL"),
            [0x2068] = ("FIRST STRONG ISOLATE", "medium", "ISOLATE_CONTROL"),
            [0x2069] = ("POP DIRECTIONAL ISOLATE", "medium", "POP_CONTROL"),
            [0x206a] = ("INHIBIT SYMMETRIC SWAPPING", "medium", "DEPRECATED_CONTROL"),
            [0x206b] = ("ACTIVATE SYMMETRIC SWAPPING", "medium", "DEPRECATED_CONTROL"),
            [0x206c] = ("INHIBIT ARABIC FORM SHAPING", "medium", "DEPRECATED_CONTROL"),
            [0x206d] = ("ACTIVATE ARABIC FORM SHAPING", "medium", "DEPRECATED_CONTROL"),
            [0x206e] = ("NATIONAL DIGIT SHAPES", "medium", "DEPRECATED_CONTROL"),
            [0x206f] = ("NOMINAL DIGIT SHAPES", "medium", "DEPRECATED_CONTROL"),
        };

    private static bool ContainsBidiControls(string text) => text.Any(value => ControlMetadata.ContainsKey(value));
    private sealed record FormattingFrame(bool IsIsolate, BidiControlFinding Control);
    private static bool IsAsciiIdentifier(char value) => value is >= 'A' and <= 'Z' or >= 'a' and <= 'z'
        or >= '0' and <= '9' or '_' or '$';

    /// <summary>
    /// Audits hidden formatting without rewriting text or enforcing a blocking policy.
    /// Safe means no high-severity finding, not proof that text is harmless.
    /// </summary>
    public static BidiSecurityReport ScanSecurity(string text, BidiSecurityMode mode = BidiSecurityMode.Audit)
    {
        ArgumentNullException.ThrowIfNull(text);
        if (!Enum.IsDefined(mode)) throw new ArgumentOutOfRangeException(nameof(mode));
        if (mode == BidiSecurityMode.Off) return new(true, []) { Mode = mode };
        var controls = new List<BidiControlFinding>();
        var findings = new List<BidiSecurityFinding>();
        var stack = new List<FormattingFrame>();
        var isolates = new Stack<int>();

        void AddControl(string code, BidiControlFinding control, string message, string remediation,
            BidiSecuritySeverity severity = BidiSecuritySeverity.High) =>
            findings.Add(new(code, severity, message, control.Utf16Start, control.Utf16End,
                control.CodePointIndex, control.CodePointIndex + 1, remediation));

        void FinishParagraph(bool endOfText)
        {
            foreach (var frame in stack)
                AddControl(frame.IsIsolate ? "BIDI_UNCLOSED_ISOLATE" : "BIDI_UNCLOSED_EMBEDDING",
                    frame.Control,
                    $"{frame.Control.Name} is not terminated before {(endOfText ? "the end of the text" : "the paragraph boundary")}.",
                    frame.IsIsolate ? "Add the matching PDI or remove the isolate opener."
                        : "Add the matching PDF or remove the embedding/override opener.");
            stack.Clear();
            isolates.Clear();
        }

        foreach (var (rune, utf16, codePointIndex) in UnicodeClassifier.Enumerate(text))
        {
            var value = rune.Value;
            // U+2028 is a line separator, not a UAX #9 paragraph boundary.
            if (value is 0x0a or 0x0d or 0x85 or >= 0x1c and <= 0x1e or 0x2029)
                FinishParagraph(false);
            if (ControlMetadata.TryGetValue(value, out var metadata))
            {
                var control = new BidiControlFinding(rune.ToString(), $"U+{value:X4}", utf16,
                    utf16 + rune.Utf16SequenceLength, metadata.Name, metadata.Risk) { CodePointIndex = codePointIndex };
                controls.Add(control);
                AddControl($"BIDI_{metadata.Category}", control,
                    $"{control.Name} ({control.CodePoint}) is invisible and changes bidirectional interpretation.",
                    "Remove the control unless a documented plain-text protocol requires it; prefer semantic markup and isolation.",
                    metadata.Risk == "high" ? BidiSecuritySeverity.High
                        : metadata.Risk == "medium" ? BidiSecuritySeverity.Warning : BidiSecuritySeverity.Info);
                switch (value)
                {
                    case 0x202a or 0x202b or 0x202d or 0x202e:
                        stack.Add(new(false, control));
                        break;
                    case 0x2066 or 0x2067 or 0x2068:
                        isolates.Push(stack.Count);
                        stack.Add(new(true, control));
                        break;
                    case 0x202c:
                        if (stack.Count == 0 || stack[^1].IsIsolate)
                            AddControl("BIDI_UNMATCHED_PDF", control,
                                "POP DIRECTIONAL FORMATTING has no matching active embedding or override.",
                                "Remove the unmatched PDF or add the intended opener within the same isolate.");
                        else stack.RemoveAt(stack.Count - 1);
                        break;
                    case 0x2069:
                        if (!isolates.TryPop(out var isolateIndex))
                            AddControl("BIDI_UNMATCHED_PDI", control,
                                "POP DIRECTIONAL ISOLATE has no matching isolate opener.",
                                "Remove the unmatched PDI or add the intended LRI, RLI, or FSI opener.");
                        else
                        {
                            // Each frame is removed once; PDF never scans across an isolate.
                            for (var index = isolateIndex + 1; index < stack.Count; index++)
                                AddControl("BIDI_FORMAT_CROSSES_ISOLATE_BOUNDARY", stack[index].Control,
                                    $"{stack[index].Control.Name} is not closed before the containing isolate ends.",
                                    "Close the embedding or override with PDF before PDI.");
                            stack.RemoveRange(isolateIndex, stack.Count - isolateIndex);
                        }
                        break;
                }
            }

            void AddHidden(string code, BidiSecuritySeverity severity, string message, string remediation) =>
                findings.Add(new(code, severity, message, utf16, utf16 + rune.Utf16SequenceLength,
                    codePointIndex, codePointIndex + 1, remediation));
            switch (value)
            {
                case 0x200b:
                    AddHidden("HIDDEN_ZERO_WIDTH_SPACE", BidiSecuritySeverity.Warning,
                        "ZERO WIDTH SPACE (U+200B) is hidden and can disguise identifiers, links, or filenames.",
                        "Remove it from identifiers and source-like content unless its use is explicitly required.");
                    break;
                case 0x200c or 0x200d when utf16 > 0 && utf16 + 1 < text.Length
                    && IsAsciiIdentifier(text[utf16 - 1]) && IsAsciiIdentifier(text[utf16 + 1]):
                    AddHidden("HIDDEN_IDENTIFIER_JOINER", BidiSecuritySeverity.Warning,
                        $"{(value == 0x200c ? "ZERO WIDTH NON-JOINER" : "ZERO WIDTH JOINER")} is hidden inside an ASCII identifier-like token.",
                        "Remove the joiner from machine identifiers, or document and validate the identifier protocol that requires it.");
                    break;
                case 0x2060:
                    AddHidden("HIDDEN_WORD_JOINER", BidiSecuritySeverity.Info,
                        "WORD JOINER (U+2060) is invisible and can disguise token boundaries.",
                        "Confirm that non-breaking behavior is required; remove it from identifiers and source-like content.");
                    break;
                case 0xfeff when codePointIndex > 0:
                    AddHidden("HIDDEN_MIDSTREAM_BOM", BidiSecuritySeverity.Warning,
                        "ZERO WIDTH NO-BREAK SPACE/BOM (U+FEFF) appears inside the text.",
                        "Remove the midstream BOM unless a documented protocol explicitly requires it.");
                    break;
            }
        }
        FinishParagraph(true);
        findings.Sort((left, right) => left.Utf16Start != right.Utf16Start
            ? left.Utf16Start.CompareTo(right.Utf16Start) : string.CompareOrdinal(left.Code, right.Code));
        var safe = !findings.Any(finding => finding.Severity == BidiSecuritySeverity.High);
        return new(safe, controls.AsReadOnly())
        {
            Mode = mode,
            ShouldBlock = mode == BidiSecurityMode.Strict ? findings.Count > 0 : mode == BidiSecurityMode.Warn && !safe,
            Findings = findings.AsReadOnly(),
        };
    }
}
