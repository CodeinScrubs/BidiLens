package io.github.codeinscrubs.bidilens.compose

import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.text.selection.DisableSelection
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
import androidx.compose.ui.text.ParagraphStyle
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
        visualTransformation = if (analysis.interventionRequired) {
            BidiVisualTransformation(analysis, isolateRuns)
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
    isolateRuns: Boolean = false,
    softWrap: Boolean = true,
    maxLines: Int = Int.MAX_VALUE,
    minLines: Int = 1,
    onTextLayout: ((TextLayoutResult) -> Unit)? = null,
) {
    val state = rememberBidiComposeState(text, style, options, alignToContent, isolateRuns)
    val transformed = remember(text, state.visualTransformation) {
        state.visualTransformation.filter(AnnotatedString(text)).text
    }
    val content: @Composable () -> Unit = {
        BasicText(
            text = transformed,
            modifier = if (state.analysis.interventionRequired) {
                modifier.semantics {
                    // BasicText may render isolates, but accessibility exposes
                    // source. Native selection uses layout input, so isolated
                    // display text is excluded from SelectionContainer.
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
    if (isolateRuns && state.analysis.isolations.isNotEmpty()) {
        DisableSelection { content() }
    } else {
        content()
    }
}

/**
 * Selectable, read-only text with display-only isolation and native source-offset
 * selection/copy. Use directly, without an enclosing SelectionContainer.
 */
@Composable
@JvmOverloads
fun BidiSelectableText(
    text: String,
    modifier: Modifier = Modifier,
    style: TextStyle = TextStyle.Default,
    options: BidiOptions = BidiOptions(),
    alignToContent: Boolean = true,
    isolateRuns: Boolean = true,
) {
    BidiBasicTextField(
        value = text,
        onValueChange = {},
        modifier = modifier,
        readOnly = true,
        textStyle = style,
        options = options,
        alignToContent = alignToContent,
        isolateRuns = isolateRuns,
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
    private val isolateRuns: Boolean = true,
) : VisualTransformation {
    override fun filter(text: AnnotatedString): TransformedText {
        if (!analysis.interventionRequired || text.text != analysis.text) {
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

        val isolations = if (isolateRuns) analysis.isolations else emptyList()
        for (isolation in isolations) {
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
        // Paragraph ranges include inserted boundary controls. Starting a style
        // after a leading LRI would create an unintended, empty layout paragraph.
        val isolationStarts = isolations.mapTo(HashSet()) { it.start }
        fun paragraphOffset(offset: Int): Int = when {
            offset == original.length -> transformed.length
            offset in isolationStarts -> originalToTransformed[offset] - 1
            else -> originalToTransformed[offset]
        }
        val annotations = mutableListOf<AnnotatedString.Range<out AnnotatedString.Annotation>>()
        val paragraphs = analysis.paragraphs
        val boundaries = IntArray(paragraphs.size + 1) { index ->
            paragraphs.getOrNull(index)?.utf16Start ?: original.length
        }
        for ((index, paragraph) in paragraphs.withIndex()) {
            annotations += AnnotatedString.Range(
                ParagraphStyle(textDirection = paragraph.resolvedDirection.composeDirection()),
                paragraphOffset(boundaries[index]),
                paragraphOffset(boundaries[index + 1]),
            )
        }
        // Split authored paragraph styles at the same boundaries, so a style
        // spanning multiple paragraphs cannot partially overlap the new ranges.
        // Only direction is replaced; alignment/indent/spacing stay caller-owned.
        text.mapAnnotations { range ->
            val style = range.item as? ParagraphStyle
            if (style == null) {
                // Preserve payload identity, including link listeners and TTS.
                annotations += range.copy(
                    start = originalToTransformed[range.start],
                    end = originalToTransformed[range.end],
                )
            } else {
                var low = 0
                var high = paragraphs.lastIndex
                while (low < high) {
                    val middle = (low + high + 1) ushr 1
                    if (boundaries[middle] <= range.start) low = middle else high = middle - 1
                }
                var index = low
                do {
                    val start = maxOf(range.start, boundaries[index])
                    val end = minOf(range.end, boundaries[index + 1])
                    if (start < end || (range.start == range.end && start == end)) {
                        annotations += AnnotatedString.Range(
                            style.copy(textDirection = paragraphs[index].resolvedDirection.composeDirection()),
                            paragraphOffset(start), paragraphOffset(end), range.tag,
                        )
                    }
                    index += 1
                } while (index < paragraphs.size && boundaries[index] < range.end)
            }
            range
        }
        return TransformedText(AnnotatedString(transformed.toString(), annotations), mapping)
    }
}
