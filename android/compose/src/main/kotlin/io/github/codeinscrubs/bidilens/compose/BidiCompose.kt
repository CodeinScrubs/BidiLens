package io.github.codeinscrubs.bidilens.compose

import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.semantics.SemanticsPropertyKey
import androidx.compose.ui.semantics.SemanticsPropertyReceiver
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.text
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.OffsetMapping
import androidx.compose.ui.text.input.TransformedText
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDirection
import io.github.codeinscrubs.bidilens.core.BidiAnalysis
import io.github.codeinscrubs.bidilens.core.BidiControls
import io.github.codeinscrubs.bidilens.core.BidiDirection
import io.github.codeinscrubs.bidilens.core.BidiOptions
import io.github.codeinscrubs.bidilens.core.analyzeBidi

val BidiLensDirectionKey = SemanticsPropertyKey<String>("BidiLensDirection")
var SemanticsPropertyReceiver.bidiLensDirection by BidiLensDirectionKey

@Immutable
data class BidiComposeState(
    val analysis: BidiAnalysis,
    val textStyle: TextStyle,
    val visualTransformation: VisualTransformation,
)

private fun BidiDirection.composeDirection(): TextDirection = when (this) {
    BidiDirection.RTL -> TextDirection.Rtl
    BidiDirection.LTR -> TextDirection.Ltr
    BidiDirection.NEUTRAL -> TextDirection.Content
}

/**
 * Returns [style] unchanged for ordinary LTR text in an LTR host. Mixed or RTL
 * content receives an explicit paragraph base and optional content-edge alignment.
 */
fun bidiTextStyle(
    style: TextStyle,
    analysis: BidiAnalysis,
    alignToContent: Boolean = true,
): TextStyle {
    if (!analysis.interventionRequired) return style
    return style.copy(
        textDirection = analysis.resolvedDirection.composeDirection(),
        textAlign = if (alignToContent) TextAlign.Start else style.textAlign,
    )
}

@Composable
fun rememberBidiComposeState(
    text: String,
    style: TextStyle = TextStyle.Default,
    options: BidiOptions = BidiOptions(),
    alignToContent: Boolean = true,
    isolateRuns: Boolean = true,
): BidiComposeState = remember(text, style, options, alignToContent, isolateRuns) {
    val analysis = analyzeBidi(text, options)
    BidiComposeState(
        analysis = analysis,
        textStyle = bidiTextStyle(style, analysis, alignToContent),
        visualTransformation = if (isolateRuns && analysis.isolations.isNotEmpty()) {
            BidiVisualTransformation(analysis)
        } else {
            VisualTransformation.None
        },
    )
}

@Composable
@JvmOverloads
fun BidiText(
    text: String,
    modifier: Modifier = Modifier,
    style: TextStyle = TextStyle.Default,
    options: BidiOptions = BidiOptions(),
    alignToContent: Boolean = true,
    isolateRuns: Boolean = true,
    softWrap: Boolean = true,
    maxLines: Int = Int.MAX_VALUE,
    minLines: Int = 1,
    onTextLayout: ((TextLayoutResult) -> Unit)? = null,
) {
    val state = rememberBidiComposeState(text, style, options, alignToContent, isolateRuns)
    val transformed = remember(text, state.visualTransformation) {
        state.visualTransformation.filter(AnnotatedString(text)).text
    }
    BasicText(
        text = transformed,
        modifier = if (state.analysis.interventionRequired) {
            modifier.semantics {
                // BasicText renders an isolated display string, but accessibility
                // and selection semantics must expose the untouched source.
                this.text = AnnotatedString(text)
                bidiLensDirection = state.analysis.resolvedDirection.name.lowercase()
            }
        } else {
            modifier
        },
        style = state.textStyle,
        softWrap = softWrap,
        maxLines = maxLines,
        minLines = minLines,
        onTextLayout = onTextLayout,
    )
}

/**
 * Editable Compose field with immutable logical input. Isolation controls exist
 * only in the visual transformation and its offset mapping.
 */
@Composable
@JvmOverloads
fun BidiBasicTextField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    readOnly: Boolean = false,
    textStyle: TextStyle = TextStyle.Default,
    options: BidiOptions = BidiOptions(),
    alignToContent: Boolean = true,
    isolateRuns: Boolean = true,
    keyboardOptions: KeyboardOptions = KeyboardOptions(imeAction = ImeAction.Default),
    cursorBrush: Brush = SolidColor(Color.Black),
    decorationBox: @Composable (innerTextField: @Composable () -> Unit) -> Unit = { it() },
) {
    val state = rememberBidiComposeState(value, textStyle, options, alignToContent, isolateRuns)
    BasicTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = if (state.analysis.interventionRequired) {
            modifier.semantics {
                bidiLensDirection = state.analysis.resolvedDirection.name.lowercase()
            }
        } else {
            modifier
        },
        enabled = enabled,
        readOnly = readOnly,
        textStyle = state.textStyle,
        keyboardOptions = keyboardOptions,
        cursorBrush = cursorBrush,
        visualTransformation = state.visualTransformation,
        decorationBox = decorationBox,
    )
}

/**
 * Offset-safe isolation transformation. Original and transformed offsets are
 * monotonic; cursor positions at range boundaries remain inside the isolate.
 */
class BidiVisualTransformation(
    private val analysis: BidiAnalysis,
) : VisualTransformation {
    override fun filter(text: AnnotatedString): TransformedText {
        if (!analysis.interventionRequired || analysis.isolations.isEmpty() || text.text != analysis.text) {
            return TransformedText(text, OffsetMapping.Identity)
        }
        val original = text.text
        val transformed = StringBuilder(original.length + analysis.isolations.size * 2)
        val originalToTransformed = IntArray(original.length + 1)
        val transformedToOriginal = mutableListOf<Int>()
        var source = 0

        fun appendSource(until: Int) {
            while (source < until) {
                originalToTransformed[source] = transformed.length
                transformed.append(original[source])
                transformedToOriginal += source
                source += 1
                originalToTransformed[source] = transformed.length
            }
        }

        for (isolation in analysis.isolations) {
            if (isolation.start < source) continue
            appendSource(isolation.start)
            transformedToOriginal += source
            transformed.append(
                when (isolation.direction) {
                    BidiDirection.LTR -> BidiControls.LRI
                    BidiDirection.RTL -> BidiControls.RLI
                    BidiDirection.NEUTRAL -> BidiControls.FSI
                },
            )
            originalToTransformed[source] = transformed.length
            appendSource(isolation.end)
            transformedToOriginal += source
            transformed.append(BidiControls.PDI)
        }
        appendSource(original.length)
        transformedToOriginal += original.length

        val mapping = object : OffsetMapping {
            override fun originalToTransformed(offset: Int): Int =
                originalToTransformed[offset.coerceIn(0, original.length)]

            override fun transformedToOriginal(offset: Int): Int =
                transformedToOriginal[offset.coerceIn(0, transformedToOriginal.lastIndex)]
        }
        return TransformedText(AnnotatedString(transformed.toString()), mapping)
    }
}
