package io.github.codeinscrubs.bidilens.core

private val DEFAULT_TECHNICAL_IDENTIFIERS = setOf(
    "ai", "api", "anthropic", "chatgpt", "claude", "cli", "codex", "copilot", "cursor",
    "deepseek", "electron", "gemini", "github", "gitlab", "grok", "huggingface",
    "javascript", "json", "llama", "markdown", "mistral", "node", "npm", "openai",
    "python", "qwen", "react", "rust", "svelte", "typescript", "url", "version",
    "vscode", "vue", "web", "webpack", "yaml", "angular", "astro", "chrome", "docker",
    "esbuild", "eslint", "firefox", "kubernetes", "kubectl", "nuxt", "playwright",
    "pnpm", "preact", "remix", "rollup", "safari", "stencil", "storybook", "tailwind",
    "turbopack", "vite", "vitest",
)

private val technicalTrailingPunctuation = setOf(
    '.', ',', ';', ':', '!', '?', '\u060C', '\u061B', '\u061F', '\u3002', '\u0964', '\u06D4',
)

private fun MutableList<TechnicalTokenRange>.addRange(
    source: String,
    start: Int,
    end: Int,
    kind: TechnicalTokenKind,
) {
    if (end > start) add(TechnicalTokenRange(source.substring(start, end), start, end, kind))
}

private fun MutableList<TechnicalTokenRange>.addMatches(
    source: String,
    regex: Regex,
    kind: TechnicalTokenKind,
    group: Int = 0,
    normalize: (String) -> String = { it },
    validate: (String) -> Boolean = { true },
) {
    for (match in regex.findAll(source)) {
        val groupValue = match.groups[group] ?: continue
        val original = groupValue.value
        if (!validate(original)) continue
        val value = normalize(original)
        if (value.isEmpty()) continue
        addRange(source, groupValue.range.first, groupValue.range.first + value.length, kind)
    }
}

private fun trimTechnicalPunctuation(value: String): String {
    var end = value.length
    while (end > 0 && value[end - 1] in technicalTrailingPunctuation) end -= 1
    return value.substring(0, end)
}

private fun isIpv4(value: String): Boolean {
    val parts = value.split('.')
    return parts.size == 4 && parts.all { part ->
        part.length in 1..3 && part.all(Char::isDigit) && part.toIntOrNull() in 0..255
    }
}

private fun isIpv6(value: String): Boolean {
    if (':' !in value || !value.matches(Regex("^[0-9A-Fa-f:]+$"))) return false
    if (value.indexOf("::") != value.lastIndexOf("::")) return false
    val compressed = "::" in value
    val groups = if (compressed) {
        value.split("::").flatMap { side -> if (side.isEmpty()) emptyList() else side.split(':') }
    } else {
        value.split(':')
    }
    if (!groups.all { it.length in 1..4 && it.matches(Regex("^[0-9A-Fa-f]+$")) }) return false
    return if (compressed) groups.size < 8 else groups.size == 8
}

private data class Fence(val marker: Char, val length: Int, val start: Int)

