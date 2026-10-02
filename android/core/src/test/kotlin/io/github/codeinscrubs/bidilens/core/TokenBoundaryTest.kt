package io.github.codeinscrubs.bidilens.core

import org.junit.Assert.assertEquals
import org.junit.Test

class TokenBoundaryTest {
    @Test
    fun boundaryQueriesAndAdditivePhrasesRemainWhole() {
        for (literal in listOf("""\bTB\b""", "[[:<:]]TB[[:>:]]")) {
            val source = "برای جستجوی واژه، $literal را وارد کنید."
            assertEquals(listOf(literal), findTechnicalTokenRanges(source).filter { it.kind == TechnicalTokenKind.CODE }.map { it.text })
            assertEquals(listOf(literal), planInlineIsolation(source, BidiDirection.RTL).map { it.text })
        }
        for (literal in listOf("""\bTB""", """\bTB\bSuffix""", """prefix\bTB\b""", """\\bTB\b""", "[[:<:]]TB", "[[:<:]]TB[[:>:]]Suffix")) {
            assertEquals(emptyList<String>(), findTechnicalTokenRanges(literal).filter { it.kind == TechnicalTokenKind.CODE }.map { it.text })
        }
        assertEquals(listOf("IgM + complement"), planInlineIsolation("دفاع IgM + complement مهم است.", BidiDirection.RTL).map { it.text })
        for (literal in listOf("""\bTB\b""", "[[:<:]]TB[[:>:]]")) {
            for (word in listOf("é", "ش", "²", "Ⅳ")) {
                for (source in listOf(word + literal, literal + word)) {
                    assertEquals(source, emptyList<String>(), findTechnicalTokenRanges(source).filter { it.kind == TechnicalTokenKind.CODE }.map { it.text })
                }
            }
        }
        for (separator in listOf(": ", ", ", " → ", "\n+ ", "\u2029+ ")) {
            assertEquals(false, planInlineIsolation("دفاع IgM${separator}complement مهم است.", BidiDirection.RTL).any { it.text.contains(separator) })
        }
        assertEquals(emptyList<BidiIsolation>(), planInlineIsolation("""Use \bTB\b + complement""", BidiDirection.LTR))
    }

    @Test
    fun conservativeCommandsAndMixedUrlClosers() {
        for (source in listOf("go is a verb that means رفتن.", "python is a language for humans زبان.", "git is a great tool ابزار.")) {
            assertEquals(false, findTechnicalTokenRanges(source).any { it.kind == TechnicalTokenKind.COMMAND })
        }
        for (source in listOf("npm install", "pnpm run test", "git status", "go run main.go", "python -m pip", "node script.js")) {
            assertEquals(true, findTechnicalTokenRanges(source).any { it.kind == TechnicalTokenKind.COMMAND })
        }
        for ((source, expected) in listOf("برو https://example.com/foo)]!" to "https://example.com/foo", "برو https://example.com/foo(bar))]." to "https://example.com/foo(bar)")) {
            assertEquals(expected, findTechnicalTokenRanges(source).first { it.kind == TechnicalTokenKind.URL }.text)
        }
    }

    @Test
    fun mathWhitespaceMatchesOtherCores() {
        for (space in listOf("\ufeff", "\u00a0", "\u202f")) {
            for (source in listOf("\$$space" + "x\$", "\$x$space\$")) {
                assertEquals(emptyList<String>(), findTechnicalTokenRanges(source).filter { it.kind == TechnicalTokenKind.MATH }.map { it.text })
            }
        }
        for (content in listOf("\u0085", "\u001c")) {
            val source = "\$$content" + "x\$"
            assertEquals(listOf(source), findTechnicalTokenRanges(source).filter { it.kind == TechnicalTokenKind.MATH }.map { it.text })
        }
    }

    @Test
    fun amountsRangesAndQuotesStayIntact() {
        for (token in listOf("\$10", "€12.50", "£25", "۱۰€", "10-20", "10–20", "-10--2", "۱۰-۲۰", "١٠-٢٠", "1,000,000", "۱٬۰۰۰٬۰۰۰", "۱۲۳٫۴۵", "50%", "۵۰٪", "%50", "٪۵۰")) {
            val source = "👋 مقدار $token است."
            val ranges = planInlineIsolation(source, BidiDirection.RTL)
            assertEquals(token, listOf(token), ranges.map { it.text })
            assertEquals(token, source.substring(ranges.single().start, ranges.single().end))
        }
        for (quote in listOf("\"", "'", "“", "”", "«", "»")) {
            assertEquals(listOf("/usr/local/bin"), findTechnicalTokenRanges("مسیر $quote/usr/local/bin$quote است.").map { it.text })
        }
    }

    @Test
    fun displayMathPreservesParagraphSafeIsolation() {
        for (math in listOf("\$\$\nx = y\n\$\$", "\$\$\r\nx = y\r\n\$\$", "\\[\nx = y\n\\]", "\\[x = y\\]")) {
            val source = "سلام $math تمام"
            assertEquals(listOf(math), findTechnicalTokenRanges(source).filter { it.kind == TechnicalTokenKind.MATH }.map { it.text })
            for (isolation in planInlineIsolation(source, BidiDirection.RTL)) {
                assertEquals(false, isolation.text.contains('\r') || isolation.text.contains('\n'))
                assertEquals(isolation.text, source.substring(isolation.start, isolation.end))
            }
        }
        for (source in listOf("\$x\ny\$", "\\(x\ny\\)", "\\\\[x\\]", "\\[x", "\$\$\nx")) {
            assertEquals(emptyList<String>(), findTechnicalTokenRanges(source).filter { it.kind == TechnicalTokenKind.MATH }.map { it.text })
        }
    }

    @Test
    fun currencyProseAndEscapedDollarsAreNotMath() {
        for (source in listOf("\$ x\$", "\$x \$", "\$10 and \$20", "\\\$x\\\$")) {
            assertEquals(source, emptyList<String>(), findTechnicalTokenRanges(source).filter { it.kind == TechnicalTokenKind.MATH }.map { it.text })
        }
        assertEquals(listOf("\$10", "\$20"), findTechnicalTokenRanges("هزینه این کتاب \$10 و آن یکی \$20 است.").map { it.text })
        for ((source, expected) in listOf("قیمت \$10 است و \$x+1\$ درست است." to "\$x+1\$", "\$x\\\$y\$" to "\$x\\\$y\$")) {
            assertEquals(listOf(expected), findTechnicalTokenRanges(source).filter { it.kind == TechnicalTokenKind.MATH }.map { it.text })
        }
    }
}
