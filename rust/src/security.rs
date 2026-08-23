use crate::SourceRange;

/// Relative risk of a hidden bidi control.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum BidiControlRisk {
    Low,
    Medium,
    High,
}

/// Semantic bidi-control family.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum BidiControlCategory {
    Mark,
    Embedding,
    Override,
    Isolate,
    Pop,
    Deprecated,
}

/// A hidden bidi control and its exact source location.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BidiControlFinding {
    pub character: char,
    pub code_point: String,
    pub name: &'static str,
    pub source_range: SourceRange,
    pub risk: BidiControlRisk,
    pub category: BidiControlCategory,
}

/// Security-oriented finding for hidden formatting or invisible content.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SecurityFinding {
    pub code: &'static str,
    pub message: String,
    pub source_range: SourceRange,
    pub risk: BidiControlRisk,
}

/// Non-mutating hidden-control audit.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SecurityReport {
    pub safe: bool,
    pub controls: Vec<BidiControlFinding>,
    pub findings: Vec<SecurityFinding>,
}

impl Default for SecurityReport {
    fn default() -> Self {
        Self {
            safe: true,
            controls: Vec::new(),
            findings: Vec::new(),
        }
    }
}

fn metadata(character: char) -> Option<(&'static str, BidiControlRisk, BidiControlCategory)> {
    use BidiControlCategory::{Deprecated, Embedding, Isolate, Mark, Override, Pop};
    use BidiControlRisk::{High, Low, Medium};
    Some(match character {
        '\u{061C}' => ("ARABIC LETTER MARK", Low, Mark),
        '\u{200E}' => ("LEFT-TO-RIGHT MARK", Low, Mark),
        '\u{200F}' => ("RIGHT-TO-LEFT MARK", Low, Mark),
        '\u{202A}' => ("LEFT-TO-RIGHT EMBEDDING", High, Embedding),
        '\u{202B}' => ("RIGHT-TO-LEFT EMBEDDING", High, Embedding),
        '\u{202C}' => ("POP DIRECTIONAL FORMATTING", Medium, Pop),
        '\u{202D}' => ("LEFT-TO-RIGHT OVERRIDE", High, Override),
        '\u{202E}' => ("RIGHT-TO-LEFT OVERRIDE", High, Override),
        '\u{2066}' => ("LEFT-TO-RIGHT ISOLATE", Medium, Isolate),
        '\u{2067}' => ("RIGHT-TO-LEFT ISOLATE", Medium, Isolate),
        '\u{2068}' => ("FIRST STRONG ISOLATE", Medium, Isolate),
        '\u{2069}' => ("POP DIRECTIONAL ISOLATE", Medium, Pop),
        '\u{206A}' => ("INHIBIT SYMMETRIC SWAPPING", Medium, Deprecated),
        '\u{206B}' => ("ACTIVATE SYMMETRIC SWAPPING", Medium, Deprecated),
        '\u{206C}' => ("INHIBIT ARABIC FORM SHAPING", Medium, Deprecated),
        '\u{206D}' => ("ACTIVATE ARABIC FORM SHAPING", Medium, Deprecated),
        '\u{206E}' => ("NATIONAL DIGIT SHAPES", Medium, Deprecated),
        '\u{206F}' => ("NOMINAL DIGIT SHAPES", Medium, Deprecated),
        _ => return None,
    })
}

fn source_range(
    byte_start: usize,
    utf16_start: usize,
    code_point_start: usize,
    character: char,
) -> SourceRange {
    SourceRange {
        bytes: byte_start..byte_start + character.len_utf8(),
        utf16: utf16_start..utf16_start + character.len_utf16(),
        code_points: code_point_start..code_point_start + 1,
    }
}

