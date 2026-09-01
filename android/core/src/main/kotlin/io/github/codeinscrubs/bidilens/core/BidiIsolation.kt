package io.github.codeinscrubs.bidilens.core

private fun TechnicalTokenKind.toIsolationKind(): BidiIsolationKind = when (this) {
    TechnicalTokenKind.CODE -> BidiIsolationKind.CODE
    TechnicalTokenKind.URL -> BidiIsolationKind.URL
    TechnicalTokenKind.EMAIL -> BidiIsolationKind.EMAIL
    TechnicalTokenKind.PATH -> BidiIsolationKind.PATH
    TechnicalTokenKind.VERSION -> BidiIsolationKind.VERSION
    TechnicalTokenKind.HASH -> BidiIsolationKind.HASH
    TechnicalTokenKind.IDENTIFIER -> BidiIsolationKind.IDENTIFIER
    TechnicalTokenKind.NUMBER -> BidiIsolationKind.NUMBER
    TechnicalTokenKind.COMMAND -> BidiIsolationKind.COMMAND
    TechnicalTokenKind.MATH -> BidiIsolationKind.MATH
    TechnicalTokenKind.HTML -> BidiIsolationKind.HTML
}

private fun resolveNeutralRuns(runs: List<DirectionalRun>): List<DirectionalRun> {
    val previous = MutableList(runs.size) { BidiDirection.NEUTRAL }
    val next = MutableList(runs.size) { BidiDirection.NEUTRAL }
    var direction = BidiDirection.NEUTRAL
    for (index in runs.indices) {
        previous[index] = direction
        if (runs[index].direction != BidiDirection.NEUTRAL) direction = runs[index].direction
    }
    direction = BidiDirection.NEUTRAL
    for (index in runs.indices.reversed()) {
        next[index] = direction
        if (runs[index].direction != BidiDirection.NEUTRAL) direction = runs[index].direction
    }
    return runs.mapIndexed { index, run ->
        if (run.direction != BidiDirection.NEUTRAL) return@mapIndexed run
        val before = previous[index]
        val after = next[index]
        run.copy(
            direction = when {
                before == after && before != BidiDirection.NEUTRAL -> before
                before != BidiDirection.NEUTRAL -> before
                else -> after
            },
        )
    }
}

fun segmentDirectionalRuns(text: String): List<DirectionalRun> {
    if (text.isEmpty()) return emptyList()
    val raw = mutableListOf<DirectionalRun>()
    var currentDirection: BidiDirection? = null
    var currentStart = 0
    var currentEnd = 0
    text.forEachCodePoint { codePoint, utf16Index, _ ->
        val direction = classifyNaturalCodePoint(codePoint)
        val charEnd = utf16Index + Character.charCount(codePoint)
        if (currentDirection == null) {
            currentDirection = direction
            currentStart = utf16Index
            currentEnd = charEnd
        } else if (currentDirection == direction) {
            currentEnd = charEnd
        } else {
            raw += DirectionalRun(
                text.substring(currentStart, currentEnd),
                currentDirection,
                currentStart,
                currentEnd,
            )
            currentDirection = direction
            currentStart = utf16Index
            currentEnd = charEnd
        }
    }
    raw += DirectionalRun(text.substring(currentStart, currentEnd), currentDirection!!, currentStart, currentEnd)
    val merged = mutableListOf<DirectionalRun>()
    for (run in resolveNeutralRuns(raw)) {
        val last = merged.lastOrNull()
        if (last != null && last.direction == run.direction) {
            merged[merged.lastIndex] = last.copy(text = last.text + run.text, end = run.end)
        } else {
            merged += run
        }
    }
    return merged
}

private fun trimNeutralBoundaries(text: String, originalStart: Int, originalEnd: Int): IntRange {
    var start = originalStart
    var end = originalEnd
    while (start < end) {
        val codePoint = Character.codePointAt(text, start)
        if (classifyNaturalCodePoint(codePoint) != BidiDirection.NEUTRAL ||
            isCombiningMarkCodePoint(codePoint)
        ) break
        start += Character.charCount(codePoint)
    }
    while (end > start) {
        val codePoint = Character.codePointBefore(text, end)
        if (classifyNaturalCodePoint(codePoint) != BidiDirection.NEUTRAL ||
            isCombiningMarkCodePoint(codePoint)
        ) break
        end -= Character.charCount(codePoint)
    }
    return start until end
}

private fun String.sourceRange(start: Int, end: Int) = BidiSourceRange(
    utf16Start = start,
    utf16End = end,
    codePointStart = codePointOffsetAt(start),
    codePointEnd = codePointOffsetAt(end),
)

private val hardFragmentSeparators = setOf(',', '،', ';', '؛', ':', '!', '?', '؟', '|')

/**
 * Keeps whitespace-separated LTR phrases in source order while leaving hard
 * punctuation between independently ordered fragments outside the isolates.
 */
