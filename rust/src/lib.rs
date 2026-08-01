//! Standards-first bidirectional text analysis for native Rust applications.
//!
//! BidiLens selects semantic paragraph direction and inline isolation metadata.
//! The host renderer remains responsible for Unicode Bidirectional Algorithm
//! layout, shaping, cursor movement, selection, and font fallback.

mod security;
mod technical;

pub mod generated;

use std::ops::Range;

pub use security::{
    BidiControlCategory, BidiControlFinding, BidiControlRisk, SecurityFinding, SecurityReport,
    scan_bidi_security,
};
pub use technical::{TechnicalTokenKind, TechnicalTokenRange, find_technical_token_ranges};

/// Logical base direction. `Neutral` is intentionally unresolved.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum Direction {
    Ltr,
    Rtl,
    #[default]
    Neutral,
}

/// Policy used to select a block's base direction.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum DetectionStrategy {
    /// Natural-language majority after excluding technical tokens.
    #[default]
    ContentMajority,
    /// Literal first Unicode bidi-strong character, like `dir="auto"`.
    FirstStrong,
    /// Alias for a strict first-strong UAX #9 base-direction decision.
    StrictUax9,
    /// Resolve to the host's inherited direction.
    Inherit,
    /// Force LTR semantic direction.
    Ltr,
    /// Force RTL semantic direction.
    Rtl,
}

/// Whether BidiLens should preserve the no-op fast path or always annotate.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum Intervention {
    #[default]
    Auto,
    Always,
}

/// Validated analysis configuration.
#[derive(Clone, Debug, PartialEq)]
pub struct AnalysisOptions {
    pub strategy: DetectionStrategy,
    pub fallback: Direction,
    pub inherited_direction: Direction,
    pub minimum_strong_characters: usize,
    pub majority_threshold: f64,
    pub exclude_technical_tokens: bool,
    pub technical_identifiers: Vec<String>,
    pub intervention: Intervention,
}

impl Default for AnalysisOptions {
    fn default() -> Self {
        Self {
            strategy: DetectionStrategy::ContentMajority,
            fallback: Direction::Neutral,
            inherited_direction: Direction::Ltr,
            minimum_strong_characters: 1,
            majority_threshold: 0.5,
            exclude_technical_tokens: true,
            technical_identifiers: Vec::new(),
            intervention: Intervention::Auto,
        }
    }
}

impl AnalysisOptions {
    /// Rejects ambiguous or nonsensical host configuration.
    pub fn validate(&self) -> Result<(), OptionsError> {
        if self.inherited_direction == Direction::Neutral {
            return Err(OptionsError::NeutralInheritedDirection);
        }
        if self.minimum_strong_characters == 0 {
            return Err(OptionsError::ZeroMinimumStrongCharacters);
        }
        if !(0.5..=1.0).contains(&self.majority_threshold) {
            return Err(OptionsError::InvalidMajorityThreshold);
        }
        Ok(())
    }
}

/// Invalid analysis configuration.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum OptionsError {
    NeutralInheritedDirection,
    NeutralBlockDirection,
    ZeroMinimumStrongCharacters,
    InvalidMajorityThreshold,
}

impl std::fmt::Display for OptionsError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let message = match self {
            Self::NeutralInheritedDirection => "inherited_direction must resolve to LTR or RTL",
            Self::NeutralBlockDirection => "block direction must resolve to LTR or RTL",
            Self::ZeroMinimumStrongCharacters => "minimum_strong_characters must be at least one",
            Self::InvalidMajorityThreshold => "majority_threshold must be between 0.5 and 1.0",
        };
        formatter.write_str(message)
    }
}

impl std::error::Error for OptionsError {}

/// Half-open offsets in Rust bytes, UTF-16 code units, and Unicode scalar values.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SourceRange {
    pub bytes: Range<usize>,
    pub utf16: Range<usize>,
    pub code_points: Range<usize>,
}