pub(crate) fn find_bidi_controls(text: &str) -> Vec<BidiControlFinding> {
    let mut controls = Vec::new();
    let mut utf16_start = 0;
    for (code_point_start, (byte_start, character)) in text.char_indices().enumerate() {
        if let Some((name, risk, category)) = metadata(character) {
            controls.push(BidiControlFinding {
                character,
                code_point: format!("U+{:04X}", u32::from(character)),
                name,
                source_range: source_range(byte_start, utf16_start, code_point_start, character),
                risk,
                category,
            });
        }
        utf16_start += character.len_utf16();
    }
    controls
}

fn control_code(category: BidiControlCategory) -> &'static str {
    match category {
        BidiControlCategory::Override => "BIDI_OVERRIDE_CONTROL",
        BidiControlCategory::Embedding => "BIDI_EMBEDDING_CONTROL",
        BidiControlCategory::Isolate => "BIDI_ISOLATE_CONTROL",
        BidiControlCategory::Mark => "BIDI_DIRECTIONAL_MARK",
        BidiControlCategory::Deprecated => "BIDI_DEPRECATED_CONTROL",
        BidiControlCategory::Pop => "BIDI_POP_CONTROL",
    }
}

#[derive(Clone, Copy)]
enum FrameKind {
    Embedding,
    Isolate,
}

fn balance_paragraph(
    controls: &[BidiControlFinding],
    boundary: &str,
    findings: &mut Vec<SecurityFinding>,
) {
    let mut stack: Vec<(FrameKind, usize)> = Vec::new();
    for (index, control) in controls.iter().enumerate() {
        match control.character {
            '\u{202A}' | '\u{202B}' | '\u{202D}' | '\u{202E}' => {
                stack.push((FrameKind::Embedding, index));
            }
            '\u{2066}' | '\u{2067}' | '\u{2068}' => {
                stack.push((FrameKind::Isolate, index));
            }
            '\u{202C}' => {
                let isolate = stack
                    .iter()
                    .rposition(|(kind, _)| matches!(kind, FrameKind::Isolate));
                let embedding = stack
                    .iter()
                    .rposition(|(kind, _)| matches!(kind, FrameKind::Embedding));
                if embedding.is_none() || embedding <= isolate {
                    findings.push(SecurityFinding {
                        code: "BIDI_UNMATCHED_PDF",
                        message: "POP DIRECTIONAL FORMATTING has no matching active embedding or override."
                            .to_owned(),
                        source_range: control.source_range.clone(),
                        risk: BidiControlRisk::High,
                    });
                } else if let Some(position) = embedding {
                    stack.remove(position);
                }
            }
            '\u{2069}' => {
                if let Some(position) = stack
                    .iter()
                    .rposition(|(kind, _)| matches!(kind, FrameKind::Isolate))
                {
                    for (_, opener) in stack.iter().skip(position + 1) {
                        let opener = &controls[*opener];
                        findings.push(SecurityFinding {
                            code: "BIDI_FORMAT_CROSSES_ISOLATE_BOUNDARY",
                            message: format!(
                                "{} is not closed before the containing isolate ends.",
                                opener.name
                            ),
                            source_range: opener.source_range.clone(),
                            risk: BidiControlRisk::High,
                        });
                    }
                    stack.truncate(position);
                } else {
                    findings.push(SecurityFinding {
                        code: "BIDI_UNMATCHED_PDI",
                        message: "POP DIRECTIONAL ISOLATE has no matching isolate opener."
                            .to_owned(),
                        source_range: control.source_range.clone(),
                        risk: BidiControlRisk::High,
                    });
                }
            }
            _ => {}
        }
    }
    for (kind, index) in stack {
        let control = &controls[index];
        findings.push(SecurityFinding {
            code: match kind {
                FrameKind::Embedding => "BIDI_UNCLOSED_EMBEDDING",
                FrameKind::Isolate => "BIDI_UNCLOSED_ISOLATE",
            },
            message: format!("{} is not terminated before {}.", control.name, boundary),
            source_range: control.source_range.clone(),
            risk: BidiControlRisk::High,
        });
    }
}

