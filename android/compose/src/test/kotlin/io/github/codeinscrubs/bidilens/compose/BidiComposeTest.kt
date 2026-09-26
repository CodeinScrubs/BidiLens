package io.github.codeinscrubs.bidilens.compose

import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.ParagraphStyle
import androidx.compose.ui.text.LinkAnnotation
import androidx.compose.ui.text.VerbatimTtsAnnotation
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDirection
import io.github.codeinscrubs.bidilens.core.BidiControls
import io.github.codeinscrubs.bidilens.core.BidiDirection
import io.github.codeinscrubs.bidilens.core.analyzeBidi
import io.github.codeinscrubs.bidilens.core.stripBidiControls
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test

class BidiComposeTest {
    @Test
    fun mixedParagraphsGetIndependentDirectionsAndKeepLeftAlignment() {
        val source = "سلام دنیا\nPlain English\n---\nفارسی React"
        val input = AnnotatedString.Builder(source).apply {
            addStyle(ParagraphStyle(textAlign = TextAlign.Left), 0, source.length)
        }.toAnnotatedString()
        val analysis = analyzeBidi(source)
        val output = BidiVisualTransformation(analysis).filter(input)
        assertEquals(source, stripBidiControls(output.text.text))
        for ((index, paragraph) in analysis.paragraphs.withIndex()) {
            val start = output.offsetMapping.originalToTransformed(paragraph.utf16Start)
            val end = analysis.paragraphs.getOrNull(index + 1)?.let {
                output.offsetMapping.originalToTransformed(it.utf16Start)
            } ?: output.text.length
            val styles = output.text.paragraphStyles.filter { it.start == start && it.end == end }
            assertTrue("Missing paragraph style at $start", styles.isNotEmpty())
            val expected = if (paragraph.direction == BidiDirection.RTL) TextDirection.Rtl else TextDirection.Ltr
            assertTrue(styles.all { it.item.textDirection == expected })
            assertEquals(TextAlign.Left, styles.last().item.textAlign)
        }
        // English prose is not an opposite-direction run of an unrelated RTL paragraph.
        assertFalse(analysis.isolations.any { it.text == "Plain English" })
        for (offset in 0..source.length) {
            assertEquals(offset, output.offsetMapping.transformedToOriginal(output.offsetMapping.originalToTransformed(offset)))
        }
    }

    @Test
    fun paragraphStylesWorkEvenWhenInlineIsolationIsDisabled() {
        val source = "سلام\r\nEnglish\nفارسی\n"
        val input = AnnotatedString(source)
        val output = BidiVisualTransformation(analyzeBidi(source), isolateRuns = false).filter(input)
        assertEquals(source, output.text.text)
        assertEquals(listOf(TextDirection.Rtl, TextDirection.Ltr, TextDirection.Rtl, TextDirection.Ltr),
            output.text.paragraphStyles.map { it.item.textDirection })
        for (offset in 0..source.length) {
            assertEquals(offset, output.offsetMapping.originalToTransformed(offset))
        }
    }

    @Test
    fun pureLtrParagraphsReturnExactAnnotatedString() {
        val input = AnnotatedString("Plain\nEnglish")
        assertSame(input, BidiVisualTransformation(analyzeBidi(input.text)).filter(input).text)
    }

    @Test
    fun transformationPreservesEveryAnnotationAndItsPayloadIdentity() {
        val source = "React یک کتابخانه است."
        val span = SpanStyle(color = Color.Red)
        val paragraph = ParagraphStyle(textAlign = TextAlign.Left)
        val link = LinkAnnotation.Url("https://example.com")
        val tts = VerbatimTtsAnnotation("React")
        val input = AnnotatedString.Builder(source).apply {
            addStyle(span, 0, 5)
            addStyle(paragraph, 0, source.length)
            addStringAnnotation("reference", "react-library", 0, 5)
            addLink(link, 0, 5)
            addTtsAnnotation(tts, 0, 5)
        }.toAnnotatedString()
        val output = BidiVisualTransformation(analyzeBidi(source)).filter(input)
        val start = output.offsetMapping.originalToTransformed(0)
        val end = output.offsetMapping.originalToTransformed(5)
        assertEquals(listOf(AnnotatedString.Range(span, start, end)), output.text.spanStyles)
        assertEquals(0, output.text.paragraphStyles.first().start)
        assertEquals(output.text.length, output.text.paragraphStyles.first().end)
        assertEquals(paragraph.copy(textDirection = TextDirection.Rtl), output.text.paragraphStyles.last().item)
        assertEquals(listOf(AnnotatedString.Range("react-library", start, end, "reference")), output.text.getStringAnnotations(0, output.text.length))
        assertSame(link, output.text.getLinkAnnotations(0, output.text.length).single().item)
        assertSame(tts, output.text.getTtsAnnotations(0, output.text.length).single().item)
    }