/// Natural-language strong-character totals.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct StrongCharacterCounts {
    pub ltr: usize,
    pub rtl: usize,
}

impl StrongCharacterCounts {
    #[must_use]
    pub const fn total(self) -> usize {
        self.ltr + self.rtl
    }
}

/// Immutable per-paragraph evidence.
#[derive(Clone, Debug, PartialEq)]
pub struct ParagraphAnalysis {
    pub text: String,
    pub source_range: SourceRange,
    pub direction: Direction,
    pub first_strong: Direction,
    pub confidence: f64,
    pub counts: StrongCharacterCounts,
}

/// Semantic inline isolation kind.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum IsolationKind {
    Code,
    Url,
    Email,
    Path,
    Version,
    Hash,
    Identifier,
    Number,
    Command,
    Math,
    Html,
    OppositeDirectionRun,
}

impl From<TechnicalTokenKind> for IsolationKind {
    fn from(value: TechnicalTokenKind) -> Self {
        match value {
            TechnicalTokenKind::Code => Self::Code,
            TechnicalTokenKind::Url => Self::Url,
            TechnicalTokenKind::Email => Self::Email,
            TechnicalTokenKind::Path => Self::Path,
            TechnicalTokenKind::Version => Self::Version,
            TechnicalTokenKind::Hash => Self::Hash,
            TechnicalTokenKind::Identifier => Self::Identifier,
            TechnicalTokenKind::Number => Self::Number,
            TechnicalTokenKind::Command => Self::Command,
            TechnicalTokenKind::Math => Self::Math,
            TechnicalTokenKind::Html => Self::Html,
        }
    }
}

/// A display-only isolation plan. The source text itself is never rewritten.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InlineIsolation {
    pub text: String,
    pub direction: Direction,
    pub source_range: SourceRange,
    pub kind: IsolationKind,
}

/// Full immutable analysis result.
#[derive(Clone, Debug, PartialEq)]
pub struct Analysis {
    pub text: String,
    pub direction: Direction,
    pub resolved_direction: Direction,
    pub first_strong: Direction,
    pub raw_first_strong: Direction,
    pub confidence: f64,
    pub counts: StrongCharacterCounts,
    pub raw_counts: StrongCharacterCounts,
    pub paragraphs: Vec<ParagraphAnalysis>,
    pub mixed: bool,
    pub intervention_required: bool,
    pub technical_tokens: Vec<TechnicalTokenRange>,
    pub isolations: Vec<InlineIsolation>,
    pub security: SecurityReport,
}

fn in_ranges(code_point: u32, ranges: &[(u32, u32)]) -> bool {
    ranges
        .binary_search_by(|(start, end)| {
            if code_point < *start {
                std::cmp::Ordering::Greater
            } else if code_point > *end {
                std::cmp::Ordering::Less
            } else {
                std::cmp::Ordering::Equal
            }
        })
        .is_ok()
}

/// Returns the Unicode Bidi_Class strong direction, including directional marks.
#[must_use]
pub fn classify_bidi_strong(character: char) -> Direction {
    let code_point = u32::from(character);
    if in_ranges(code_point, generated::NON_STRONG_BIDI_RANGES) {
        Direction::Neutral
    } else if in_ranges(code_point, generated::RTL_BIDI_RANGES) {
        Direction::Rtl
    } else {
        Direction::Ltr
    }
}

/// Classifies natural-language letters; numbers and punctuation remain neutral.
#[must_use]
pub fn classify_natural(character: char) -> Direction {
    if in_ranges(u32::from(character), generated::NATURAL_LETTER_RANGES) {
        classify_bidi_strong(character)
    } else {
        Direction::Neutral
    }
}