private fun addCodeRanges(source: String, ranges: MutableList<TechnicalTokenRange>) {
    var fence: Fence? = null
    val closedFences = mutableListOf<IntRange>()
    var lineStart = 0
    while (lineStart < source.length) {
        var lineEnd = lineStart
        while (lineEnd < source.length && source[lineEnd] != '\r' && source[lineEnd] != '\n') lineEnd += 1
        var nextLine = lineEnd
        if (nextLine < source.length && source[nextLine] == '\r') nextLine += 1
        if (nextLine < source.length && source[nextLine] == '\n') nextLine += 1
        val line = source.substring(lineStart, lineEnd)
        val active = fence
        if (active == null) {
            val opener = Regex("^ {0,3}(`{3,}|~{3,})(.*)$").find(line)
            val marker = opener?.groups?.get(1)?.value
            val info = opener?.groups?.get(2)?.value.orEmpty()
            if (marker != null && !(marker[0] == '`' && '`' in info)) {
                fence = Fence(marker[0], marker.length, lineStart)
            }
        } else {
            val closer = Regex("^ {0,3}(`+|~+)[ \\t]*$").find(line)?.groups?.get(1)?.value
            if (closer != null && closer[0] == active.marker && closer.length >= active.length) {
                closedFences += active.start until nextLine
                fence = null
            }
        }
        lineStart = nextLine
    }

    var hasOutsideNaturalText = false
    source.forEachCodePoint { codePoint, utf16Index, _ ->
        val inside = closedFences.any { utf16Index in it }
        if (!inside && classifyNaturalCodePoint(codePoint) != BidiDirection.NEUTRAL) {
            hasOutsideNaturalText = true
        }
    }
    if (hasOutsideNaturalText) {
        for (span in closedFences) {
            ranges.addRange(source, span.first, span.last + 1, TechnicalTokenKind.CODE)
        }
    }

    var offset = 0
    for (line in source.split(Regex("\\r\\n|\\r|\\n"))) {
        val runs = mutableListOf<Pair<Int, Int>>()
        var index = 0
        while (index < line.length) {
            if (line[index] != '`') {
                index += 1
                continue
            }
            val start = index
            while (index < line.length && line[index] == '`') index += 1
            runs += start to (index - start)
        }
        val suffixMaximum = IntArray(runs.size + 1)
        for (runIndex in runs.indices.reversed()) {
            suffixMaximum[runIndex] = maxOf(runs[runIndex].second, suffixMaximum[runIndex + 1])
        }
        var runIndex = 0
        var cursor = runs.firstOrNull()?.first ?: 0
        while (runIndex < runs.size) {
            val (runStart, runLength) = runs[runIndex]
            val openerEnd = runStart + runLength
            if (cursor >= openerEnd) {
                runIndex += 1
                cursor = runs.getOrNull(runIndex)?.first ?: 0
                continue
            }
            val available = openerEnd - cursor
            val delimiterLength = minOf(
                available,
                maxOf(available / 2, suffixMaximum[runIndex + 1]),
            )
            if (delimiterLength == 0) {
                runIndex += 1
                cursor = runs.getOrNull(runIndex)?.first ?: 0
                continue
            }
            var closingRunIndex = runIndex
            var closingStart = cursor + delimiterLength
            if (available - delimiterLength < delimiterLength) {
                closingRunIndex += 1
                while (closingRunIndex < runs.size && runs[closingRunIndex].second < delimiterLength) {
                    closingRunIndex += 1
                }
                if (closingRunIndex >= runs.size) {
                    runIndex += 1
                    cursor = runs.getOrNull(runIndex)?.first ?: 0
                    continue
                }
                closingStart = runs[closingRunIndex].first
            }
            val end = closingStart + delimiterLength
            ranges.addRange(source, offset + cursor, offset + end, TechnicalTokenKind.CODE)
            runIndex = closingRunIndex
            cursor = end
        }
        offset += line.length
        if (offset < source.length && source[offset] == '\r') offset += 1
        if (offset < source.length && source[offset] == '\n') offset += 1
    }
}

/**
 * Acronyms are short. A longer all-capital word is emphasized prose, not an
 * identifier, and must keep deciding the natural-language base direction.
 */
private const val ACRONYM_MAXIMUM_LENGTH = 5

private fun isKnownTechnicalWord(value: String, custom: Set<String>): Boolean {
    val normalized = value.lowercase()
    return normalized in DEFAULT_TECHNICAL_IDENTIFIERS || normalized in custom
}

/**
 * Reports whether capitals are the block's prose style rather than an
 * identifier signal. `PLEASE READ THIS WARNING` is emphasized natural language;
 * the same `API` token inside mixed-case prose is an acronym.
 */
