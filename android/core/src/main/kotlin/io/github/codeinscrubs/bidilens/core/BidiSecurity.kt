package io.github.codeinscrubs.bidilens.core

object BidiControls {
    const val ALM = '\u061C'
    const val LRM = '\u200E'
    const val RLM = '\u200F'
    const val LRE = '\u202A'
    const val RLE = '\u202B'
    const val PDF = '\u202C'
    const val LRO = '\u202D'
    const val RLO = '\u202E'
    const val LRI = '\u2066'
    const val RLI = '\u2067'
    const val FSI = '\u2068'
    const val PDI = '\u2069'
}

private data class ControlMetadata(
    val name: String,
    val risk: BidiControlRisk,
    val category: BidiControlCategory,
)

private val controlMetadata = mapOf(
    0x061C to ControlMetadata("ARABIC LETTER MARK", BidiControlRisk.LOW, BidiControlCategory.MARK),
    0x200E to ControlMetadata("LEFT-TO-RIGHT MARK", BidiControlRisk.LOW, BidiControlCategory.MARK),
    0x200F to ControlMetadata("RIGHT-TO-LEFT MARK", BidiControlRisk.LOW, BidiControlCategory.MARK),
    0x202A to ControlMetadata("LEFT-TO-RIGHT EMBEDDING", BidiControlRisk.HIGH, BidiControlCategory.EMBEDDING),
    0x202B to ControlMetadata("RIGHT-TO-LEFT EMBEDDING", BidiControlRisk.HIGH, BidiControlCategory.EMBEDDING),
    0x202C to ControlMetadata("POP DIRECTIONAL FORMATTING", BidiControlRisk.MEDIUM, BidiControlCategory.POP),
    0x202D to ControlMetadata("LEFT-TO-RIGHT OVERRIDE", BidiControlRisk.HIGH, BidiControlCategory.OVERRIDE),
    0x202E to ControlMetadata("RIGHT-TO-LEFT OVERRIDE", BidiControlRisk.HIGH, BidiControlCategory.OVERRIDE),
    0x2066 to ControlMetadata("LEFT-TO-RIGHT ISOLATE", BidiControlRisk.MEDIUM, BidiControlCategory.ISOLATE),
    0x2067 to ControlMetadata("RIGHT-TO-LEFT ISOLATE", BidiControlRisk.MEDIUM, BidiControlCategory.ISOLATE),
    0x2068 to ControlMetadata("FIRST STRONG ISOLATE", BidiControlRisk.MEDIUM, BidiControlCategory.ISOLATE),
    0x2069 to ControlMetadata("POP DIRECTIONAL ISOLATE", BidiControlRisk.MEDIUM, BidiControlCategory.POP),
    0x206A to ControlMetadata("INHIBIT SYMMETRIC SWAPPING", BidiControlRisk.MEDIUM, BidiControlCategory.DEPRECATED),
    0x206B to ControlMetadata("ACTIVATE SYMMETRIC SWAPPING", BidiControlRisk.MEDIUM, BidiControlCategory.DEPRECATED),
    0x206C to ControlMetadata("INHIBIT ARABIC FORM SHAPING", BidiControlRisk.MEDIUM, BidiControlCategory.DEPRECATED),
    0x206D to ControlMetadata("ACTIVATE ARABIC FORM SHAPING", BidiControlRisk.MEDIUM, BidiControlCategory.DEPRECATED),
    0x206E to ControlMetadata("NATIONAL DIGIT SHAPES", BidiControlRisk.MEDIUM, BidiControlCategory.DEPRECATED),
    0x206F to ControlMetadata("NOMINAL DIGIT SHAPES", BidiControlRisk.MEDIUM, BidiControlCategory.DEPRECATED),
)

fun findBidiControls(text: String): List<BidiControlFinding> {
    val findings = mutableListOf<BidiControlFinding>()
    text.forEachCodePoint { codePoint, utf16Index, codePointIndex ->
        val metadata = controlMetadata[codePoint] ?: return@forEachCodePoint
        val character = String(Character.toChars(codePoint))
        findings += BidiControlFinding(
            character = character,
            codePoint = "U+${codePoint.toString(16).uppercase().padStart(4, '0')}",
            name = metadata.name,
            utf16Start = utf16Index,
            utf16End = utf16Index + character.length,
            codePointIndex = codePointIndex,
            risk = metadata.risk,
            category = metadata.category,
        )
    }
    return findings
}

fun hasBidiControls(text: String): Boolean = text.any { character ->
    character.code in controlMetadata
}

fun stripBidiControls(text: String): String = buildString(text.length) {
    text.forEachCodePoint { codePoint, _, _ ->
        if (codePoint !in controlMetadata) appendCodePoint(codePoint)
    }
}

