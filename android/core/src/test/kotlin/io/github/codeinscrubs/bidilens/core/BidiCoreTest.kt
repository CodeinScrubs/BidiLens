package io.github.codeinscrubs.bidilens.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test

class BidiCoreTest {
    @Test
    fun flagshipUsesPersianMajorityDespiteLeadingReact() {
        val source = "React یک کتابخانه جاوااسکریپت بسیار محبوب است."
        val analysis = analyzeBidi(source)

        assertEquals(BidiDirection.RTL, analysis.direction)
        assertEquals(BidiDirection.LTR, analysis.rawFirstStrong)
        assertEquals(BidiDirection.RTL, analysis.firstStrong)
        assertEquals(source, analysis.text)
        assertTrue(analysis.mixed)
        assertTrue(analysis.isolations.any { it.text == "React" && it.direction == BidiDirection.LTR })
    }

    @Test
    fun englishMajorityContainingPersianStaysLtr() {
        assertEquals(
            BidiDirection.LTR,
            detectDirection("The Persian word کتاب means book in this sentence."),
        )
    }

    @Test
    fun photographedPersianTitleResolvesRtl() {
        val analysis = analyzeBidi("آپاندیسیت")
        assertEquals(BidiDirection.RTL, analysis.resolvedDirection)
        assertTrue(analysis.interventionRequired)
    }

    @Test
    fun photographedMixedSourceResolvesRtlAndIsolatesLatinRuns() {
        val analysis = analyzeBidi("از جلد سه qb، page 97")
        assertEquals(BidiDirection.RTL, analysis.resolvedDirection)
        assertEquals(listOf("qb", "page 97"), analysis.isolations.map { it.text })
        assertTrue(analysis.isolations.all { it.direction == BidiDirection.LTR })
    }

    @Test
    fun pureLtrInLtrHostIsStrictNoOp() {
        val source = "This is an ordinary English sentence."
        val analysis = analyzeBidi(source)
        assertFalse(analysis.interventionRequired)
        assertTrue(analysis.isolations.isEmpty())
        assertSame(analysis.text, formatBidiForDisplay(analysis))
    }

    @Test
    fun ltrInsideRtlHostRequiresIntervention() {
        val analysis = analyzeBidi(
            "English only",
            BidiOptions(inheritedDirection = BidiDirection.RTL),
        )
        assertTrue(analysis.interventionRequired)
        assertEquals(BidiDirection.LTR, analysis.direction)
    }

    @Test
    fun strictFirstStrongRemainsAvailableForCompatibility() {
        val source = "React یک کتابخانه بسیار محبوب است."
        assertEquals(
            BidiDirection.LTR,
            detectDirection(source, BidiOptions(strategy = BidiDetectionStrategy.STRICT_UAX9)),
        )
    }

    @Test
    fun explicitAndInheritedStrategiesAreDeterministic() {
        assertEquals(
            BidiDirection.LTR,
            detectDirection("سلام", BidiOptions(strategy = BidiDetectionStrategy.LTR)),
        )
        assertEquals(
            BidiDirection.RTL,
            detectDirection("Hello", BidiOptions(strategy = BidiDetectionStrategy.RTL)),
        )
        assertEquals(
            BidiDirection.RTL,
            detectDirection(
                "Hello",
                BidiOptions(
                    strategy = BidiDetectionStrategy.INHERIT,
                    inheritedDirection = BidiDirection.RTL,
                ),
            ),
        )
    }

    @Test
    fun unicode17GeneratedTablesClassifySupplementaryRtlLetters() {
        assertEquals("17.0.0", BidiUnicodeData.version)
        assertEquals(BidiDirection.RTL, classifyNaturalCodePoint(0x10940))
        assertEquals(BidiDirection.RTL, detectDirection(String(Character.toChars(0x10940))))
    }

    @Test
    fun technicalTokensDoNotOutvoteNaturalLanguage() {
        val source = "Kubernetes و React در این برنامه استفاده می‌شوند."
        val analysis = analyzeBidi(source)
        assertEquals(BidiDirection.RTL, analysis.direction)
        assertTrue(analysis.technicalTokens.map { it.text }.containsAll(listOf("Kubernetes", "React")))
    }

    @Test
    fun callerSpecificTechnicalIdentifiersAreSupported() {
        val source = "internalplatform خوب است."
        assertEquals(BidiDirection.LTR, detectDirection(source))
        assertEquals(
            BidiDirection.RTL,
            detectDirection(source, BidiOptions(technicalIdentifiers = setOf("InternalPlatform"))),
        )
    }

