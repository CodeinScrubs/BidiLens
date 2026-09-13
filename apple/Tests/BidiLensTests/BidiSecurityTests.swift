import XCTest
@testable import BidiLens

final class BidiSecurityTests: XCTestCase {
    func testBalanceAndModes() {
        let report = BidiAnalyzer.scanSecurity("\u{2066}hello", mode: .warn)
        XCTAssertFalse(report.safe)
        XCTAssertTrue(report.shouldBlock)
        XCTAssertTrue(report.findings.contains { $0.code == "BIDI_UNCLOSED_ISOLATE" })
        XCTAssertTrue(BidiAnalyzer.scanSecurity("\u{2066}hello\u{2069}").safe)
        XCTAssertFalse(BidiAnalyzer.scanSecurity("\u{2069}").safe)
        XCTAssertFalse(BidiAnalyzer.scanSecurity("\u{202c}").safe)
        XCTAssertFalse(BidiAnalyzer.scanSecurity("\u{2066}hello").shouldBlock)
        XCTAssertTrue(BidiAnalyzer.scanSecurity("\u{200e}", mode: .strict).shouldBlock)
        XCTAssertFalse(BidiAnalyzer.scanSecurity("\u{200e}", mode: .warn).shouldBlock)
    }

    func testParagraphBoundariesAndNestedFormatting() {
        for separator in ["\n", "\r\n", "\r", "\u{85}", "\u{1c}", "\u{1d}", "\u{1e}", "\u{2029}"] {
            let report = BidiAnalyzer.scanSecurity("\u{2066}a\(separator)b\u{2069}")
            XCTAssertTrue(report.findings.contains { $0.code == "BIDI_UNCLOSED_ISOLATE" })
            XCTAssertTrue(report.findings.contains { $0.code == "BIDI_UNMATCHED_PDI" })
        }
        XCTAssertTrue(BidiAnalyzer.scanSecurity("\u{2066}a\u{2028}b\u{2069}").safe)
        let nested = BidiAnalyzer.scanSecurity("\u{2066}\u{202b}hello\u{2069}")
        XCTAssertTrue(nested.findings.contains { $0.code == "BIDI_FORMAT_CROSSES_ISOLATE_BOUNDARY" })
        XCTAssertFalse(nested.findings.contains { $0.code == "BIDI_UNCLOSED_EMBEDDING" })
        let protected = BidiAnalyzer.scanSecurity("\u{202b}\u{2066}\u{202c}\u{2069}\u{202c}")
        XCTAssertEqual(protected.findings.filter { $0.code == "BIDI_UNMATCHED_PDF" }.count, 1)
        XCTAssertFalse(protected.findings.contains { $0.code.hasPrefix("BIDI_UNCLOSED") })
    }

    func testHiddenCharactersAndEmojiOffsets() throws {
        XCTAssertTrue(BidiAnalyzer.scanSecurity("می\u{200c}روم 👩🏽‍💻").findings.isEmpty)
        XCTAssertEqual(BidiAnalyzer.scanSecurity("a\u{200c}b").findings.first?.code, "HIDDEN_IDENTIFIER_JOINER")
        XCTAssertTrue(BidiAnalyzer.scanSecurity("\u{feff}hello").findings.isEmpty)
        XCTAssertEqual(BidiAnalyzer.scanSecurity("hello\u{feff}").findings.first?.code, "HIDDEN_MIDSTREAM_BOM")
        let emoji = try XCTUnwrap(BidiAnalyzer.scanSecurity("👋\u{2069}").findings.first {
            $0.code == "BIDI_UNMATCHED_PDI"
        })
        XCTAssertEqual(emoji.utf16Range, 2..<3)
        XCTAssertEqual(emoji.codePointRange, 1..<2)
    }

    func testAuditDoesNotActivateOrRewriteLTRRendering() {
        let source = "Plain English a\u{200b}b"
        let analysis = BidiAnalyzer.analyze(source)
        XCTAssertEqual(analysis.text, source)
        XCTAssertFalse(analysis.interventionRequired)
        XCTAssertEqual(BidiAnalyzer.formatForDisplay(analysis), source)
        XCTAssertEqual(analysis.security.findings.first?.code, "HIDDEN_ZERO_WIDTH_SPACE")
    }

