import XCTest
@testable import BidiLens

final class BidiLensTests: XCTestCase {
    func testFlagshipAndMirrorDirections() {
        let flagship = "React یک کتابخانه جاوااسکریپت بسیار محبوب است."
        let mirror = "The Persian word کتاب means book."
        XCTAssertEqual(BidiAnalyzer.detectDirection(flagship), .rightToLeft)
        XCTAssertEqual(BidiAnalyzer.detectDirection(mirror), .leftToRight)
        XCTAssertEqual(BidiAnalyzer.detectDirection("---"), .neutral)
        XCTAssertTrue(BidiAnalyzer.analyze(flagship).isolations.contains { $0.text == "React" })
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
