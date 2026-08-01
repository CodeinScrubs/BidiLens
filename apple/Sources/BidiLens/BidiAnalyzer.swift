import Foundation

public enum BidiAnalyzer {
    private static let defaultTechnicalIdentifiers: Set<String> = [
        "ai", "api", "anthropic", "chatgpt", "claude", "cli", "codex", "copilot", "cursor",
        "deepseek", "electron", "gemini", "github", "gitlab", "grok", "huggingface", "javascript",
        "json", "llama", "markdown", "mistral", "node", "npm", "openai", "python", "qwen",
        "react", "rust", "svelte", "typescript", "url", "version", "vscode", "vue", "web",
        "webpack", "yaml", "angular", "astro", "chrome", "docker", "esbuild", "eslint",
        "firefox", "kubernetes", "kubectl", "nuxt", "playwright", "pnpm", "preact", "remix",
        "rollup", "safari", "stencil", "storybook", "tailwind", "turbopack", "vite", "vitest",
    ]

    private static let technicalPatterns: [(String, TechnicalTokenKind, NSRegularExpression.Options)] = [
        (#"```[\s\S]*?```|~~~[\s\S]*?~~~|`+[^`\r\n]+`+"#, .code, []),
        (#"</?[A-Za-z][^<>\r\n]*>"#, .html, []),
        (#"\$\$[^\r\n]*?\$\$|\$[^\$\r\n]+\$|\\\([^\r\n]*?\\\)"#, .math, []),
        (#"(?<![A-Za-z0-9_])(?:https?|ftp)://[^\s<>{}"']+"#, .url, [.caseInsensitive]),
        (#"(?<![A-Za-z0-9_])(?=[A-Za-z0-9_])[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}(?![A-Za-z0-9_])"#, .email, [.caseInsensitive]),
        (#"(?<![\p{L}\p{N}_])(?:[A-Za-z]:[\\/]|\.{0,2}/|~/)[^\s<>()\[\]{}]+"#, .path, []),
        (#"(?<![A-Za-z0-9_])(?=[A-Za-z0-9_])(?:[A-Za-z0-9_.-]+[\\/])+(?:[A-Za-z0-9_.-]+)(?<=[A-Za-z0-9_])(?![A-Za-z0-9_])"#, .path, []),
        (#"(?<![A-Za-z0-9_@])@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*"#, .identifier, [.caseInsensitive]),
        (#"(?:\$\{?[A-Z_][A-Z0-9_]*\}?|%[A-Z_][A-Z0-9_]*%)"#, .identifier, []),
        (#"(?<![A-Za-z0-9_])(?:npm|pnpm|yarn|npx|git|pip|python|node|cargo|go|docker|kubectl)(?:\s+(?:--?[A-Za-z0-9_-]+|[@./\\A-Za-z0-9_:=+-]+|'[^'\r\n]*'|"[^"\r\n]*"))+"#, .command, []),
        (#"(?<![A-Za-z0-9_])(?:[0-9]{1,3}\.){3}[0-9]{1,3}(?![A-Za-z0-9_])"#, .number, []),
        (#"(?<![\p{L}\p{N}_])\+?[0-9][0-9 ()-]{6,}[0-9](?![\p{L}\p{N}_])"#, .number, []),
        (#"(?<![A-Za-z0-9_])[0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2}(?:[T ][0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?(?:Z|[+-][0-9]{2}:?[0-9]{2})?)?(?![A-Za-z0-9_])"#, .number, []),
        (#"(?<![A-Za-z0-9_])[0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?(?:\s?[AP]M)?(?![A-Za-z0-9_])"#, .number, [.caseInsensitive]),
        (#"(?<![A-Za-z0-9_])v?[0-9]+(?:\.[0-9]+){1,}(?![A-Za-z0-9_])"#, .version, []),
        (#"(?<![A-Za-z0-9_])[0-9a-f]{7,40}(?![A-Za-z0-9_])"#, .hash, [.caseInsensitive]),
        (#"(?<![\p{L}\p{N}_])[+-]?(?:[0-9]+(?:[.,][0-9]+)?|[\u0660-\u0669]+(?:[\u066B\u066C][\u0660-\u0669]+)?|[\u06F0-\u06F9]+(?:[.,][\u06F0-\u06F9]+)?)(?![\p{L}\p{N}_])"#, .number, []),
    ]

    public static func detectDirection(
        _ text: String,
        options: BidiOptions = BidiOptions()
    ) -> BidiDirection {
        analyze(text, options: options).direction
    }

    public static func analyze(
        _ text: String,
        options: BidiOptions = BidiOptions()
    ) -> BidiAnalysis {
        let technical = options.excludeTechnicalTokens
            ? findTechnicalTokenRanges(text, customIdentifiers: options.technicalIdentifiers)
            : []
        let adjusted = count(text, options: options, technical: technical)
        var rawOptions = options
        rawOptions.excludeTechnicalTokens = false
        let raw = count(text, options: rawOptions, technical: [])
        let direction = resolve(adjusted.counts, first: adjusted.first, options: options)
        let resolved = direction != .neutral
            ? direction
            : options.fallback != .neutral ? options.fallback : options.inheritedDirection
        let intervention = needsIntervention(text, options: options)
        return BidiAnalysis(
            text: text,
            direction: direction,
            resolvedDirection: resolved,
            firstStrong: adjusted.first,
            rawFirstStrong: rawFirstStrong(text),
            counts: adjusted.counts,
            rawCounts: raw.counts,
            confidence: confidence(adjusted.counts, direction: direction),
            mixed: raw.counts.leftToRight > 0 && raw.counts.rightToLeft > 0,
            interventionRequired: intervention,
            technicalTokens: technical,
            isolations: intervention
                ? planInlineIsolation(text, blockDirection: resolved, technical: technical)
                : [],
            security: scanSecurity(text)
        )
    }

    public static func presentation(
        _ text: String,
        alignment: BidiAlignment = .contentStart,
        options: BidiOptions = BidiOptions()
    ) -> BidiPresentation {
        let analysis = analyze(text, options: options)
        return BidiPresentation(
            analysis: analysis,
            direction: analysis.resolvedDirection,
            alignment: alignment
        )
    }

    public static func needsIntervention(
        _ text: String,
        options: BidiOptions = BidiOptions()
    ) -> Bool {
        if options.intervention == .always || !scanSecurity(text).controls.isEmpty { return true }
        var hasLTR = false
        var hasRTL = false
        for item in UnicodeClassifier.enumerate(text) {
            switch UnicodeClassifier.classifyStrong(item.scalar.value) {
            case .leftToRight: hasLTR = true
            case .rightToLeft: hasRTL = true
            case .neutral: break
            }
        }
        return hasRTL || (
            options.inheritedDirection == .rightToLeft && (hasLTR || !text.isEmpty)
        )
    }

    public static func findTechnicalTokenRanges(
        _ text: String,
        customIdentifiers: Set<String> = []
    ) -> [TechnicalTokenRange] {
        let fullRange = NSRange(location: 0, length: (text as NSString).length)
        var ranges: [TechnicalTokenRange] = []
        for (pattern, kind, options) in technicalPatterns {
            guard let regex = try? NSRegularExpression(pattern: pattern, options: options) else { continue }
            for match in regex.matches(in: text, range: fullRange) {
                var length = match.range.length
                if kind == .url || kind == .path {
                    let trailing = CharacterSet(charactersIn: ".,;:!?،؛؟。।۔")
                    let value = (text as NSString).substring(with: match.range) as NSString
                    while length > 0 {
                        let value = UInt32(value.character(at: length - 1))
                        if let scalar = UnicodeScalar(value), trailing.contains(scalar) {
                            length -= 1
                        } else {
                            break
                        }
                    }
                }
                guard length > 0 else { continue }
                let range = match.range.location..<(match.range.location + length)
                let value = UnicodeClassifier.substring(text, utf16Range: range)
                let standaloneFence = kind == .code
                    && (value.hasPrefix("```") || value.hasPrefix("~~~"))
                    && !UnicodeClassifier.enumerate(text).contains {
                        ($0.utf16 < range.lowerBound || $0.utf16 >= range.upperBound)
                            && UnicodeClassifier.classifyNatural($0.scalar.value) != .neutral
                    }
                if standaloneFence {
                    addStandaloneFenceDelimiters(
                        text,
                        range: range,
                        value: value,
                        ranges: &ranges
                    )
                } else {
                    ranges.append(TechnicalTokenRange(
                        text: value,
                        utf16Range: range,
                        kind: kind
                    ))
                }
            }
        }

        if let regex = try? NSRegularExpression(
            pattern: #"(?<![A-Za-z0-9_])[A-Za-z][A-Za-z0-9_.-]*(?<=[A-Za-z0-9_])(?![A-Za-z0-9_])"#,
            options: []
        ) {
            for match in regex.matches(in: text, range: fullRange) {
                let token = (text as NSString).substring(with: match.range)
                let lower = token.lowercased()
                let technical = defaultTechnicalIdentifiers.contains(lower)
                    || customIdentifiers.map { $0.lowercased() }.contains(lower)
                    || token.contains(where: { $0.isNumber || $0 == "_" || $0 == "." || $0 == "-" })
                    || token.unicodeScalars.allSatisfy {
                        !$0.properties.isAlphabetic || CharacterSet.uppercaseLetters.contains($0)
                    }
                    || token.range(of: #"[a-z][A-Z]"#, options: .regularExpression) != nil
                if technical {
                    ranges.append(TechnicalTokenRange(
                        text: token,
                        utf16Range: match.range.location..<(match.range.location + match.range.length),
                        kind: .identifier
                    ))
                }
            }
        }
        ranges.sort {
            $0.utf16Range.lowerBound == $1.utf16Range.lowerBound
                ? $0.utf16Range.upperBound > $1.utf16Range.upperBound
                : $0.utf16Range.lowerBound < $1.utf16Range.lowerBound
        }
        var merged: [TechnicalTokenRange] = []
        for range in ranges {
            if let previous = merged.last, range.utf16Range.lowerBound <= previous.utf16Range.upperBound {
                let combined = previous.utf16Range.lowerBound..<max(
                    previous.utf16Range.upperBound,
                    range.utf16Range.upperBound
                )
                merged[merged.count - 1] = TechnicalTokenRange(
                    text: UnicodeClassifier.substring(text, utf16Range: combined),
                    utf16Range: combined,
                    kind: previous.kind
                )
            } else {
                merged.append(range)
            }
        }
        return merged
    }

    private static func addStandaloneFenceDelimiters(
        _ text: String,
        range: Range<Int>,
        value: String,
        ranges: inout [TechnicalTokenRange]
    ) {
        let units = Array(value.utf16)
        let firstMarkerLength = units.prefix { $0 == 0x60 || $0 == 0x7e }.count
        let firstCodeLength = 2 * (firstMarkerLength / 2)
        if firstCodeLength > 0 {
            let codeRange = range.lowerBound..<(range.lowerBound + firstCodeLength)
            ranges.append(TechnicalTokenRange(
                text: UnicodeClassifier.substring(text, utf16Range: codeRange),
                utf16Range: codeRange,
                kind: .code
            ))
        }

        let closingStart = (units.lastIndex(of: 0x0a).map { $0 + 1 }) ?? 0
        var closingMarkerLength = 0
        while closingStart + closingMarkerLength < units.count
                && (units[closingStart + closingMarkerLength] == 0x60
                    || units[closingStart + closingMarkerLength] == 0x7e) {
            closingMarkerLength += 1
        }
        let closingCodeLength = 2 * (closingMarkerLength / 2)
        if closingCodeLength > 0 {
            let start = range.lowerBound + closingStart
            let codeRange = start..<(start + closingCodeLength)
            ranges.append(TechnicalTokenRange(
                text: UnicodeClassifier.substring(text, utf16Range: codeRange),
                utf16Range: codeRange,
                kind: .code
            ))
        }
    }

    public static func formatForDisplay(_ analysis: BidiAnalysis) -> String {
        guard analysis.interventionRequired, !analysis.isolations.isEmpty else {
            return analysis.text
        }
        let source = analysis.text as NSString
        var output = ""
        var cursor = 0
        for isolation in analysis.isolations.sorted(by: {
            $0.utf16Range.lowerBound < $1.utf16Range.lowerBound
        }) where isolation.utf16Range.lowerBound >= cursor {
            output += source.substring(with: NSRange(
                location: cursor,
                length: isolation.utf16Range.lowerBound - cursor
            ))
            output.append(isolation.direction == .rightToLeft ? "\u{2067}" : "\u{2066}")
            output += source.substring(with: NSRange(
                location: isolation.utf16Range.lowerBound,
                length: isolation.utf16Range.count
            ))
            output.append("\u{2069}")
            cursor = isolation.utf16Range.upperBound
        }
        output += source.substring(from: cursor)
        return output
    }

    private static func count(
        _ text: String,
        options: BidiOptions,
        technical: [TechnicalTokenRange]
    ) -> (counts: StrongCharacterCounts, first: BidiDirection) {
        var ltr = 0
        var rtl = 0
        var first: BidiDirection = .neutral
        var technicalIndex = 0
        let strict = options.strategy == .firstStrong || options.strategy == .strictUAX9
        for item in UnicodeClassifier.enumerate(text) {
            while technicalIndex < technical.count,
                  item.utf16 >= technical[technicalIndex].utf16Range.upperBound {
                technicalIndex += 1
            }
            if technicalIndex < technical.count,
               technical[technicalIndex].utf16Range.contains(item.utf16) {
                continue
            }
            let direction = strict
                ? UnicodeClassifier.classifyStrong(item.scalar.value)
                : UnicodeClassifier.classifyNatural(item.scalar.value)
            if direction == .leftToRight { ltr += 1 }
            if direction == .rightToLeft { rtl += 1 }
            if first == .neutral, direction != .neutral { first = direction }
        }
        return (StrongCharacterCounts(leftToRight: ltr, rightToLeft: rtl), first)
    }

    private static func resolve(
        _ counts: StrongCharacterCounts,
        first: BidiDirection,
        options: BidiOptions
    ) -> BidiDirection {
        switch options.strategy {
        case .leftToRight: return .leftToRight
        case .rightToLeft: return .rightToLeft
        case .inherit: return options.inheritedDirection
        case .firstStrong, .strictUAX9:
            if counts.total < options.minimumStrongCharacters { return options.fallback }
            return first == .neutral ? options.fallback : first
        case .contentMajority:
            if counts.total < options.minimumStrongCharacters { return options.fallback }
            if counts.rightToLeft > counts.leftToRight,
               Double(counts.rightToLeft) / Double(counts.total) >= options.majorityThreshold {
                return .rightToLeft
            }
            if counts.leftToRight > counts.rightToLeft,
               Double(counts.leftToRight) / Double(counts.total) >= options.majorityThreshold {
                return .leftToRight
            }
            return first == .neutral ? options.fallback : first
        }
    }

    private static func confidence(
        _ counts: StrongCharacterCounts,
        direction: BidiDirection
    ) -> Double {
        guard counts.total > 0, direction != .neutral else { return 0 }
        let matching = direction == .rightToLeft ? counts.rightToLeft : counts.leftToRight
        return (Double(matching) / Double(counts.total) * 10_000).rounded() / 10_000
    }

    private static func rawFirstStrong(_ text: String) -> BidiDirection {
        for item in UnicodeClassifier.enumerate(text) {
            let direction = UnicodeClassifier.classifyStrong(item.scalar.value)
            if direction != .neutral { return direction }
        }
        return .neutral
    }

    private static func planInlineIsolation(
        _ text: String,
        blockDirection: BidiDirection,
        technical: [TechnicalTokenRange]
    ) -> [BidiIsolation] {
        var result = technical.map { range in
            BidiIsolation(
                text: range.text,
                direction: .leftToRight,
                utf16Range: range.utf16Range,
                codePointRange: UnicodeClassifier.codePointOffset(
                    text,
                    utf16Offset: range.utf16Range.lowerBound
                )..<UnicodeClassifier.codePointOffset(
                    text,
                    utf16Offset: range.utf16Range.upperBound
                ),
                kind: BidiIsolationKind(rawValue: range.kind.rawValue) ?? .identifier
            )
        }
        var technicalIndex = 0
        for run in segmentDirectionalRuns(text)
        where run.direction != .neutral && run.direction != blockDirection {
            while technicalIndex < technical.count,
                  technical[technicalIndex].utf16Range.upperBound <= run.range.lowerBound {
                technicalIndex += 1
            }
            var cursor = run.range.lowerBound
            var index = technicalIndex
            while index < technical.count {
                let technicalRange = technical[index].utf16Range
                if technicalRange.upperBound <= cursor {
                    index += 1
                    continue
                }
                if technicalRange.lowerBound >= run.range.upperBound { break }
                let partEnd = min(technicalRange.lowerBound, run.range.upperBound)
                if cursor < partEnd {
                    addOppositeRun(
                        text,
                        result: &result,
                        direction: run.direction,
                        originalRange: cursor..<partEnd
                    )
                }
                cursor = max(cursor, technicalRange.upperBound)
                if cursor >= run.range.upperBound { break }
                index += 1
            }
            if cursor < run.range.upperBound {
                addOppositeRun(
                    text,
                    result: &result,
                    direction: run.direction,
                    originalRange: cursor..<run.range.upperBound
                )
            }
        }
        return normalizeIsolationPlan(text, isolations: result)
    }

    private struct DirectionalRun {
        var direction: BidiDirection
        var range: Range<Int>
    }

    private static func segmentDirectionalRuns(_ text: String) -> [DirectionalRun] {
        let items = UnicodeClassifier.enumerate(text)
        guard let firstItem = items.first else { return [] }
        var raw: [DirectionalRun] = []
        var currentDirection = UnicodeClassifier.classifyNatural(firstItem.scalar.value)
        var currentStart = firstItem.utf16
        var currentEnd = firstItem.utf16 + (firstItem.scalar.value > 0xffff ? 2 : 1)

        for item in items.dropFirst() {
            let direction = UnicodeClassifier.classifyNatural(item.scalar.value)
            let end = item.utf16 + (item.scalar.value > 0xffff ? 2 : 1)
            if direction == currentDirection {
                currentEnd = end
            } else {
                raw.append(DirectionalRun(
                    direction: currentDirection,
                    range: currentStart..<currentEnd
                ))
                currentDirection = direction
                currentStart = item.utf16
                currentEnd = end
            }
        }
        raw.append(DirectionalRun(
            direction: currentDirection,
            range: currentStart..<currentEnd
        ))

        var previous = Array(repeating: BidiDirection.neutral, count: raw.count)
        var next = Array(repeating: BidiDirection.neutral, count: raw.count)
        var seen = BidiDirection.neutral
        for index in raw.indices {
            previous[index] = seen
            if raw[index].direction != .neutral { seen = raw[index].direction }
        }
        seen = .neutral
        for index in raw.indices.reversed() {
            next[index] = seen
            if raw[index].direction != .neutral { seen = raw[index].direction }
        }

        var merged: [DirectionalRun] = []
        for index in raw.indices {
            var run = raw[index]
            if run.direction == .neutral {
                run.direction = previous[index] != .neutral ? previous[index] : next[index]
            }
            if let last = merged.last, last.direction == run.direction {
                merged[merged.count - 1].range = last.range.lowerBound..<run.range.upperBound
            } else {
                merged.append(run)
            }
        }
        return merged
    }

    private static func trimNeutralBoundaries(
        _ text: String,
        range: Range<Int>
    ) -> Range<Int> {
        let items = UnicodeClassifier.enumerate(text)
        var start = range.lowerBound
        var end = range.upperBound
        while start < end,
              let item = items.first(where: { $0.utf16 == start }),
              UnicodeClassifier.classifyNatural(item.scalar.value) == .neutral {
            start += item.scalar.value > 0xffff ? 2 : 1
        }
        while end > start,
              let item = items.last(where: { $0.utf16 < end }),
              UnicodeClassifier.classifyNatural(item.scalar.value) == .neutral {
            end = item.utf16
        }
        return start..<end
    }

    private static func addOppositeRun(
        _ text: String,
        result: inout [BidiIsolation],
        direction: BidiDirection,
        originalRange: Range<Int>
    ) {
        let range = trimNeutralBoundaries(text, range: originalRange)
        guard !range.isEmpty else { return }
        result.append(BidiIsolation(
            text: UnicodeClassifier.substring(text, utf16Range: range),
            direction: direction,
            utf16Range: range,
            codePointRange: UnicodeClassifier.codePointOffset(
                text,
                utf16Offset: range.lowerBound
            )..<UnicodeClassifier.codePointOffset(text, utf16Offset: range.upperBound),
            kind: .oppositeDirectionRun
        ))
    }

    private static let hardFragmentSeparators: Set<UInt32> = [
        0x2c, 0x060c, 0x3b, 0x061b, 0x3a, 0x21, 0x3f, 0x061f, 0x7c,
    ]

    private static func normalizeIsolationPlan(
        _ text: String,
        isolations: [BidiIsolation]
    ) -> [BidiIsolation] {
        var split: [BidiIsolation] = []
        for isolation in isolations {
            guard isolation.kind == .oppositeDirectionRun else {
                split.append(isolation)
                continue
            }
            var pieceStart = isolation.utf16Range.lowerBound
            for item in UnicodeClassifier.enumerate(text)
            where isolation.utf16Range.contains(item.utf16) {
                let end = item.utf16 + (item.scalar.value > 0xffff ? 2 : 1)
                if hardFragmentSeparators.contains(item.scalar.value) {
                    addNormalizedPiece(
                        text,
                        split: &split,
                        template: isolation,
                        originalRange: pieceStart..<item.utf16
                    )
                    pieceStart = end
                }
            }
            addNormalizedPiece(
                text,
                split: &split,
                template: isolation,
                originalRange: pieceStart..<isolation.utf16Range.upperBound
            )
        }

        var merged: [BidiIsolation] = []
        for isolation in split.sorted(by: {
            $0.utf16Range.lowerBound == $1.utf16Range.lowerBound
                ? $0.utf16Range.upperBound < $1.utf16Range.upperBound
                : $0.utf16Range.lowerBound < $1.utf16Range.lowerBound
        }) {
            if let previous = merged.last {
                let nonOverlapping = previous.utf16Range.upperBound <= isolation.utf16Range.lowerBound
                let whitespaceGap = nonOverlapping
                    && UnicodeClassifier.substring(
                        text,
                        utf16Range: previous.utf16Range.upperBound..<isolation.utf16Range.lowerBound
                    ).allSatisfy(\.isWhitespace)
                if previous.direction == isolation.direction && whitespaceGap {
                    let range = previous.utf16Range.lowerBound..<isolation.utf16Range.upperBound
                    merged[merged.count - 1] = BidiIsolation(
                        text: UnicodeClassifier.substring(text, utf16Range: range),
                        direction: previous.direction,
                        utf16Range: range,
                        codePointRange: (
                            previous.codePointRange.lowerBound
                        )..<UnicodeClassifier.codePointOffset(
                                text,
                                utf16Offset: range.upperBound
                            ),
                        kind: previous.kind == isolation.kind
                            ? previous.kind
                            : .oppositeDirectionRun
                    )
                    continue
                }
            }
            merged.append(isolation)
        }
        return merged
    }

    private static func addNormalizedPiece(
        _ text: String,
        split: inout [BidiIsolation],
        template: BidiIsolation,
        originalRange: Range<Int>
    ) {
        let range = trimNeutralBoundaries(text, range: originalRange)
        guard !range.isEmpty else { return }
        split.append(BidiIsolation(
            text: UnicodeClassifier.substring(text, utf16Range: range),
            direction: template.direction,
            utf16Range: range,
            codePointRange: UnicodeClassifier.codePointOffset(
                text,
                utf16Offset: range.lowerBound
            )..<UnicodeClassifier.codePointOffset(text, utf16Offset: range.upperBound),
            kind: template.kind
        ))
    }

    private static func scanSecurity(_ text: String) -> BidiSecurityReport {
        let metadata: [UInt32: (String, String)] = [
            0x061c: ("ARABIC LETTER MARK", "low"),
            0x200e: ("LEFT-TO-RIGHT MARK", "low"),
            0x200f: ("RIGHT-TO-LEFT MARK", "low"),
            0x202a: ("LEFT-TO-RIGHT EMBEDDING", "high"),
            0x202b: ("RIGHT-TO-LEFT EMBEDDING", "high"),
            0x202c: ("POP DIRECTIONAL FORMATTING", "medium"),
            0x202d: ("LEFT-TO-RIGHT OVERRIDE", "high"),
            0x202e: ("RIGHT-TO-LEFT OVERRIDE", "high"),
            0x2066: ("LEFT-TO-RIGHT ISOLATE", "medium"),
            0x2067: ("RIGHT-TO-LEFT ISOLATE", "medium"),
            0x2068: ("FIRST STRONG ISOLATE", "medium"),
            0x2069: ("POP DIRECTIONAL ISOLATE", "medium"),
        ]
        let controls = UnicodeClassifier.enumerate(text).compactMap { item -> BidiControlFinding? in
            guard let (name, risk) = metadata[item.scalar.value] else { return nil }
            let width = item.scalar.value > 0xffff ? 2 : 1
            return BidiControlFinding(
                character: String(item.scalar),
                codePoint: String(format: "U+%04X", item.scalar.value),
                utf16Range: item.utf16..<(item.utf16 + width),
                name: name,
                risk: risk
            )
        }
        return BidiSecurityReport(
            safe: !controls.contains(where: { $0.risk == "high" }),
            controls: controls
        )
    }
}