    func testDeepIsolatesDoNotMakePDFScanAcrossTheStack() {
        let report = BidiAnalyzer.scanSecurity(
            String(repeating: "\u{2066}", count: 32_000) + String(repeating: "\u{202c}", count: 32_000)
        )
        XCTAssertEqual(report.findings.filter { $0.code == "BIDI_UNMATCHED_PDF" }.count, 32_000)
        XCTAssertEqual(report.findings.filter { $0.code == "BIDI_UNCLOSED_ISOLATE" }.count, 32_000)
    }

    func testWebSecurityDifferentialCorpus() throws {
        let url = try XCTUnwrap(Bundle.module.url(forResource: "native-security", withExtension: "json"))
        let fixtures = try JSONDecoder().decode([SecurityFixture].self, from: Data(contentsOf: url))
        XCTAssertEqual(fixtures.count, 94)
        for fixture in fixtures {
            for mode in BidiSecurityMode.allCases {
                let report = BidiAnalyzer.scanSecurity(fixture.text, mode: mode)
                let off = mode == .off
                XCTAssertEqual(report.mode, mode, fixture.id)
                XCTAssertEqual(report.safe, off || fixture.safe, fixture.id)
                XCTAssertEqual(report.shouldBlock, mode == .strict ? !fixture.findings.isEmpty
                    : mode == .warn && !fixture.safe, fixture.id)
                XCTAssertEqual(report.findings.count, off ? 0 : fixture.findings.count, fixture.id)
                XCTAssertEqual(report.controls.count, off ? 0 : fixture.controls.count, fixture.id)
                if off { continue }
                for (actual, expected) in zip(report.findings, fixture.findings) {
                    XCTAssertEqual(actual.code, expected.code, fixture.id)
                    XCTAssertEqual(actual.severity.rawValue, expected.severity, fixture.id)
                    XCTAssertEqual(actual.utf16Range, expected.utf16Start..<expected.utf16End, fixture.id)
                    XCTAssertEqual(actual.codePointRange, expected.codePointStart..<expected.codePointEnd, fixture.id)
                    XCTAssertFalse(actual.message.isEmpty, fixture.id)
                    XCTAssertFalse(actual.remediation.isEmpty, fixture.id)
                }
                for (actual, expected) in zip(report.controls, fixture.controls) {
                    XCTAssertEqual(actual.codePoint, expected.codePoint, fixture.id)
                    XCTAssertEqual(actual.utf16Range, expected.utf16Start..<expected.utf16End, fixture.id)
                    XCTAssertEqual(actual.codePointIndex, expected.codePointIndex, fixture.id)
                    XCTAssertEqual(actual.name, expected.name, fixture.id)
                    XCTAssertEqual(actual.risk, expected.risk, fixture.id)
                    XCTAssertEqual(actual.character, (fixture.text as NSString).substring(with: NSRange(
                        location: actual.utf16Range.lowerBound, length: actual.utf16Range.count
                    )), fixture.id)
                }
            }
        }
    }
}

private struct SecurityFixture: Decodable {
    let id: String
    let text: String
    let safe: Bool
    let controls: [ExpectedControl]
    let findings: [ExpectedFinding]
}

private struct ExpectedControl: Decodable {
    let codePoint: String
    let utf16Start: Int
    let utf16End: Int
    let codePointIndex: Int
    let name: String
    let risk: String

    init(from decoder: Decoder) throws {
        var fields = try decoder.unkeyedContainer()
        codePoint = try fields.decode(String.self)
        utf16Start = try fields.decode(Int.self)
        utf16End = try fields.decode(Int.self)
        codePointIndex = try fields.decode(Int.self)
        name = try fields.decode(String.self)
        risk = try fields.decode(String.self)
    }
}

private struct ExpectedFinding: Decodable {
    let code: String
    let severity: String
    let utf16Start: Int
    let utf16End: Int
    let codePointStart: Int
    let codePointEnd: Int

    init(from decoder: Decoder) throws {
        var fields = try decoder.unkeyedContainer()
        code = try fields.decode(String.self)
        severity = try fields.decode(String.self)
        utf16Start = try fields.decode(Int.self)
        utf16End = try fields.decode(Int.self)
        codePointStart = try fields.decode(Int.self)
        codePointEnd = try fields.decode(Int.self)
    }
}