    @Test
    fun urlPunctuationIsNotIncludedInIsolation() {
        val range = findTechnicalTokenRanges("پیوند https://example.com، سپس ادامه بدهید.")
            .first { it.kind == TechnicalTokenKind.URL }
        assertEquals("https://example.com", range.text)
    }

    @Test
    fun invalidIpv4IsNotClassifiedAsAddress() {
        val ranges = findTechnicalTokenRanges("999.1.1.1 معتبر نیست.")
        assertFalse(ranges.any { it.text == "999.1.1.1" && it.kind == TechnicalTokenKind.NUMBER })
    }

    @Test
    fun paragraphOffsetsRemainUtf16Accurate() {
        val source = "😀 فارسی\nEnglish"
        val analysis = analyzeBidi(source)
        assertEquals(2, analysis.paragraphs.size)
        assertEquals(0, analysis.paragraphs[0].utf16Start)
        assertEquals(source.indexOf('\n') + 1, analysis.paragraphs[1].utf16Start)
    }

    @Test
    fun isolationCarriesUtf16AndCodePointOffsets() {
        val source = "😀 React یک کتابخانه است."
        val react = analyzeBidi(source).isolations.first { it.text == "React" }
        assertEquals(3, react.sourceRange.utf16Start)
        assertEquals(2, react.sourceRange.codePointStart)
        assertEquals(8, react.sourceRange.utf16End)
        assertEquals(7, react.sourceRange.codePointEnd)
    }

    @Test
    fun displayFormattingDoesNotMutateAnalysisSource() {
        val source = "React یک کتابخانه است."
        val analysis = analyzeBidi(source)
        val display = formatBidiForDisplay(analysis)
        assertEquals(source, analysis.text)
        assertNotEquals(source, display)
        assertEquals(source, stripBidiControls(display))
    }

    @Test
    fun semanticFragmentIsolationUsesModernIsolates() {
        val isolated = isolateText("۷ مرداد ۱۴۰۵", BidiDirection.RTL)
        assertEquals(BidiControls.RLI, isolated.first())
        assertEquals(BidiControls.PDI, isolated.last())
        assertEquals("۷ مرداد ۱۴۰۵", stripBidiControls(isolated))
    }

    @Test
    fun hiddenOverridesDisableNoOpAndAreAudited() {
        val source = "hello ${BidiControls.RLO}world${BidiControls.PDF}"
        val analysis = analyzeBidi(source)
        assertTrue(analysis.interventionRequired)
        assertFalse(analysis.security.safe)
        assertTrue(analysis.security.findings.any { it.code == "BIDI_OVERRIDE_CONTROL" })
    }

    @Test
    fun unmatchedControlsProduceStructuralFinding() {
        val report = scanBidiSecurity("text${BidiControls.PDI}")
        assertFalse(report.safe)
        assertTrue(report.findings.any { it.code == "BIDI_UNMATCHED_PDI" })
    }

    @Test
    fun ordinaryPersianZwnjIsNotReportedAsBidiControl() {
        val report = scanBidiSecurity("می\u200Cشود")
        assertTrue(report.safe)
        assertTrue(report.controls.isEmpty())
    }

    @Test
    fun neutralTextUsesConfiguredFallback() {
        assertEquals(
            BidiDirection.NEUTRAL,
            detectDirection("1234?!", BidiOptions(fallback = BidiDirection.NEUTRAL)),
        )
        assertEquals(
            BidiDirection.RTL,
            detectDirection("1234?!", BidiOptions(fallback = BidiDirection.RTL)),
        )
    }

    @Test
    fun interventionAlwaysOverridesFastPath() {
        val analysis = analyzeBidi(
            "English",
            BidiOptions(intervention = BidiIntervention.ALWAYS),
        )
        assertTrue(analysis.interventionRequired)
    }

    @Test
    fun allCanonicalCorpusDirectionsAndIsolationPlansMatch() {
        val failures = mutableListOf<String>()
        for (fixture in generatedCorpusFixtures) {
            val analysis = analyzeBidi(fixture.text)
            if (analysis.direction != fixture.expected) {
                failures += "${fixture.id}: direction ${analysis.direction}, expected ${fixture.expected}"
                continue
            }
            if (fixture.isolations != null) {
                val actual = analysis.isolations.map {
                    ExpectedIsolation(it.text, it.direction, it.kind)
                }
                if (actual != fixture.isolations) {
                    failures += "${fixture.id}: isolations $actual, expected ${fixture.isolations}"
                }
            }
        }
        assertTrue(
            failures.take(20).joinToString(separator = "\n", prefix = "${failures.size} failures\n"),
            failures.isEmpty(),
        )
    }
}