fn balance_findings(
    text: &str,
    controls: &[BidiControlFinding],
    findings: &mut Vec<SecurityFinding>,
) {
    let mut control_index = 0;
    let mut byte_index = 0;
    while byte_index < text.len() {
        let character = text[byte_index..]
            .chars()
            .next()
            .expect("byte index must be on a character boundary");
        let character_len = character.len_utf8();
        let boundary_len = if character == '\r'
            && text[byte_index + character_len..].starts_with('\n')
        {
            character_len + '\n'.len_utf8()
        } else {
            character_len
        };
        let is_paragraph_boundary = matches!(
            character,
            '\r' | '\n' | '\u{0085}' | '\u{001C}'..='\u{001E}' | '\u{2029}'
        );
        if is_paragraph_boundary {
            let paragraph_control_start = control_index;
            while control_index < controls.len()
                && controls[control_index].source_range.bytes.start < byte_index
            {
                control_index += 1;
            }
            balance_paragraph(
                &controls[paragraph_control_start..control_index],
                "the paragraph boundary",
                findings,
            );
            // The controls list contains only formatting characters, so no
            // control can begin inside the separator itself. Continue after
            // CRLF as one UAX paragraph boundary.
        }
        byte_index += boundary_len;
    }
    balance_paragraph(&controls[control_index..], "the end of the text", findings);
}

/// Scans hidden bidi formatting and related invisible characters without mutation.
#[must_use]
pub fn scan_bidi_security(text: &str) -> SecurityReport {
    let controls = find_bidi_controls(text);
    let mut findings: Vec<SecurityFinding> = controls
        .iter()
        .map(|control| SecurityFinding {
            code: control_code(control.category),
            message: format!(
                "{} ({}) is invisible and changes bidirectional interpretation.",
                control.name, control.code_point
            ),
            source_range: control.source_range.clone(),
            risk: control.risk,
        })
        .collect();

    balance_findings(text, &controls, &mut findings);

    let mut utf16_start = 0;
    let characters: Vec<_> = text
        .char_indices()
        .enumerate()
        .map(|(code_point_start, (byte_start, character))| {
            let positioned = (byte_start, character, utf16_start, code_point_start);
            utf16_start += character.len_utf16();
            positioned
        })
        .collect();
    for (index, (byte_start, character, utf16_start, code_point_start)) in
        characters.iter().copied().enumerate()
    {
        let (code, message, risk) = match character {
            '\u{200B}' => (
                "HIDDEN_ZERO_WIDTH_SPACE",
                "ZERO WIDTH SPACE is hidden and can disguise identifiers, links, or filenames.",
                BidiControlRisk::Medium,
            ),
            '\u{2060}' => (
                "HIDDEN_WORD_JOINER",
                "WORD JOINER is invisible and can disguise token boundaries.",
                BidiControlRisk::Low,
            ),
            '\u{FEFF}' if index > 0 => (
                "HIDDEN_MIDSTREAM_BOM",
                "ZERO WIDTH NO-BREAK SPACE/BOM appears inside the text.",
                BidiControlRisk::Medium,
            ),
            '\u{200C}' | '\u{200D}'
                if index > 0
                    && index + 1 < characters.len()
                    && characters[index - 1].1.is_ascii_alphanumeric()
                    && characters[index + 1].1.is_ascii_alphanumeric() =>
            {
                (
                    "HIDDEN_IDENTIFIER_JOINER",
                    "An invisible joiner appears inside an ASCII identifier-like token.",
                    BidiControlRisk::Medium,
                )
            }
            _ => continue,
        };
        findings.push(SecurityFinding {
            code,
            message: message.to_owned(),
            source_range: source_range(byte_start, utf16_start, code_point_start, character),
            risk,
        });
    }
    findings.sort_by(|left, right| {
        left.source_range
            .bytes
            .start
            .cmp(&right.source_range.bytes.start)
            .then_with(|| left.code.cmp(right.code))
    });
    SecurityReport {
        safe: !findings
            .iter()
            .any(|finding| finding.risk == BidiControlRisk::High),
        controls,
        findings,
    }
}
