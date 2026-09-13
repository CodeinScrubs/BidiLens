import Foundation

extension BidiAnalyzer {
    private static let controlMetadata: [UInt32: (name: String, risk: String, category: String)] = [
        0x061c: ("ARABIC LETTER MARK", "low", "DIRECTIONAL_MARK"),
        0x200e: ("LEFT-TO-RIGHT MARK", "low", "DIRECTIONAL_MARK"),
        0x200f: ("RIGHT-TO-LEFT MARK", "low", "DIRECTIONAL_MARK"),
        0x202a: ("LEFT-TO-RIGHT EMBEDDING", "high", "EMBEDDING_CONTROL"),
        0x202b: ("RIGHT-TO-LEFT EMBEDDING", "high", "EMBEDDING_CONTROL"),
        0x202c: ("POP DIRECTIONAL FORMATTING", "medium", "POP_CONTROL"),
        0x202d: ("LEFT-TO-RIGHT OVERRIDE", "high", "OVERRIDE_CONTROL"),
        0x202e: ("RIGHT-TO-LEFT OVERRIDE", "high", "OVERRIDE_CONTROL"),
        0x2066: ("LEFT-TO-RIGHT ISOLATE", "medium", "ISOLATE_CONTROL"),
        0x2067: ("RIGHT-TO-LEFT ISOLATE", "medium", "ISOLATE_CONTROL"),
        0x2068: ("FIRST STRONG ISOLATE", "medium", "ISOLATE_CONTROL"),
        0x2069: ("POP DIRECTIONAL ISOLATE", "medium", "POP_CONTROL"),
        0x206a: ("INHIBIT SYMMETRIC SWAPPING", "medium", "DEPRECATED_CONTROL"),
        0x206b: ("ACTIVATE SYMMETRIC SWAPPING", "medium", "DEPRECATED_CONTROL"),
        0x206c: ("INHIBIT ARABIC FORM SHAPING", "medium", "DEPRECATED_CONTROL"),
        0x206d: ("ACTIVATE ARABIC FORM SHAPING", "medium", "DEPRECATED_CONTROL"),
        0x206e: ("NATIONAL DIGIT SHAPES", "medium", "DEPRECATED_CONTROL"),
        0x206f: ("NOMINAL DIGIT SHAPES", "medium", "DEPRECATED_CONTROL"),
    ]

    static func containsBidiControls(_ text: String) -> Bool {
        text.unicodeScalars.contains { controlMetadata[$0.value] != nil }
    }

    private struct FormattingFrame {
        let isIsolate: Bool
        let control: BidiControlFinding
    }

    private static func isASCIIIdentifier(_ value: UInt32) -> Bool {
        (0x41...0x5a).contains(value) || (0x61...0x7a).contains(value)
            || (0x30...0x39).contains(value) || value == 0x5f || value == 0x24
    }