    @Test
    fun pureLtrReturnsExactStyleInstance() {
        val style = TextStyle.Default
        val analysis = analyzeBidi("Plain English")
        assertSame(style, bidiTextStyle(style, analysis))
    }

    @Test
    fun rtlAnalysisProducesExplicitRtlStartStyle() {
        val style = bidiTextStyle(TextStyle.Default, analyzeBidi("فارسی"))
        assertEquals(TextDirection.Rtl, style.textDirection)
        assertEquals(TextAlign.Start, style.textAlign)
    }

    @Test
    fun alignmentCanRemainCallerOwned() {
        val source = TextStyle.Default.copy(textAlign = TextAlign.Center)
        val style = bidiTextStyle(source, analyzeBidi("فارسی"), alignToContent = false)
        assertEquals(TextDirection.Rtl, style.textDirection)
        assertEquals(TextAlign.Center, style.textAlign)
    }

    @Test
    fun rtlDirectionCanUsePhysicalLeftAlignment() {
        val source = TextStyle.Default.copy(textAlign = TextAlign.Left)
        val style = bidiTextStyle(
            source,
            analyzeBidi("React یک کتابخانه بسیار محبوب است."),
            alignToContent = false,
        )
        assertEquals(TextDirection.Rtl, style.textDirection)
        assertEquals(TextAlign.Left, style.textAlign)
    }

    @Test
    fun visualTransformationDoesNotChangeLogicalSource() {
        val source = "React یک کتابخانه است."
        val transformed = BidiVisualTransformation(analyzeBidi(source))
            .filter(AnnotatedString(source))

        assertEquals(source, stripBidiControls(transformed.text.text))
        assertTrue(transformed.text.text.contains(BidiControls.LRI))
    }

    @Test
    fun mappingRoundTripsEveryOriginalOffset() {
        val source = "😀 React یک کتابخانه است."
        val transformed = BidiVisualTransformation(analyzeBidi(source))
            .filter(AnnotatedString(source))

        for (offset in 0..source.length) {
            val visual = transformed.offsetMapping.originalToTransformed(offset)
            assertEquals(offset, transformed.offsetMapping.transformedToOriginal(visual))
        }
    }

    @Test
    fun transformedOffsetsAreMonotonic() {
        val source = "از جلد سه qb، page 97"
        val transformed = BidiVisualTransformation(analyzeBidi(source))
            .filter(AnnotatedString(source))
        var previous = -1
        for (offset in 0..source.length) {
            val current = transformed.offsetMapping.originalToTransformed(offset)
            assertTrue(current >= previous)
            previous = current
        }
    }

    @Test
    fun mismatchedInputSafelyFallsBackToIdentity() {
        val analysis = analyzeBidi("فارسی React")
        val transformed = BidiVisualTransformation(analysis).filter(AnnotatedString("different"))
        assertEquals("different", transformed.text.text)
        assertEquals(4, transformed.offsetMapping.originalToTransformed(4))
    }

    @Test
    fun pureLtrTransformationAddsNoControls() {
        val source = "Plain English"
        val transformed = BidiVisualTransformation(analyzeBidi(source))
            .filter(AnnotatedString(source))
        assertEquals(source, transformed.text.text)
        assertFalse(transformed.text.text.any { it == BidiControls.LRI || it == BidiControls.RLI })
    }
}
