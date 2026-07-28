package io.github.codeinscrubs.bidilens.core

/** Logical base direction. Neutral is intentionally unresolved. */
enum class BidiDirection {
    LTR,
    RTL,
    NEUTRAL,
}

enum class BidiDetectionStrategy {
    CONTENT_MAJORITY,
    FIRST_STRONG,
    STRICT_UAX9,
    INHERIT,
    LTR,
    RTL,
}

enum class BidiIntervention {
    AUTO,
    ALWAYS,
}

data class BidiOptions(
    val strategy: BidiDetectionStrategy = BidiDetectionStrategy.CONTENT_MAJORITY,
    val fallback: BidiDirection = BidiDirection.NEUTRAL,
    val inheritedDirection: BidiDirection = BidiDirection.LTR,
    val minimumStrongCharacters: Int = 1,
    val majorityThreshold: Double = 0.5,
    val excludeTechnicalTokens: Boolean = strategy == BidiDetectionStrategy.CONTENT_MAJORITY,
    val technicalIdentifiers: Set<String> = emptySet(),
    val intervention: BidiIntervention = BidiIntervention.AUTO,
) {
    init {
        require(inheritedDirection != BidiDirection.NEUTRAL) {
            "inheritedDirection must resolve to LTR or RTL"
        }
        require(minimumStrongCharacters >= 1) {
            "minimumStrongCharacters must be at least one"
        }
        require(majorityThreshold in 0.5..1.0) {
            "majorityThreshold must be between 0.5 and 1.0"
        }
    }
}

data class StrongCharacterCounts(
    val ltr: Int,
    val rtl: Int,
) {
    val total: Int get() = ltr + rtl
}

data class BidiSourceRange(
    val utf16Start: Int,
    val utf16End: Int,
    val codePointStart: Int,
    val codePointEnd: Int,
)

data class BidiParagraphAnalysis(
    val text: String,
    val utf16Start: Int,
    val utf16End: Int,
    val direction: BidiDirection,
    val firstStrong: BidiDirection,
    val confidence: Double,
    val counts: StrongCharacterCounts,
)

data class BidiAnalysis(
    val text: String,
    val direction: BidiDirection,
    val resolvedDirection: BidiDirection,
    val firstStrong: BidiDirection,
    val rawFirstStrong: BidiDirection,
    val confidence: Double,
    val counts: StrongCharacterCounts,
    val rawCounts: StrongCharacterCounts,
    val paragraphs: List<BidiParagraphAnalysis>,
    val mixed: Boolean,
    val interventionRequired: Boolean,
    val technicalTokens: List<TechnicalTokenRange>,
    val isolations: List<BidiIsolation>,
    val security: BidiSecurityReport,
)

enum class TechnicalTokenKind {
    CODE,
    URL,
    EMAIL,
    PATH,
    VERSION,
    HASH,
    IDENTIFIER,
    NUMBER,
    COMMAND,
    MATH,
    HTML,
}

data class TechnicalTokenRange(
    val text: String,
    val start: Int,
    val end: Int,
    val kind: TechnicalTokenKind,
)

enum class BidiIsolationKind {
    CODE,
    URL,
    EMAIL,
    PATH,
    VERSION,
    HASH,
    IDENTIFIER,
    NUMBER,
    COMMAND,
    MATH,
    HTML,
    OPPOSITE_DIRECTION_RUN,
}

data class BidiIsolation(
    val text: String,
    val direction: BidiDirection,
    val start: Int,
    val end: Int,
    val sourceRange: BidiSourceRange,
    val kind: BidiIsolationKind,
)

data class DirectionalRun(
    val text: String,
    val direction: BidiDirection,
    val start: Int,
    val end: Int,
)

enum class BidiControlRisk {
    LOW,
    MEDIUM,
    HIGH,
}

enum class BidiControlCategory {
    MARK,
    EMBEDDING,
    OVERRIDE,
    ISOLATE,
    POP,
    DEPRECATED,
}

data class BidiControlFinding(
    val character: String,
    val codePoint: String,
    val name: String,
    val utf16Start: Int,
    val utf16End: Int,
    val codePointIndex: Int,
    val risk: BidiControlRisk,
    val category: BidiControlCategory,
)

data class BidiSecurityFinding(
    val code: String,
    val message: String,
    val range: BidiSourceRange,
    val risk: BidiControlRisk,
)

data class BidiSecurityReport(
    val safe: Boolean,
    val controls: List<BidiControlFinding>,
    val findings: List<BidiSecurityFinding>,
)