fn source_range(text: &str, bytes: Range<usize>) -> SourceRange {
    let before = &text[..bytes.start];
    let selected = &text[bytes.clone()];
    let utf16_start = before.encode_utf16().count();
    let code_point_start = before.chars().count();
    SourceRange {
        bytes,
        utf16: utf16_start..utf16_start + selected.encode_utf16().count(),
        code_points: code_point_start..code_point_start + selected.chars().count(),
    }
}

#[derive(Clone, Debug)]
struct CountResult {
    counts: StrongCharacterCounts,
    first_strong: Direction,
    technical_tokens: Vec<TechnicalTokenRange>,
}

fn count_strong(text: &str, options: &AnalysisOptions, exclude_technical: bool) -> CountResult {
    let technical_tokens = if exclude_technical {
        find_technical_token_ranges(text, &options.technical_identifiers)
    } else {
        Vec::new()
    };
    let strict = matches!(
        options.strategy,
        DetectionStrategy::FirstStrong | DetectionStrategy::StrictUax9
    );
    let mut counts = StrongCharacterCounts::default();
    let mut first_strong = Direction::Neutral;
    let mut token_index = 0;
    for (byte_index, character) in text.char_indices() {
        while technical_tokens
            .get(token_index)
            .is_some_and(|token| byte_index >= token.byte_range.end)
        {
            token_index += 1;
        }
        let excluded = technical_tokens
            .get(token_index)
            .is_some_and(|token| token.byte_range.contains(&byte_index));
        if excluded {
            continue;
        }
        let direction = if strict {
            classify_bidi_strong(character)
        } else {
            classify_natural(character)
        };
        match direction {
            Direction::Ltr => counts.ltr += 1,
            Direction::Rtl => counts.rtl += 1,
            Direction::Neutral => {}
        }
        if first_strong == Direction::Neutral && direction != Direction::Neutral {
            first_strong = direction;
        }
    }
    CountResult {
        counts,
        first_strong,
        technical_tokens,
    }
}

fn direction_from_counts(result: &CountResult, options: &AnalysisOptions) -> Direction {
    match options.strategy {
        DetectionStrategy::Ltr => return Direction::Ltr,
        DetectionStrategy::Rtl => return Direction::Rtl,
        DetectionStrategy::Inherit => return options.inherited_direction,
        DetectionStrategy::ContentMajority
        | DetectionStrategy::FirstStrong
        | DetectionStrategy::StrictUax9 => {}
    }
    if result.counts.total() < options.minimum_strong_characters {
        return options.fallback;
    }
    if matches!(
        options.strategy,
        DetectionStrategy::FirstStrong | DetectionStrategy::StrictUax9
    ) {
        return if result.first_strong == Direction::Neutral {
            options.fallback
        } else {
            result.first_strong
        };
    }
    let total = result.counts.total() as f64;
    if result.counts.rtl > result.counts.ltr
        && result.counts.rtl as f64 / total >= options.majority_threshold
    {
        return Direction::Rtl;
    }
    if result.counts.ltr > result.counts.rtl
        && result.counts.ltr as f64 / total >= options.majority_threshold
    {
        return Direction::Ltr;
    }
    if result.first_strong == Direction::Neutral {
        options.fallback
    } else {
        result.first_strong
    }
}

fn confidence(counts: StrongCharacterCounts, direction: Direction) -> f64 {
    if counts.total() == 0 || direction == Direction::Neutral {
        return 0.0;
    }
    let matching = match direction {
        Direction::Ltr => counts.ltr,
        Direction::Rtl => counts.rtl,
        Direction::Neutral => 0,
    };
    ((matching as f64 / counts.total() as f64) * 10_000.0).round() / 10_000.0
}

fn raw_first_strong(text: &str) -> Direction {
    text.chars()
        .map(classify_bidi_strong)
        .find(|direction| *direction != Direction::Neutral)
        .unwrap_or(Direction::Neutral)
}

