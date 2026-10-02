import XCTest
@testable import BidiLens

final class TokenBoundaryTests: XCTestCase {
    func testBoundaryQueriesAndAdditivePhrasesRemainWhole() {
        for literal in [#"\bTB\b"#, "[[:<:]]TB[[:>:]]"] {
            let source = "برای جستجوی واژه، \(literal) را وارد کنید."
            XCTAssertEqual(BidiAnalyzer.findTechnicalTokenRanges(source).filter { $0.kind == .code }.map(\.text), [literal])
            XCTAssertEqual(BidiAnalyzer.analyze(source).isolations.map(\.text), [literal])
        }
        for literal in [#"\bTB"#, #"\bTB\bSuffix"#, #"prefix\bTB\b"#, #"\\bTB\b"#, "[[:<:]]TB", "[[:<:]]TB[[:>:]]Suffix"] {
            XCTAssertEqual(BidiAnalyzer.findTechnicalTokenRanges(literal).filter { $0.kind == .code }.map(\.text), [])
        }
        XCTAssertEqual(BidiAnalyzer.analyze("دفاع IgM + complement مهم است.").isolations.map(\.text), ["IgM + complement"])
        for literal in [#"\bTB\b"#, "[[:<:]]TB[[:>:]]"] {
            for word in ["é", "ش", "²", "Ⅳ", "𝒜", "𐒠"] {
                for source in [word + literal, literal + word] {
                    XCTAssertEqual(BidiAnalyzer.findTechnicalTokenRanges(source).filter { $0.kind == .code }.map(\.text), [], source)
                }
            }
        }
        for separator in [": ", ", ", " → ", "\n+ ", "\u{2029}+ "] {
            XCTAssertFalse(BidiAnalyzer.analyze("دفاع IgM\(separator)complement مهم است.").isolations.contains { $0.text.contains(separator) })
        }
        XCTAssertEqual(BidiAnalyzer.analyze(#"Use \bTB\b + complement"#).isolations.count, 0)
    }

    func testMathWhitespaceMatchesOtherCores() {
        for space in ["\u{feff}", "\u{a0}", "\u{202f}"] {
            for source in ["$\(space)x$", "$x\(space)$"] {
                XCTAssertEqual(BidiAnalyzer.findTechnicalTokenRanges(source).filter { $0.kind == .math }.map(\.text), [])
            }
        }
        for content in ["\u{85}", "\u{1c}"] {
            let source = "$\(content)x$"
            XCTAssertEqual(BidiAnalyzer.findTechnicalTokenRanges(source).filter { $0.kind == .math }.map(\.text), [source])
        }
    }

    func testAmountsRangesAndQuotesStayIntact() {
        for token in ["$10", "€12.50", "£25", "۱۰€", "10-20", "10–20", "-10--2", "۱۰-۲۰", "١٠-٢٠", "1,000,000", "۱٬۰۰۰٬۰۰۰", "۱۲۳٫۴۵", "50%", "۵۰٪", "%50", "٪۵۰"] {
            let source = "👋 مقدار \(token) است."
            let ranges = BidiAnalyzer.analyze(source).isolations
            XCTAssertEqual(ranges.map(\.text), [token], token)
            if let range = ranges.first {
                XCTAssertEqual(UnicodeClassifier.substring(source, utf16Range: range.utf16Range), token)
            }
        }
        for quote in ["\"", "'", "“", "”", "«", "»"] {
            XCTAssertEqual(BidiAnalyzer.findTechnicalTokenRanges("مسیر \(quote)/usr/local/bin\(quote) است.").map(\.text), ["/usr/local/bin"])
        }
    }

    func testDisplayMathPreservesParagraphSafeIsolation() {
        for math in ["$$\nx = y\n$$", "$$\r\nx = y\r\n$$", "\\[\nx = y\n\\]", "\\[x = y\\]"] {
            let source = "سلام \(math) تمام"
            XCTAssertEqual(BidiAnalyzer.findTechnicalTokenRanges(source).filter { $0.kind == .math }.map(\.text), [math])
            for isolation in BidiAnalyzer.analyze(source).isolations {
                XCTAssertFalse(isolation.text.contains("\n") || isolation.text.contains("\r"))
                XCTAssertEqual(UnicodeClassifier.substring(source, utf16Range: isolation.utf16Range), isolation.text)
            }
        }
        for source in ["$x\ny$", "\\(x\ny\\)", "\\\\[x\\]", "\\[x", "$$\nx"] {
            XCTAssertEqual(BidiAnalyzer.findTechnicalTokenRanges(source).filter { $0.kind == .math }.map(\.text), [])
        }
    }

    func testCurrencyProseAndEscapedDollarsAreNotMath() {
        for source in ["$ x$", "$x $", "$10 and $20", "\\$x\\$"] {
            XCTAssertEqual(BidiAnalyzer.findTechnicalTokenRanges(source).filter { $0.kind == .math }.map(\.text), [], source)
        }
        XCTAssertEqual(BidiAnalyzer.findTechnicalTokenRanges("هزینه این کتاب $10 و آن یکی $20 است.").map(\.text), ["$10", "$20"])
        for (source, expected) in [("قیمت $10 است و $x+1$ درست است.", "$x+1$"), ("$x\\$y$", "$x\\$y$")] {
            XCTAssertEqual(BidiAnalyzer.findTechnicalTokenRanges(source).filter { $0.kind == .math }.map(\.text), [expected])
        }
    }
}
