package io.github.codeinscrubs.bidilens.views

import android.content.Context
import android.content.pm.ApplicationInfo
import android.text.Editable
import android.text.TextWatcher
import android.view.Gravity
import android.view.View
import android.widget.EditText
import android.widget.TextView
import io.github.codeinscrubs.bidilens.core.BidiAnalysis
import io.github.codeinscrubs.bidilens.core.BidiDirection
import io.github.codeinscrubs.bidilens.core.BidiOptions
import io.github.codeinscrubs.bidilens.core.analyzeBidi
import io.github.codeinscrubs.bidilens.core.formatBidiForDisplay
import io.github.codeinscrubs.bidilens.core.isolateText

/**
 * Whether the host manifest enables Android's per-view RTL text machinery.
 * BidiLens deliberately does not merge this application-wide flag on behalf
 * of consumers because doing so can change unrelated layouts.
 */
fun Context.supportsBidiLensRtl(): Boolean =
    applicationInfo.flags and ApplicationInfo.FLAG_SUPPORTS_RTL != 0

private data class OriginalTextViewState(
    val textDirection: Int,
    val textAlignment: Int,
    val gravity: Int,
)

private fun TextView.originalState(): OriginalTextViewState? =
    getTag(R.id.bidilens_original_view_state) as? OriginalTextViewState

private fun TextView.rememberOriginalState() {
    if (originalState() == null) {
        setTag(
            R.id.bidilens_original_view_state,
            OriginalTextViewState(textDirection, textAlignment, gravity),
        )
    }
}

private fun TextView.restoreOriginalState() {
    val state = originalState() ?: return
    textDirection = state.textDirection
    textAlignment = state.textAlignment
    gravity = state.gravity
    setTag(R.id.bidilens_original_view_state, null)
}

private fun TextView.applyAnalysis(
    analysis: BidiAnalysis,
    alignToContent: Boolean,
) {
    if (!analysis.interventionRequired) {
        restoreOriginalState()
        return
    }
    rememberOriginalState()
    textDirection = when (analysis.resolvedDirection) {
        BidiDirection.RTL -> View.TEXT_DIRECTION_RTL
        BidiDirection.LTR -> View.TEXT_DIRECTION_LTR
        BidiDirection.NEUTRAL -> View.TEXT_DIRECTION_INHERIT
    }
    if (alignToContent) {
        textAlignment = View.TEXT_ALIGNMENT_GRAVITY
        val horizontal = if (analysis.resolvedDirection == BidiDirection.RTL) {
            Gravity.RIGHT
        } else {
            Gravity.LEFT
        }
        gravity = (gravity and Gravity.RELATIVE_HORIZONTAL_GRAVITY_MASK.inv()) or horizontal
    }
}

/**
 * Applies paragraph direction and content-edge alignment without changing
 * [TextView.getText]. Pure LTR text in an LTR host is an exact view-state no-op.
 */
@JvmOverloads
fun TextView.applyBidiLens(
    options: BidiOptions = BidiOptions(),
    alignToContent: Boolean = true,
): BidiAnalysis {
    val analysis = analyzeBidi(text?.toString().orEmpty(), options)
    applyAnalysis(analysis, alignToContent)
    return analysis
}

/**
 * Display-only helper that adds Unicode isolates to the rendered value.
 * Store and search [source], not the returned rendering string.
 */
@JvmOverloads
fun TextView.setBidiDisplayText(
    source: String,
    options: BidiOptions = BidiOptions(),
    alignToContent: Boolean = true,
): BidiAnalysis {
    val analysis = analyzeBidi(source, options)
    text = formatBidiForDisplay(analysis)
    applyAnalysis(analysis, alignToContent)
    return analysis
}

/**
 * Re-evaluates an EditText after every user edit. The watcher never inserts
 * controls or replaces the Editable, preserving selection, IME composition,
 * storage, copy/paste and validation behavior.
 */
class BidiEditTextController private constructor(
    private val editText: EditText,
    private val options: () -> BidiOptions,
    private val alignToContent: Boolean,
) : TextWatcher {
    private var attached = true

    override fun beforeTextChanged(text: CharSequence?, start: Int, count: Int, after: Int) = Unit

    override fun onTextChanged(text: CharSequence?, start: Int, before: Int, count: Int) = Unit

    override fun afterTextChanged(editable: Editable?) {
        if (attached) editText.applyBidiLens(options(), alignToContent)
    }

    fun refresh(): BidiAnalysis = editText.applyBidiLens(options(), alignToContent)

    fun detach() {
        if (!attached) return
        attached = false
        editText.removeTextChangedListener(this)
        editText.restoreOriginalState()
    }

    companion object {
        @JvmStatic
        @JvmOverloads
        fun attach(
            editText: EditText,
            options: () -> BidiOptions = { BidiOptions() },
            alignToContent: Boolean = true,
        ): BidiEditTextController {
            val controller = BidiEditTextController(editText, options, alignToContent)
            editText.addTextChangedListener(controller)
            controller.refresh()
            return controller
        }
    }
}

/** Builds a label from independently isolated semantic fragments. */
class BidiTextBuilder(
    private val contextDirection: BidiDirection = BidiDirection.LTR,
) {
    private val value = StringBuilder()

    init {
        require(contextDirection != BidiDirection.NEUTRAL)
    }

    fun appendLiteral(text: String): BidiTextBuilder = apply {
        value.append(text)
    }

    @JvmOverloads
    fun appendFragment(
        text: String,
        options: BidiOptions = BidiOptions(inheritedDirection = contextDirection),
    ): BidiTextBuilder = apply {
        val analysis = analyzeBidi(text, options)
        if (analysis.interventionRequired || analysis.resolvedDirection != contextDirection) {
            value.append(isolateText(text, analysis.resolvedDirection))
        } else {
            value.append(text)
        }
    }

    override fun toString(): String = value.toString()
}