/// Detects semantic base direction without rewriting the input.
pub fn detect_direction(text: &str, options: &AnalysisOptions) -> Result<Direction, OptionsError> {
    options.validate()?;
    let exclude =
        options.exclude_technical_tokens && options.strategy == DetectionStrategy::ContentMajority;
    Ok(direction_from_counts(
        &count_strong(text, options, exclude),
        options,
    ))
}

/// Returns whether bidi-aware rendering metadata is needed in the host context.
#[must_use]
pub fn needs_bidi_intervention(text: &str, options: &AnalysisOptions) -> bool {
    if options.intervention == Intervention::Always
        || !security::find_bidi_controls(text).is_empty()
    {
        return true;
    }
    let mut has_ltr = false;
    for character in text.chars() {
        match classify_bidi_strong(character) {
            Direction::Rtl => return true,
            Direction::Ltr => has_ltr = true,
            Direction::Neutral => {}
        }
    }
    options.inherited_direction == Direction::Rtl && (has_ltr || !text.is_empty())
}

/// Produces immutable block analysis, inline isolation metadata, and security findings.
pub fn analyze(text: &str, options: &AnalysisOptions) -> Result<Analysis, OptionsError> {
    options.validate()?;
    let exclude =
        options.exclude_technical_tokens && options.strategy == DetectionStrategy::ContentMajority;
    let result = count_strong(text, options, exclude);
    let direction = direction_from_counts(&result, options);
    let mut raw_options = options.clone();
    raw_options.strategy = DetectionStrategy::ContentMajority;
    raw_options.exclude_technical_tokens = false;
    let raw = count_strong(text, &raw_options, false);
    let resolved_direction = if direction == Direction::Neutral {
        if options.fallback == Direction::Neutral {
            options.inherited_direction
        } else {
            options.fallback
        }
    } else {
        direction
    };
    let paragraphs = split_paragraphs(text)
        .into_iter()
        .map(|range| {
            let paragraph_text = &text[range.clone()];
            let paragraph_result = count_strong(paragraph_text, options, exclude);
            let paragraph_direction = direction_from_counts(&paragraph_result, options);
            ParagraphAnalysis {
                text: paragraph_text.to_owned(),
                source_range: source_range(text, range),
                direction: paragraph_direction,
                first_strong: paragraph_result.first_strong,
                confidence: confidence(paragraph_result.counts, paragraph_direction),
                counts: paragraph_result.counts,
            }
        })
        .collect();
    let intervention_required = needs_bidi_intervention(text, options);
    let isolations = if intervention_required {
        plan_inline_isolation(text, resolved_direction, options)?
    } else {
        Vec::new()
    };
    Ok(Analysis {
        text: text.to_owned(),
        direction,
        resolved_direction,
        first_strong: result.first_strong,
        raw_first_strong: raw_first_strong(text),
        confidence: confidence(result.counts, direction),
        counts: result.counts,
        raw_counts: raw.counts,
        paragraphs,
        mixed: raw.counts.ltr > 0 && raw.counts.rtl > 0,
        intervention_required,
        technical_tokens: result.technical_tokens,
        isolations,
        security: scan_bidi_security(text),
    })
}

fn split_paragraphs(text: &str) -> Vec<Range<usize>> {
    let mut ranges = Vec::new();
    let mut start = 0;
    let mut iterator = text.char_indices().peekable();
    while let Some((index, character)) = iterator.next() {
        let separator_end = match character {
            '\r' => {
                if iterator.peek().is_some_and(|(_, next)| *next == '\n') {
                    iterator
                        .next()
                        .map_or(index + 1, |(next, value)| next + value.len_utf8())
                } else {
                    index + 1
                }
            }
            '\n' | '\u{2029}' => index + character.len_utf8(),
            _ => continue,
        };
        ranges.push(start..index);
        start = separator_end;
    }
    ranges.push(start..text.len());
    ranges
}

#[derive(Clone, Debug)]
struct DirectionalRun {
    direction: Direction,
    byte_range: Range<usize>,
}

