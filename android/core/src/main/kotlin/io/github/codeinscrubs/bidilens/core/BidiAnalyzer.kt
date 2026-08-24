package io.github.codeinscrubs.bidilens.core

import kotlin.math.round

private data class CountResult(
    val counts: StrongCharacterCounts,
    val firstStrong: BidiDirection,
    val technicalTokens: List<TechnicalTokenRange>,
)

private fun countStrongCharacters(
    text: String,
    options: BidiOptions,
    excludeTechnicalTokens: Boolean = options.excludeTechnicalTokens,
): CountResult {
    val technical = if (excludeTechnicalTokens) {
        findTechnicalTokenRanges(text, options.technicalIdentifiers)
    } else {
        emptyList()
    }
    var ltr = 0
    var rtl = 0
    var first = BidiDirection.NEUTRAL
    var technicalIndex = 0
    val strict = options.strategy == BidiDetectionStrategy.FIRST_STRONG ||
        options.strategy == BidiDetectionStrategy.STRICT_UAX9

    text.forEachCodePoint { codePoint, utf16Index, _ ->
        while (technicalIndex < technical.size && utf16Index >= technical[technicalIndex].end) {
            technicalIndex += 1
        }
        val span = technical.getOrNull(technicalIndex)
        val excluded = span != null && utf16Index >= span.start && utf16Index < span.end
        if (!excluded) {
            val direction = if (strict) {
                classifyBidiStrongCodePoint(codePoint)
            } else {
                classifyNaturalCodePoint(codePoint)
            }
            when (direction) {
                BidiDirection.LTR -> ltr += 1
                BidiDirection.RTL -> rtl += 1
                BidiDirection.NEUTRAL -> Unit
            }
            if (first == BidiDirection.NEUTRAL && direction != BidiDirection.NEUTRAL) {
                first = direction
            }
        }
    }
    return CountResult(StrongCharacterCounts(ltr, rtl), first, technical)
}

private fun directionFromCounts(result: CountResult, options: BidiOptions): BidiDirection {
    return when (options.strategy) {
        BidiDetectionStrategy.LTR -> BidiDirection.LTR
        BidiDetectionStrategy.RTL -> BidiDirection.RTL
        BidiDetectionStrategy.INHERIT -> options.inheritedDirection
        BidiDetectionStrategy.FIRST_STRONG,
        BidiDetectionStrategy.STRICT_UAX9,
        -> if (result.counts.total < options.minimumStrongCharacters) {
            options.fallback
        } else if (result.firstStrong == BidiDirection.NEUTRAL) {
            options.fallback
        } else {
            result.firstStrong
        }
        BidiDetectionStrategy.CONTENT_MAJORITY -> {
            val counts = result.counts
            if (counts.total < options.minimumStrongCharacters) return options.fallback
            when {
                counts.rtl > counts.ltr &&
                    counts.rtl.toDouble() / counts.total >= options.majorityThreshold -> BidiDirection.RTL
                counts.ltr > counts.rtl &&
                    counts.ltr.toDouble() / counts.total >= options.majorityThreshold -> BidiDirection.LTR
                result.firstStrong != BidiDirection.NEUTRAL -> result.firstStrong
                else -> options.fallback
            }
        }
    }
}

private fun confidence(counts: StrongCharacterCounts, direction: BidiDirection): Double {
    if (counts.total == 0 || direction == BidiDirection.NEUTRAL) return 0.0
    val matching = if (direction == BidiDirection.RTL) counts.rtl else counts.ltr
    return round((matching.toDouble() / counts.total) * 10_000.0) / 10_000.0
}

private fun rawFirstStrong(text: String): BidiDirection {
    var result = BidiDirection.NEUTRAL
    text.forEachCodePoint { codePoint, _, _ ->
        if (result == BidiDirection.NEUTRAL) {
            result = classifyBidiStrongCodePoint(codePoint)
        }
    }
    return result
}

private fun resolvedDirection(direction: BidiDirection, options: BidiOptions): BidiDirection =
    if (direction != BidiDirection.NEUTRAL) direction
    else if (options.fallback != BidiDirection.NEUTRAL) options.fallback
    else options.inheritedDirection

fun detectDirection(text: String, options: BidiOptions = BidiOptions()): BidiDirection =
    directionFromCounts(countStrongCharacters(text, options), options)

private fun analyzeParagraph(
    text: String,
    start: Int,
    options: BidiOptions,
): BidiParagraphAnalysis {
    val result = countStrongCharacters(text, options)
    val direction = directionFromCounts(result, options)
    return BidiParagraphAnalysis(
        text = text,
        utf16Start = start,
        utf16End = start + text.length,
        direction = direction,
        firstStrong = result.firstStrong,
        confidence = confidence(result.counts, direction),
        counts = result.counts,
    )
}

private val defaultParagraphSeparator = Regex("\\r\\n|\\n|\\r|\\u0085|[\\u001C-\\u001E]|\\u2029")

private fun splitParagraphs(text: String): List<Pair<String, Int>> {
    val result = mutableListOf<Pair<String, Int>>()
    var start = 0
    for (match in defaultParagraphSeparator.findAll(text)) {
        result += text.substring(start, match.range.first) to start
        start = match.range.last + 1
    }
    result += text.substring(start) to start
    return result
}

/** Full immutable analysis. The source string is never rewritten. */
fun analyzeBidi(
    text: String,
    options: BidiOptions = BidiOptions(),
): BidiAnalysis {
    val result = countStrongCharacters(text, options)
    val raw = countStrongCharacters(
        text,
        options.copy(
            strategy = BidiDetectionStrategy.CONTENT_MAJORITY,
            excludeTechnicalTokens = false,
        ),
        excludeTechnicalTokens = false,
    )
    val direction = directionFromCounts(result, options)
    val resolved = resolvedDirection(direction, options)
    val interventionRequired = needsBidiIntervention(text, options)
    val paragraphs = splitParagraphs(text).map { (paragraph, start) ->
        analyzeParagraph(paragraph, start, options)
    }
    return BidiAnalysis(
        text = text,
        direction = direction,
        resolvedDirection = resolved,
        firstStrong = result.firstStrong,
        rawFirstStrong = rawFirstStrong(text),
        confidence = confidence(result.counts, direction),
        counts = result.counts,
        rawCounts = raw.counts,
        paragraphs = paragraphs,
        mixed = raw.counts.ltr > 0 && raw.counts.rtl > 0,
        interventionRequired = interventionRequired,
        technicalTokens = result.technicalTokens,
        isolations = if (interventionRequired) {
            planInlineIsolation(text, resolved, options)
        } else {
            emptyList()
        },
        security = scanBidiSecurity(text),
    )
}

/**
 * Shared non-interference gate. Ordinary LTR content in an LTR host is a
 * strict no-op; controls and inherited RTL contexts deliberately disable it.
 */
fun needsBidiIntervention(
    text: String,
    options: BidiOptions = BidiOptions(),
): Boolean {
    if (options.intervention == BidiIntervention.ALWAYS) return true
    if (hasBidiControls(text)) return true
    var hasLtr = false
    var hasRtl = false
    text.forEachCodePoint { codePoint, _, _ ->
        when (classifyBidiStrongCodePoint(codePoint)) {
            BidiDirection.LTR -> hasLtr = true
            BidiDirection.RTL -> hasRtl = true
            BidiDirection.NEUTRAL -> Unit
        }
    }
    if (hasRtl) return true
    return options.inheritedDirection == BidiDirection.RTL && (hasLtr || text.isNotEmpty())
}
