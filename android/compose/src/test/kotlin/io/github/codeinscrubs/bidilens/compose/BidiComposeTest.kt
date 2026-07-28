package io.github.codeinscrubs.bidilens.compose

import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDirection
import io.github.codeinscrubs.bidilens.core.BidiControls
import io.github.codeinscrubs.bidilens.core.analyzeBidi
import io.github.codeinscrubs.bidilens.core.stripBidiControls
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test

class BidiComposeTest {
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