fn directional_runs(text: &str) -> Vec<DirectionalRun> {
    if text.is_empty() {
        return Vec::new();
    }
    let mut raw = Vec::new();
    let mut current_direction = None;
    let mut start = 0;
    for (index, character) in text.char_indices() {
        let direction = classify_natural(character);
        if current_direction.is_none() {
            current_direction = Some(direction);
            start = index;
        } else if current_direction != Some(direction) {
            raw.push(DirectionalRun {
                direction: current_direction.expect("direction is initialized"),
                byte_range: start..index,
            });
            current_direction = Some(direction);
            start = index;
        }
    }
    raw.push(DirectionalRun {
        direction: current_direction.expect("non-empty text has a direction"),
        byte_range: start..text.len(),
    });

    let mut previous = vec![Direction::Neutral; raw.len()];
    let mut next = vec![Direction::Neutral; raw.len()];
    let mut direction = Direction::Neutral;
    for (index, run) in raw.iter().enumerate() {
        previous[index] = direction;
        if run.direction != Direction::Neutral {
            direction = run.direction;
        }
    }
    direction = Direction::Neutral;
    for (index, run) in raw.iter().enumerate().rev() {
        next[index] = direction;
        if run.direction != Direction::Neutral {
            direction = run.direction;
        }
    }
    for (index, run) in raw.iter_mut().enumerate() {
        if run.direction == Direction::Neutral {
            run.direction = if previous[index] != Direction::Neutral {
                previous[index]
            } else {
                next[index]
            };
        }
    }
    let mut merged: Vec<DirectionalRun> = Vec::new();
    for run in raw {
        if let Some(last) = merged.last_mut() {
            if last.direction == run.direction {
                last.byte_range.end = run.byte_range.end;
                continue;
            }
        }
        merged.push(run);
    }
    merged
}

fn trim_neutral_boundaries(text: &str, mut range: Range<usize>) -> Range<usize> {
    while range.start < range.end {
        let character = text[range.clone()].chars().next().expect("non-empty range");
        if classify_natural(character) != Direction::Neutral {
            break;
        }
        range.start += character.len_utf8();
    }
    while range.end > range.start {
        let character = text[range.clone()]
            .chars()
            .next_back()
            .expect("non-empty range");
        if classify_natural(character) != Direction::Neutral {
            break;
        }
        range.end -= character.len_utf8();
    }
    range
}

fn planned_isolation(
    text: &str,
    byte_range: Range<usize>,
    direction: Direction,
    kind: IsolationKind,
) -> InlineIsolation {
    InlineIsolation {
        text: text[byte_range.clone()].to_owned(),
        direction,
        source_range: source_range(text, byte_range),
        kind,
    }
}

fn normalize_isolations(text: &str, isolations: Vec<InlineIsolation>) -> Vec<InlineIsolation> {
    let mut split = Vec::new();
    for isolation in isolations {
        if isolation.kind != IsolationKind::OppositeDirectionRun {
            split.push(isolation);
            continue;
        }
        let original = isolation.source_range.bytes.clone();
        let mut piece_start = original.start;
        for (relative, character) in text[original.clone()].char_indices() {
            if matches!(
                character,
                ',' | '\u{060C}' | ';' | '\u{061B}' | ':' | '!' | '?' | '\u{061F}' | '|'
            ) {
                let index = original.start + relative;
                let range = trim_neutral_boundaries(text, piece_start..index);
                if !range.is_empty() {
                    split.push(planned_isolation(
                        text,
                        range,
                        isolation.direction,
                        isolation.kind,
                    ));
                }
                piece_start = index + character.len_utf8();
            }
        }
        let range = trim_neutral_boundaries(text, piece_start..original.end);
        if !range.is_empty() {
            split.push(planned_isolation(
                text,
                range,
                isolation.direction,
                isolation.kind,
            ));
        }
    }
    split.sort_by_key(|value| (value.source_range.bytes.start, value.source_range.bytes.end));
    let mut merged: Vec<InlineIsolation> = Vec::new();
    for isolation in split {
        if let Some(previous) = merged.last_mut() {
            let gap = previous.source_range.bytes.end..isolation.source_range.bytes.start;
            if previous.direction == isolation.direction
                && gap.start <= gap.end
                && text[gap].chars().all(char::is_whitespace)
            {
                let start = previous.source_range.bytes.start;
                let kind = if previous.kind == isolation.kind {
                    previous.kind
                } else {
                    IsolationKind::OppositeDirectionRun
                };
                *previous = planned_isolation(
                    text,
                    start..isolation.source_range.bytes.end,
                    isolation.direction,
                    kind,
                );
                continue;
            }
        }
        merged.push(isolation);
    }
    merged
}