private fun usesUppercaseProse(text: String): Boolean {
    var total = 0
    var capitalized = 0
    var hasLongCapitalizedWord = false
    for (match in Regex("\\b[A-Za-z]{2,}\\b").findAll(text)) {
        total += 1
        if (match.value.all { it in 'A'..'Z' }) {
            capitalized += 1
            if (match.value.length > ACRONYM_MAXIMUM_LENGTH) hasLongCapitalizedWord = true
        }
    }
    // `HTTP API` is an acronym sequence, not proof of an uppercase prose style.
    return total >= 2 && hasLongCapitalizedWord && capitalized * 2 > total
}

private fun isTechnicalIdentifier(
    token: String,
    custom: Set<String>,
    uppercaseProse: Boolean,
): Boolean {
    if (isKnownTechnicalWord(token, custom)) return true
    // A hyphenated token is technical when a segment is itself a known technical
    // word (`react-markdown`), not merely because it is hyphenated. `well-known`
    // and `state-of-the-art` are ordinary English and stay direction evidence.
    if (token.contains('-') &&
        token.split('-').any { it.isNotEmpty() && isKnownTechnicalWord(it, custom) }
    ) {
        return true
    }
    // The hyphen is deliberately absent here: only digits, underscores, and dots
    // are structural identifier syntax.
    return token.any { it.isDigit() || it == '_' || it == '.' } ||
        Regex("[a-z][A-Z]").containsMatchIn(token) ||
        (
            !uppercaseProse &&
                token.length <= ACRONYM_MAXIMUM_LENGTH &&
                token.matches(Regex("^[A-Z]{2,}$"))
            )
}