private fun normalizeIsolationPlan(
    text: String,
    isolations: List<BidiIsolation>,
): List<BidiIsolation> {
    val split = mutableListOf<BidiIsolation>()
    for (isolation in isolations) {
        if (isolation.kind != BidiIsolationKind.OPPOSITE_DIRECTION_RUN) {
            split += isolation
            continue
        }
        var pieceStart = isolation.start
        var cursor = isolation.start
        while (cursor < isolation.end) {
            val codePoint = Character.codePointAt(text, cursor)
            val charEnd = cursor + Character.charCount(codePoint)
            if (codePoint.toChar() in hardFragmentSeparators) {
                val trimmed = trimNeutralBoundaries(text, pieceStart, cursor)
                if (!trimmed.isEmpty()) {
                    val start = trimmed.first
                    val end = trimmed.last + 1
                    split += isolation.copy(
                        text = text.substring(start, end),
                        start = start,
                        end = end,
                        sourceRange = text.sourceRange(start, end),
                    )
                }
                pieceStart = charEnd
            }
            cursor = charEnd
        }
        val trimmed = trimNeutralBoundaries(text, pieceStart, isolation.end)
        if (!trimmed.isEmpty()) {
            val start = trimmed.first
            val end = trimmed.last + 1
            split += isolation.copy(
                text = text.substring(start, end),
                start = start,
                end = end,
                sourceRange = text.sourceRange(start, end),
            )
        }
    }

    val merged = mutableListOf<BidiIsolation>()
    for (isolation in split.sortedWith(compareBy<BidiIsolation> { it.start }.thenBy { it.end })) {
        val previous = merged.lastOrNull()
        val whitespaceGap = previous != null &&
            previous.end <= isolation.start &&
            text.substring(previous.end, isolation.start).all(Char::isWhitespace)
        if (previous != null && previous.direction == isolation.direction && whitespaceGap) {
            val kind = if (previous.kind == isolation.kind) {
                previous.kind
            } else {
                BidiIsolationKind.OPPOSITE_DIRECTION_RUN
            }
            merged[merged.lastIndex] = previous.copy(
                text = text.substring(previous.start, isolation.end),
                end = isolation.end,
                sourceRange = text.sourceRange(previous.start, isolation.end),
                kind = kind,
            )
        } else {
            merged += isolation
        }
    }
    return merged
}

fun planInlineIsolation(
    text: String,
    blockDirection: BidiDirection,
    options: BidiOptions = BidiOptions(),
): List<BidiIsolation> {
    require(blockDirection != BidiDirection.NEUTRAL)
    if (!needsBidiIntervention(text, options.copy(inheritedDirection = blockDirection))) return emptyList()
    val technical = if (options.excludeTechnicalTokens) {
        findTechnicalTokenRanges(text, options.technicalIdentifiers)
    } else {
        emptyList()
    }
    val isolations = technical.mapTo(mutableListOf()) { range ->
        BidiIsolation(
            text = range.text,
            direction = BidiDirection.LTR,
            start = range.start,
            end = range.end,
            sourceRange = text.sourceRange(range.start, range.end),
            kind = range.kind.toIsolationKind(),
        )
    }

    var technicalIndex = 0
    for (run in segmentDirectionalRuns(text)) {
        if (run.direction == BidiDirection.NEUTRAL || run.direction == blockDirection) continue
        while (technicalIndex < technical.size && technical[technicalIndex].end <= run.start) {
            technicalIndex += 1
        }
        var cursor = run.start
        var index = technicalIndex
        while (index < technical.size) {
            val range = technical[index]
            if (range.end <= cursor) {
                index += 1
                continue
            }
            if (range.start >= run.end) break
            val partEnd = minOf(range.start, run.end)
            if (cursor < partEnd) {
                val trimmed = trimNeutralBoundaries(text, cursor, partEnd)
                if (!trimmed.isEmpty()) {
                    val start = trimmed.first
                    val end = trimmed.last + 1
                    isolations += BidiIsolation(
                        text.substring(start, end),
                        run.direction,
                        start,
                        end,
                        text.sourceRange(start, end),
                        BidiIsolationKind.OPPOSITE_DIRECTION_RUN,
                    )
                }
            }
            cursor = maxOf(cursor, range.end)
            if (cursor >= run.end) break
            index += 1
        }
        if (cursor < run.end) {
            val trimmed = trimNeutralBoundaries(text, cursor, run.end)
            if (!trimmed.isEmpty()) {
                val start = trimmed.first
                val end = trimmed.last + 1
                isolations += BidiIsolation(
                    text.substring(start, end),
                    run.direction,
                    start,
                    end,
                    text.sourceRange(start, end),
                    BidiIsolationKind.OPPOSITE_DIRECTION_RUN,
                )
            }
        }
    }
    return normalizeIsolationPlan(text, isolations)
}

fun isolateText(
    text: String,
    direction: BidiDirection = BidiDirection.NEUTRAL,
): String {
    val opener = when (direction) {
        BidiDirection.LTR -> BidiControls.LRI
        BidiDirection.RTL -> BidiControls.RLI
        BidiDirection.NEUTRAL -> BidiControls.FSI
    }
    return "$opener$text${BidiControls.PDI}"
}

/**
 * Adds isolation only to a transient rendering value. Never persist this
 * result; keep [BidiAnalysis.text] as the source of truth.
 */
fun formatBidiForDisplay(
    analysis: BidiAnalysis,
): String {
    if (!analysis.interventionRequired || analysis.isolations.isEmpty()) return analysis.text
    val output = StringBuilder(analysis.text.length + analysis.isolations.size * 2)
    var cursor = 0
    for (isolation in analysis.isolations) {
        if (isolation.start < cursor) continue
        output.append(analysis.text, cursor, isolation.start)
        output.append(
            when (isolation.direction) {
                BidiDirection.LTR -> BidiControls.LRI
                BidiDirection.RTL -> BidiControls.RLI
                BidiDirection.NEUTRAL -> BidiControls.FSI
            },
        )
        output.append(analysis.text, isolation.start, isolation.end)
        output.append(BidiControls.PDI)
        cursor = isolation.end
    }
    output.append(analysis.text, cursor, analysis.text.length)
    return output.toString()
}