/// Plans display-only isolation ranges without changing stored text.
pub fn plan_inline_isolation(
    text: &str,
    block_direction: Direction,
    options: &AnalysisOptions,
) -> Result<Vec<InlineIsolation>, OptionsError> {
    if block_direction == Direction::Neutral {
        return Err(OptionsError::NeutralBlockDirection);
    }
    let mut contextual = options.clone();
    contextual.inherited_direction = block_direction;
    if !needs_bidi_intervention(text, &contextual) {
        return Ok(Vec::new());
    }
    let technical = if options.exclude_technical_tokens {
        find_technical_token_ranges(text, &options.technical_identifiers)
    } else {
        Vec::new()
    };
    let mut isolations: Vec<InlineIsolation> = technical
        .iter()
        .map(|token| {
            planned_isolation(
                text,
                token.byte_range.clone(),
                Direction::Ltr,
                token.kind.into(),
            )
        })
        .collect();
    for run in directional_runs(text) {
        if run.direction == Direction::Neutral || run.direction == block_direction {
            continue;
        }
        let mut cursor = run.byte_range.start;
        for token in &technical {
            if token.byte_range.end <= cursor {
                continue;
            }
            if token.byte_range.start >= run.byte_range.end {
                break;
            }
            let part_end = token.byte_range.start.min(run.byte_range.end);
            if cursor < part_end {
                let range = trim_neutral_boundaries(text, cursor..part_end);
                if !range.is_empty() {
                    isolations.push(planned_isolation(
                        text,
                        range,
                        run.direction,
                        IsolationKind::OppositeDirectionRun,
                    ));
                }
            }
            cursor = cursor.max(token.byte_range.end);
            if cursor >= run.byte_range.end {
                break;
            }
        }
        if cursor < run.byte_range.end {
            let range = trim_neutral_boundaries(text, cursor..run.byte_range.end);
            if !range.is_empty() {
                isolations.push(planned_isolation(
                    text,
                    range,
                    run.direction,
                    IsolationKind::OppositeDirectionRun,
                ));
            }
        }
    }
    Ok(normalize_isolations(text, isolations))
}

/// Adds isolation controls only to a transient display value.
#[must_use]
pub fn format_for_display(analysis: &Analysis) -> String {
    if !analysis.intervention_required || analysis.isolations.is_empty() {
        return analysis.text.clone();
    }
    let mut output = String::with_capacity(analysis.text.len() + analysis.isolations.len() * 6);
    let mut cursor = 0;
    for isolation in &analysis.isolations {
        let range = &isolation.source_range.bytes;
        if range.start < cursor {
            continue;
        }
        output.push_str(&analysis.text[cursor..range.start]);
        output.push(match isolation.direction {
            Direction::Ltr => '\u{2066}',
            Direction::Rtl => '\u{2067}',
            Direction::Neutral => '\u{2068}',
        });
        output.push_str(&analysis.text[range.clone()]);
        output.push('\u{2069}');
        cursor = range.end;
    }
    output.push_str(&analysis.text[cursor..]);
    output
}