/** Finds technical spans that should not decide natural-language direction. */
fun findTechnicalTokenRanges(
    text: String,
    technicalIdentifiers: Set<String> = emptySet(),
): List<TechnicalTokenRange> {
    val ranges = mutableListOf<TechnicalTokenRange>()
    addCodeRanges(text, ranges)
    ranges.addMatches(text, Regex("</?[A-Za-z][^<>\\r\\n]*>"), TechnicalTokenKind.HTML)
    ranges.addMatches(
        text,
        Regex("(?:\\$\\$[^\\r\\n]*?\\$\\$|\\$[^\\$\\r\\n]+\\$|\\\\\\([^\\r\\n]*?\\\\\\))"),
        TechnicalTokenKind.MATH,
    )

    for (match in Regex("\\b(?:https?|ftp)://[^\\s<>{}\"']+", RegexOption.IGNORE_CASE).findAll(text)) {
        var value = trimTechnicalPunctuation(match.value)
        for ((open, close) in listOf('(' to ')', '[' to ']', '{' to '}')) {
            if (!value.endsWith(close)) continue
            var balance = value.count { it == open } - value.count { it == close }
            var end = value.length
            while (balance < 0 && end > 0 && value[end - 1] == close) {
                balance += 1
                end -= 1
            }
            value = value.substring(0, end)
        }
        ranges.addRange(text, match.range.first, match.range.first + value.length, TechnicalTokenKind.URL)
    }

    ranges.addMatches(
        text,
        Regex("\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b", RegexOption.IGNORE_CASE),
        TechnicalTokenKind.EMAIL,
    )
    ranges.addMatches(
        text,
        Regex("(?<![\\p{L}\\p{N}_])(?:[A-Za-z]:[\\\\/]|\\.{0,2}/|~/)[^\\s<>()\\[\\]{}]+"),
        TechnicalTokenKind.PATH,
        normalize = ::trimTechnicalPunctuation,
    )
    ranges.addMatches(
        text,
        Regex("\\b(?:[A-Za-z0-9_.-]+[\\\\/])+(?:[A-Za-z0-9_.-]+)\\b"),
        TechnicalTokenKind.PATH,
    )
    ranges.addMatches(
        text,
        Regex("(?<![\\w@])@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*", RegexOption.IGNORE_CASE),
        TechnicalTokenKind.IDENTIFIER,
    )
    ranges.addMatches(
        text,
        Regex("(?:\\$\\{?[A-Z_][A-Z0-9_]*\\}?|%[A-Z_][A-Z0-9_]*%)"),
        TechnicalTokenKind.IDENTIFIER,
    )
    ranges.addMatches(
        text,
        Regex(
            "\\b(?:npm|pnpm|yarn|npx|git|pip|python|node|cargo|go|docker|kubectl)" +
                "(?:\\s+(?:--?[A-Za-z0-9_-]+|[@./\\\\A-Za-z0-9_:=+-]+|'[^'\\r\\n]*'|\"[^\"\\r\\n]*\"))+",
        ),
        TechnicalTokenKind.COMMAND,
    )
    ranges.addMatches(
        text,
        Regex("\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b"),
        TechnicalTokenKind.NUMBER,
        validate = ::isIpv4,
    )
    ranges.addMatches(
        text,
        Regex("(?<![0-9A-Fa-f:])(?:[0-9A-Fa-f]{0,4}:){2,7}[0-9A-Fa-f]{0,4}(?![0-9A-Fa-f:])"),
        TechnicalTokenKind.NUMBER,
        validate = ::isIpv6,
    )
    ranges.addMatches(
        text,
        Regex("(?<![\\p{L}\\p{N}_])\\+?\\d[\\d ()-]{6,}\\d(?![\\p{L}\\p{N}_])"),
        TechnicalTokenKind.NUMBER,
    )
    ranges.addMatches(
        text,
        Regex("\\b\\d{4}[-/]\\d{1,2}[-/]\\d{1,2}(?:[T ]\\d{1,2}:\\d{2}(?::\\d{2})?(?:Z|[+-]\\d{2}:?\\d{2})?)?\\b"),
        TechnicalTokenKind.NUMBER,
    )
    ranges.addMatches(
        text,
        Regex("\\b\\d{1,2}:\\d{2}(?::\\d{2})?(?:\\s?[AP]M)?\\b", RegexOption.IGNORE_CASE),
        TechnicalTokenKind.NUMBER,
    )
    ranges.addMatches(text, Regex("\\bv?\\d+(?:\\.\\d+){1,}\\b"), TechnicalTokenKind.VERSION)
    ranges.addMatches(
        text,
        Regex("\\b[0-9a-f]{7,40}\\b", RegexOption.IGNORE_CASE),
        TechnicalTokenKind.HASH,
    )
    ranges.addMatches(
        text,
        Regex(
            "(?<![\\p{L}\\p{N}_])[+-]?(?:\\d+(?:[.,]\\d+)?|" +
                "[\\u0660-\\u0669]+(?:[\\u066B\\u066C][\\u0660-\\u0669]+)?|" +
                "[\\u06F0-\\u06F9]+(?:[.,][\\u06F0-\\u06F9]+)?)(?![\\p{L}\\p{N}_])",
        ),
        TechnicalTokenKind.NUMBER,
    )

    val custom = technicalIdentifiers
        .asSequence()
        .filter { it.matches(Regex("^[A-Za-z][A-Za-z0-9_.-]*$")) }
        .map(String::lowercase)
        .toSet()
    val uppercaseProse = usesUppercaseProse(text)
    for (match in Regex("\\b[A-Za-z][A-Za-z0-9_.-]*\\b").findAll(text)) {
        if (isTechnicalIdentifier(match.value, custom, uppercaseProse)) {
            ranges.addRange(text, match.range.first, match.range.last + 1, TechnicalTokenKind.IDENTIFIER)
        }
    }

    val sorted = ranges.sortedWith(compareBy<TechnicalTokenRange> { it.start }.thenByDescending { it.end })
    val merged = mutableListOf<TechnicalTokenRange>()
    for (range in sorted) {
        val previous = merged.lastOrNull()
        if (previous != null && range.start <= previous.end) {
            val end = maxOf(previous.end, range.end)
            merged[merged.lastIndex] = previous.copy(text = text.substring(previous.start, end), end = end)
        } else {
            merged += range
        }
    }
    return merged
}
