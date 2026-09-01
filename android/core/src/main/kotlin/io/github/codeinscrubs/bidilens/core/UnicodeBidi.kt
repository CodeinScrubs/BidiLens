package io.github.codeinscrubs.bidilens.core

import io.github.codeinscrubs.bidilens.core.generated.COMBINING_MARK_RANGES
import io.github.codeinscrubs.bidilens.core.generated.NATURAL_LETTER_RANGES
import io.github.codeinscrubs.bidilens.core.generated.NON_STRONG_BIDI_RANGES
import io.github.codeinscrubs.bidilens.core.generated.RTL_BIDI_RANGES
import io.github.codeinscrubs.bidilens.core.generated.UNICODE_BIDI_SHA256
import io.github.codeinscrubs.bidilens.core.generated.UNICODE_BIDI_VERSION
import io.github.codeinscrubs.bidilens.core.generated.UNICODE_GENERAL_CATEGORY_SHA256

object BidiUnicodeData {
    const val version: String = UNICODE_BIDI_VERSION
    const val bidiSha256: String = UNICODE_BIDI_SHA256
    const val generalCategorySha256: String = UNICODE_GENERAL_CATEGORY_SHA256
}

internal fun IntArray.containsCodePoint(codePoint: Int): Boolean {
    var low = 0
    var high = size / 2 - 1
    while (low <= high) {
        val middle = (low + high) ushr 1
        val start = this[middle * 2]
        val end = this[middle * 2 + 1]
        when {
            codePoint < start -> high = middle - 1
            codePoint > end -> low = middle + 1
            else -> return true
        }
    }
    return false
}

/** Unicode Bidi_Class strong direction, including LRM/RLM/ALM. */
fun classifyBidiStrongCodePoint(codePoint: Int): BidiDirection {
    if (NON_STRONG_BIDI_RANGES.containsCodePoint(codePoint)) return BidiDirection.NEUTRAL
    return if (RTL_BIDI_RANGES.containsCodePoint(codePoint)) {
        BidiDirection.RTL
    } else {
        BidiDirection.LTR
    }
}

/** Natural-language letters only; numbers, punctuation and symbols are neutral. */
fun classifyNaturalCodePoint(codePoint: Int): BidiDirection {
    if (!NATURAL_LETTER_RANGES.containsCodePoint(codePoint)) return BidiDirection.NEUTRAL
    return classifyBidiStrongCodePoint(codePoint)
}

/** Unicode combining marks stay attached to their surrounding grapheme. */
internal fun isCombiningMarkCodePoint(codePoint: Int): Boolean =
    COMBINING_MARK_RANGES.containsCodePoint(codePoint)

internal inline fun String.forEachCodePoint(
    action: (codePoint: Int, utf16Index: Int, codePointIndex: Int) -> Unit,
) {
    var utf16Index = 0
    var codePointIndex = 0
    while (utf16Index < length) {
        val codePoint = Character.codePointAt(this, utf16Index)
        action(codePoint, utf16Index, codePointIndex)
        utf16Index += Character.charCount(codePoint)
        codePointIndex += 1
    }
}

internal fun String.codePointOffsetAt(utf16Offset: Int): Int {
    require(utf16Offset in 0..length)
    return codePointCount(0, utf16Offset)
}
