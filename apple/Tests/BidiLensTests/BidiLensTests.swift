import XCTest
@testable import BidiLens

final class BidiLensTests: XCTestCase {
    func testConservativeCommandRecognition() {
        for source in ["go is a verb that means رفتن.", "python is a language for humans زبان.", "git is a great tool ابزار."] {
            XCTAssertFalse(BidiAnalyzer.findTechnicalTokenRanges(source).contains { $0.kind == .command })
        }
        for source in ["npm install", "pnpm run test", "git status", "go run main.go", "python -m pip", "node script.js"] {
            XCTAssertTrue(BidiAnalyzer.findTechnicalTokenRanges(source).contains { $0.kind == .command })
        }
    }

    func testStrategyDefaultAndExplicitTechnicalExclusion() {
        for strategy in [BidiDetectionStrategy.firstStrong, .strictUAX9] {
            var options = BidiOptions(strategy: strategy)
            XCTAssertEqual(BidiAnalyzer.analyze("React فارسی", options: options).direction, .leftToRight)
            options.excludeTechnicalTokens = true
            XCTAssertEqual(BidiAnalyzer.analyze("React فارسی", options: options).direction, .rightToLeft)
            options.excludeTechnicalTokens = false
            XCTAssertEqual(BidiAnalyzer.analyze("React فارسی", options: options).direction, .leftToRight)
        }
        var automatic = BidiOptions()
        automatic.strategy = .firstStrong
        XCTAssertFalse(automatic.excludeTechnicalTokens)
        automatic.strategy = .contentMajority
        XCTAssertTrue(automatic.excludeTechnicalTokens)
    }

    func testStrictUax9SkipsIsolatesAndResetsAtParagraphs() {
        let options = BidiOptions(strategy: .strictUAX9)
        for source in ["\u{2067}עברית\u{2069} ordinary", "\u{2067}א\u{2066}ABC\u{2069}ב\u{2069} ordinary"] {
            XCTAssertEqual(BidiAnalyzer.analyze(source, options: options).direction, .leftToRight)
        }
        XCTAssertEqual(BidiAnalyzer.analyze("\u{2067}עברית ordinary", options: options).direction, .neutral)
        for separator in ["\n", "\r\n", "\r", "\u{85}", "\u{1c}", "\u{1d}", "\u{1e}", "\u{2029}"] {
            XCTAssertEqual(BidiAnalyzer.analyze("\u{2067}עברית\(separator)ordinary", options: options).direction, .leftToRight)
        }
    }

    func testUrlTrailingClosersPreserveOnlyBalancedDelimiters() {
        for (source, expected) in [
            ("برو https://example.com/foo)]!", "https://example.com/foo"),
            ("برو https://example.com/foo(bar).", "https://example.com/foo(bar)"),
            ("برو https://example.com/foo(bar))].", "https://example.com/foo(bar)")
        ] {
            XCTAssertEqual(BidiAnalyzer.findTechnicalTokenRanges(source).first { $0.kind == .url }?.text, expected)
        }
    }

    func testUnclosedIsolateIsNotReportedSafe() {
        XCTAssertFalse(BidiAnalyzer.analyze("\u{2066}unfinished").security.safe)
    }

    func testIsolationRangesStayInsideParagraphs() {
        for separator in ["\n", "\r\n", "\r", "\u{85}", "\u{1c}", "\u{1d}", "\u{1e}", "\u{2029}"] {
            let result = BidiAnalyzer.analyze("سلام React\(separator)JavaScript")
            XCTAssertEqual(result.isolations.map(\.text), ["React", "JavaScript"])
        }
    }

    func testFlagshipAndMirrorDirections() {
        let flagship = "React یک کتابخانه جاوااسکریپت بسیار محبوب است."
        let mirror = "The Persian word کتاب means book."
        XCTAssertEqual(BidiAnalyzer.detectDirection(flagship), .rightToLeft)
        XCTAssertEqual(BidiAnalyzer.detectDirection(mirror), .leftToRight)
        XCTAssertEqual(BidiAnalyzer.detectDirection("---"), .neutral)
        XCTAssertTrue(BidiAnalyzer.analyze(flagship).isolations.contains { $0.text == "React" })
    }