    /// Audits hidden formatting without rewriting text or enforcing a blocking policy.
    /// `safe` means no high-severity finding, not proof that text is harmless.
    public static func scanSecurity(
        _ text: String,
        mode: BidiSecurityMode = .audit
    ) -> BidiSecurityReport {
        if mode == .off {
            return BidiSecurityReport(safe: true, controls: [], mode: mode, shouldBlock: false, findings: [])
        }
        var controls: [BidiControlFinding] = []
        var findings: [BidiSecurityFinding] = []
        var stack: [FormattingFrame] = []
        var isolates: [Int] = []

        func addControl(
            _ code: String, _ control: BidiControlFinding, _ message: String, _ remediation: String,
            severity: BidiSecuritySeverity = .high
        ) {
            findings.append(BidiSecurityFinding(
                code: code, severity: severity, message: message, utf16Range: control.utf16Range,
                codePointRange: control.codePointIndex..<(control.codePointIndex + 1), remediation: remediation
            ))
        }

        func finishParagraph(endOfText: Bool) {
            let boundary = endOfText ? "the end of the text" : "the paragraph boundary"
            for frame in stack {
                addControl(
                    frame.isIsolate ? "BIDI_UNCLOSED_ISOLATE" : "BIDI_UNCLOSED_EMBEDDING", frame.control,
                    "\(frame.control.name) is not terminated before \(boundary).",
                    frame.isIsolate ? "Add the matching PDI or remove the isolate opener."
                        : "Add the matching PDF or remove the embedding/override opener."
                )
            }
            stack.removeAll(keepingCapacity: true)
            isolates.removeAll(keepingCapacity: true)
        }

        let items = UnicodeClassifier.enumerate(text)
        for (index, item) in items.enumerated() {
            let value = item.scalar.value
            // U+2028 is a line separator, not a UAX #9 paragraph boundary.
            if [0x0a, 0x0d, 0x85, 0x1c, 0x1d, 0x1e, 0x2029].contains(value) {
                finishParagraph(endOfText: false)
            }
            if let metadata = controlMetadata[value] {
                let control = BidiControlFinding(
                    character: String(item.scalar), codePoint: String(format: "U+%04X", value),
                    utf16Range: item.utf16..<(item.utf16 + 1), name: metadata.name,
                    risk: metadata.risk, codePointIndex: item.codePoint
                )
                controls.append(control)
                addControl(
                    "BIDI_\(metadata.category)", control,
                    "\(control.name) (\(control.codePoint)) is invisible and changes bidirectional interpretation.",
                    "Remove the control unless a documented plain-text protocol requires it; prefer semantic markup and isolation.",
                    severity: metadata.risk == "high" ? .high : metadata.risk == "medium" ? .warning : .info
                )
                switch value {
                case 0x202a, 0x202b, 0x202d, 0x202e:
                    stack.append(FormattingFrame(isIsolate: false, control: control))
                case 0x2066, 0x2067, 0x2068:
                    isolates.append(stack.count)
                    stack.append(FormattingFrame(isIsolate: true, control: control))
                case 0x202c:
                    if stack.last?.isIsolate == false {
                        stack.removeLast()
                    } else {
                        addControl("BIDI_UNMATCHED_PDF", control,
                            "POP DIRECTIONAL FORMATTING has no matching active embedding or override.",
                            "Remove the unmatched PDF or add the intended opener within the same isolate.")
                    }
                case 0x2069:
                    if let isolateIndex = isolates.popLast() {
                        // Each frame is removed once; PDF never scans across an isolate.
                        for index in (isolateIndex + 1)..<stack.count {
                            addControl("BIDI_FORMAT_CROSSES_ISOLATE_BOUNDARY", stack[index].control,
                                "\(stack[index].control.name) is not closed before the containing isolate ends.",
                                "Close the embedding or override with PDF before PDI.")
                        }
                        stack.removeSubrange(isolateIndex...)
                    } else {
                        addControl("BIDI_UNMATCHED_PDI", control,
                            "POP DIRECTIONAL ISOLATE has no matching isolate opener.",
                            "Remove the unmatched PDI or add the intended LRI, RLI, or FSI opener.")
                    }
                default: break
                }
            }

            func addHidden(_ code: String, _ severity: BidiSecuritySeverity, _ message: String, _ remediation: String) {
                findings.append(BidiSecurityFinding(
                    code: code, severity: severity, message: message,
                    utf16Range: item.utf16..<(item.utf16 + (value > 0xffff ? 2 : 1)),
                    codePointRange: item.codePoint..<(item.codePoint + 1), remediation: remediation
                ))
            }
            switch value {
            case 0x200b:
                addHidden("HIDDEN_ZERO_WIDTH_SPACE", .warning,
                    "ZERO WIDTH SPACE (U+200B) is hidden and can disguise identifiers, links, or filenames.",
                    "Remove it from identifiers and source-like content unless its use is explicitly required.")
            case 0x200c, 0x200d:
                if index > 0 && index + 1 < items.count
                    && isASCIIIdentifier(items[index - 1].scalar.value)
                    && isASCIIIdentifier(items[index + 1].scalar.value) {
                    let name = value == 0x200c ? "ZERO WIDTH NON-JOINER" : "ZERO WIDTH JOINER"
                    addHidden("HIDDEN_IDENTIFIER_JOINER", .warning,
                        "\(name) is hidden inside an ASCII identifier-like token.",
                        "Remove the joiner from machine identifiers, or document and validate the identifier protocol that requires it.")
                }
            case 0x2060:
                addHidden("HIDDEN_WORD_JOINER", .info,
                    "WORD JOINER (U+2060) is invisible and can disguise token boundaries.",
                    "Confirm that non-breaking behavior is required; remove it from identifiers and source-like content.")
            case 0xfeff where item.codePoint > 0:
                addHidden("HIDDEN_MIDSTREAM_BOM", .warning,
                    "ZERO WIDTH NO-BREAK SPACE/BOM (U+FEFF) appears inside the text.",
                    "Remove the midstream BOM unless a documented protocol explicitly requires it.")
            default: break
            }
        }
        finishParagraph(endOfText: true)
        findings.sort {
            $0.utf16Range.lowerBound == $1.utf16Range.lowerBound
                ? $0.code < $1.code : $0.utf16Range.lowerBound < $1.utf16Range.lowerBound
        }
        let safe = !findings.contains { $0.severity == .high }
        return BidiSecurityReport(
            safe: safe, controls: controls, mode: mode,
            shouldBlock: mode == .strict ? !findings.isEmpty : mode == .warn && !safe, findings: findings
        )
    }
}
