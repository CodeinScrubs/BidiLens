package io.github.codeinscrubs.bidilens.core

import org.junit.Assert.assertEquals
import org.junit.Test

class TokenBoundaryTest {
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
        for (token in listOf("\$10", "€12.50", "£25", "۱۰€", "10-20", "10–20", "-10--2", "۱۰-۲۰", "١٠-٢٠")) {
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