    func testOppositeDirectionIsolationKeepsTrailingCombiningMarks() {
        let isolations = BidiAnalyzer.analyze("The word مثلاً appears here.").isolations
        XCTAssertTrue(isolations.contains {
            $0.text == "مثلاً"
                && $0.direction == .rightToLeft
                && $0.kind == .oppositeDirectionRun
        })
    }

    func testNaturalLanguageEvidenceIsNotMistakenForIdentifiers() {
        let compounds = "The well-known state-of-the-art open-source کتابخانه"
        XCTAssertEqual(BidiAnalyzer.detectDirection(compounds), .leftToRight)
        XCTAssertTrue(BidiAnalyzer.findTechnicalTokenRanges(compounds).isEmpty)

        let emphasized = "PLEASE READ THIS IMPORTANT WARNING کتاب"
        XCTAssertEqual(BidiAnalyzer.detectDirection(emphasized), .leftToRight)
        XCTAssertTrue(BidiAnalyzer.findTechnicalTokenRanges(emphasized).isEmpty)

        let acronyms = BidiAnalyzer.findTechnicalTokenRanges("Use the HTTP API for this")
        XCTAssertEqual(acronyms.map(\.text), ["HTTP", "API"])
        XCTAssertEqual(
            BidiAnalyzer.findTechnicalTokenRanges("HTTP API").map(\.text),
            ["HTTP", "API"]
        )
        XCTAssertEqual(
            BidiAnalyzer.findTechnicalTokenRanges("react-markdown").map(\.text),
            ["react-markdown"]
        )
    }

    func testPhysicalLeftDoesNotChangeRTLDirection() {
        let presentation = BidiAnalyzer.presentation(
            "این متن فارسی در سمت چپ باقی می‌ماند.",
            alignment: .physicalLeft
        )
        XCTAssertEqual(presentation.direction, .rightToLeft)
        XCTAssertEqual(presentation.alignment, .physicalLeft)
    }

    func testPureLTRIsStrictNoOp() {
        let source = "Plain English text."
        let analysis = BidiAnalyzer.analyze(source)
        XCTAssertFalse(analysis.interventionRequired)
        XCTAssertEqual(BidiAnalyzer.formatForDisplay(analysis), source)
    }

    func testSourceAndUTF16RangesSurviveEmoji() {
        let source = "سلام 👩🏽‍💻 React"
        let analysis = BidiAnalyzer.analyze(source)
        XCTAssertEqual(analysis.text, source)
        XCTAssertTrue(analysis.isolations.allSatisfy {
            $0.utf16Range.lowerBound >= 0
                && $0.utf16Range.upperBound <= (source as NSString).length
        })
    }

    func testSharedCorpus() throws {
        struct ExpectedIsolation: Decodable, Equatable {
            let text: String
            let direction: String
            let kind: String
        }
        struct CorpusCase: Decodable {
            let id: String
            let text: String
            let expected: String
            let expectedIsolations: [ExpectedIsolation]?
        }
        let url = try XCTUnwrap(Bundle.module.url(forResource: "cases", withExtension: "json"))
        let cases = try JSONDecoder().decode([CorpusCase].self, from: Data(contentsOf: url))
        XCTAssertEqual(cases.count, 932)
        for item in cases {
            let expected: BidiDirection = switch item.expected {
            case "rtl": .rightToLeft
            case "ltr": .leftToRight
            default: .neutral
            }
            XCTAssertEqual(
                BidiAnalyzer.detectDirection(item.text),
                expected,
                "Corpus case \(item.id)"
            )
            if let expectedIsolations = item.expectedIsolations {
                let actual = BidiAnalyzer.analyze(item.text).isolations.map {
                    ExpectedIsolation(
                        text: $0.text,
                        direction: $0.direction == .rightToLeft ? "rtl" : "ltr",
                        kind: $0.kind == .oppositeDirectionRun
                            ? "opposite-direction-run"
                            : $0.kind.rawValue
                    )
                }
                XCTAssertEqual(actual, expectedIsolations, "Corpus isolation case \(item.id)")
            }
        }
    }
}