private fun BidiControlFinding.range() = BidiSourceRange(
    utf16Start = utf16Start,
    utf16End = utf16End,
    codePointStart = codePointIndex,
    codePointEnd = codePointIndex + 1,
)

private data class FormattingFrame(val isolate: Boolean, val finding: BidiControlFinding)

private fun balanceParagraph(
    controls: List<BidiControlFinding>,
    boundary: String,
): List<BidiSecurityFinding> {
    val findings = mutableListOf<BidiSecurityFinding>()
    val stack = mutableListOf<FormattingFrame>()

    for (control in controls) {
        when (val code = control.character.codePointAt(0)) {
            0x202A, 0x202B, 0x202D, 0x202E -> stack += FormattingFrame(false, control)
            0x2066, 0x2067, 0x2068 -> stack += FormattingFrame(true, control)
            0x202C -> {
                val embedding = stack.indexOfLast { !it.isolate }
                val isolate = stack.indexOfLast { it.isolate }
                if (embedding <= isolate) {
                    findings += BidiSecurityFinding(
                        code = "BIDI_UNMATCHED_PDF",
                        message = "POP DIRECTIONAL FORMATTING has no matching active embedding or override.",
                        range = control.range(),
                        risk = BidiControlRisk.HIGH,
                    )
                } else {
                    stack.removeAt(embedding)
                }
            }
            0x2069 -> {
                val isolate = stack.indexOfLast { it.isolate }
                if (isolate < 0) {
                    findings += BidiSecurityFinding(
                        code = "BIDI_UNMATCHED_PDI",
                        message = "POP DIRECTIONAL ISOLATE has no matching isolate opener.",
                        range = control.range(),
                        risk = BidiControlRisk.HIGH,
                    )
                } else {
                    for (frame in stack.drop(isolate + 1).filterNot { it.isolate }) {
                        findings += BidiSecurityFinding(
                            code = "BIDI_FORMAT_CROSSES_ISOLATE_BOUNDARY",
                            message = "${frame.finding.name} is not closed before the containing isolate ends.",
                            range = frame.finding.range(),
                            risk = BidiControlRisk.HIGH,
                        )
                    }
                    while (stack.size > isolate) stack.removeAt(stack.lastIndex)
                }
            }
            else -> Unit
        }
    }
    for (frame in stack) {
        findings += BidiSecurityFinding(
            code = if (frame.isolate) "BIDI_UNCLOSED_ISOLATE" else "BIDI_UNCLOSED_EMBEDDING",
            message = "${frame.finding.name} is not terminated before $boundary.",
            range = frame.finding.range(),
            risk = BidiControlRisk.HIGH,
        )
    }
    return findings
}

private fun balanceFindings(text: String, controls: List<BidiControlFinding>): List<BidiSecurityFinding> {
    val findings = mutableListOf<BidiSecurityFinding>()
    val separator = Regex("\\r\\n|\\n|\\r|\\u0085|[\\u001C-\\u001E]|\\u2029")
    var controlIndex = 0
    for (match in separator.findAll(text)) {
        val paragraphControls = mutableListOf<BidiControlFinding>()
        while (controlIndex < controls.size && controls[controlIndex].utf16Start < match.range.first) {
            paragraphControls += controls[controlIndex]
            controlIndex += 1
        }
        findings += balanceParagraph(paragraphControls, "the paragraph boundary")
    }
    findings += balanceParagraph(controls.drop(controlIndex), "the end of the text")
    return findings
}

fun scanBidiSecurity(text: String): BidiSecurityReport {
    val controls = findBidiControls(text)
    val findings = controls.map { control ->
        BidiSecurityFinding(
            code = when (control.category) {
                BidiControlCategory.OVERRIDE -> "BIDI_OVERRIDE_CONTROL"
                BidiControlCategory.EMBEDDING -> "BIDI_EMBEDDING_CONTROL"
                BidiControlCategory.ISOLATE -> "BIDI_ISOLATE_CONTROL"
                BidiControlCategory.MARK -> "BIDI_DIRECTIONAL_MARK"
                BidiControlCategory.DEPRECATED -> "BIDI_DEPRECATED_CONTROL"
                BidiControlCategory.POP -> "BIDI_POP_CONTROL"
            },
            message = "${control.name} (${control.codePoint}) is invisible and changes bidirectional interpretation.",
            range = control.range(),
            risk = control.risk,
        )
    }.toMutableList()
    findings += balanceFindings(text, controls)

    val sorted = findings.sortedWith(compareBy<BidiSecurityFinding> { it.range.utf16Start }.thenBy { it.code })
    return BidiSecurityReport(
        safe = sorted.none { it.risk == BidiControlRisk.HIGH },
        controls = controls,
        findings = sorted,
    )
}
