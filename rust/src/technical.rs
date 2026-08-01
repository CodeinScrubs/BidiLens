use std::collections::{HashMap, HashSet};
use std::ops::Range;
use std::sync::{LazyLock, Mutex};

use regex::Regex;

use crate::{Direction, SourceRange, classify_natural};

/// Technical token family used by direction evidence and isolation planning.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum TechnicalTokenKind {
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
}

/// A detected technical token with three coordinate systems.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TechnicalTokenRange {
    pub text: String,
    pub byte_range: Range<usize>,
    pub source_range: SourceRange,
    pub kind: TechnicalTokenKind,
}

#[derive(Clone, Debug)]
struct RawTechnicalTokenRange {
    byte_range: Range<usize>,
    kind: TechnicalTokenKind,
}

const DEFAULT_TECHNICAL_IDENTIFIERS: &[&str] = &[
    "ai",
    "api",
    "anthropic",
    "chatgpt",
    "claude",
    "cli",
    "codex",
    "copilot",
    "cursor",
    "deepseek",
    "electron",
    "gemini",
    "github",
    "gitlab",
    "grok",
    "huggingface",
    "javascript",
    "json",
    "llama",
    "markdown",
    "mistral",
    "node",
    "npm",
    "openai",
    "python",
    "qwen",
    "react",
    "rust",
    "svelte",
    "typescript",
    "url",
    "version",
    "vscode",
    "vue",
    "web",
    "webpack",
    "yaml",
    "angular",
    "astro",
    "chrome",
    "docker",
    "esbuild",
    "eslint",
    "firefox",
    "kubernetes",
    "kubectl",
    "nuxt",
    "playwright",
    "pnpm",
    "preact",
    "remix",
    "rollup",
    "safari",
    "stencil",
    "storybook",
    "tailwind",
    "turbopack",
    "vite",
    "vitest",
];

static REGEX_CACHE: LazyLock<Mutex<HashMap<&'static str, Regex>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

fn built_in_regex(pattern: &'static str) -> Regex {
    let mut cache = REGEX_CACHE.lock().expect("regex cache lock");
    cache
        .entry(pattern)
        .or_insert_with(|| {
            Regex::new(pattern).expect("built-in technical-token regex must compile")
        })
        .clone()
}

fn add_range(
    ranges: &mut Vec<RawTechnicalTokenRange>,
    byte_range: Range<usize>,
    kind: TechnicalTokenKind,
) {
    if byte_range.is_empty() {
        return;
    }
    ranges.push(RawTechnicalTokenRange { byte_range, kind });
}

fn add_matches(
    source: &str,
    ranges: &mut Vec<RawTechnicalTokenRange>,
    pattern: &'static str,
    kind: TechnicalTokenKind,
    group: usize,
    normalize: impl Fn(&str) -> &str,
    validate: impl Fn(&str) -> bool,
) {
    let expression = built_in_regex(pattern);
    for captures in expression.captures_iter(source) {
        let Some(found) = captures.get(group) else {
            continue;
        };
        if !validate(found.as_str()) {
            continue;
        }
        let normalized = normalize(found.as_str());
        if normalized.is_empty() {
            continue;
        }
        add_range(
            ranges,
            found.start()..found.start() + normalized.len(),
            kind,
        );
    }
}

fn add_matches_with_unicode_end_boundary(
    source: &str,
    ranges: &mut Vec<RawTechnicalTokenRange>,
    pattern: &'static str,
    kind: TechnicalTokenKind,
    group: usize,
) {
    let expression = built_in_regex(pattern);
    let unicode_word = built_in_regex(r"^[\p{L}\p{N}_]$");
    for captures in expression.captures_iter(source) {
        let Some(found) = captures.get(group) else {
            continue;
        };
        let followed_by_word = source[found.end()..]
            .chars()
            .next()
            .is_some_and(|character| {
                unicode_word.is_match(&source[found.end()..found.end() + character.len_utf8()])
            });
        if !followed_by_word {
            add_range(ranges, found.range(), kind);
        }
    }
}

fn trim_technical_punctuation(value: &str) -> &str {
    value.trim_end_matches([
        '.', ',', ';', ':', '!', '?', '\u{060C}', '\u{061B}', '\u{061F}', '\u{3002}', '\u{0964}',
        '\u{06D4}',
    ])
}

fn is_ipv4(value: &str) -> bool {
    let parts: Vec<_> = value.split('.').collect();
    parts.len() == 4
        && parts.iter().all(|part| {
            (1..=3).contains(&part.len())
                && part.chars().all(|character| character.is_ascii_digit())
                && part.parse::<u8>().is_ok()
        })
}

fn is_ipv6(value: &str) -> bool {
    if !value.contains(':')
        || !value
            .chars()
            .all(|character| character.is_ascii_hexdigit() || character == ':')
        || value.matches("::").count() > 1
    {
        return false;
    }
    let compressed = value.contains("::");
    let groups: Vec<_> = value
        .split("::")
        .flat_map(|side| side.split(':').filter(|group| !group.is_empty()))
        .collect();
    groups.iter().all(|group| {
        (1..=4).contains(&group.len()) && group.chars().all(|value| value.is_ascii_hexdigit())
    }) && if compressed {
        groups.len() < 8
    } else {
        groups.len() == 8
    }
}

fn add_code_ranges(source: &str, ranges: &mut Vec<RawTechnicalTokenRange>) {
    #[derive(Clone, Copy)]
    struct Fence {
        marker: u8,
        length: usize,
        start: usize,
    }

    let opener = built_in_regex(r"^ {0,3}(`{3,}|~{3,})(.*)$");
    let closer = built_in_regex(r"^ {0,3}(`+|~+)[ \t]*$");
    let mut fence: Option<Fence> = None;
    let mut closed_fences: Vec<Range<usize>> = Vec::new();
    let mut line_start = 0;
    while line_start < source.len() {
        let relative_end = source[line_start..]
            .find(['\r', '\n'])
            .unwrap_or(source.len() - line_start);
        let line_end = line_start + relative_end;
        let mut next_line = line_end;
        if source.as_bytes().get(next_line) == Some(&b'\r') {
            next_line += 1;
        }
        if source.as_bytes().get(next_line) == Some(&b'\n') {
            next_line += 1;
        }
        let line = &source[line_start..line_end];
        if let Some(active) = fence {
            if let Some(found) = closer.captures(line).and_then(|captures| captures.get(1)) {
                if found.as_str().as_bytes().first() == Some(&active.marker)
                    && found.len() >= active.length
                {
                    closed_fences.push(active.start..next_line);
                    fence = None;
                }
            }
        } else if let Some(captures) = opener.captures(line) {
            let marker = captures.get(1).expect("opener capture").as_str();
            let info = captures.get(2).map_or("", |value| value.as_str());
            if !(marker.starts_with('`') && info.contains('`')) {
                fence = Some(Fence {
                    marker: marker.as_bytes()[0],
                    length: marker.len(),
                    start: line_start,
                });
            }
        }
        line_start = next_line;
    }

    let has_outside_natural = source.char_indices().any(|(index, character)| {
        !closed_fences.iter().any(|range| range.contains(&index))
            && classify_natural(character) != Direction::Neutral
    });
    if has_outside_natural {
        for range in closed_fences {
            add_range(ranges, range, TechnicalTokenKind::Code);
        }
    }

    let mut offset = 0;
    for line in source.split_inclusive(['\r', '\n']) {
        let content = line.trim_end_matches(['\r', '\n']);
        let bytes = content.as_bytes();
        let mut runs = Vec::new();
        let mut index = 0;
        while index < bytes.len() {
            if bytes[index] != b'`' {
                index += 1;
                continue;
            }
            let start = index;
            while index < bytes.len() && bytes[index] == b'`' {
                index += 1;
            }
            runs.push((start, index - start));
        }
        let mut suffix_maximum = vec![0; runs.len() + 1];
        for run_index in (0..runs.len()).rev() {
            suffix_maximum[run_index] = runs[run_index].1.max(suffix_maximum[run_index + 1]);
        }
        let mut run_index = 0;
        let mut cursor = runs.first().map_or(0, |run| run.0);
        while run_index < runs.len() {
            let (run_start, run_length) = runs[run_index];
            let opener_end = run_start + run_length;
            if cursor >= opener_end {
                run_index += 1;
                cursor = runs.get(run_index).map_or(0, |run| run.0);
                continue;
            }
            let available = opener_end - cursor;
            let delimiter_length =
                available.min((available / 2).max(suffix_maximum[run_index + 1]));
            if delimiter_length == 0 {
                run_index += 1;
                cursor = runs.get(run_index).map_or(0, |run| run.0);
                continue;
            }
            let mut closing_run_index = run_index;
            let mut closing_start = cursor + delimiter_length;
            if available - delimiter_length < delimiter_length {
                closing_run_index += 1;
                while closing_run_index < runs.len() && runs[closing_run_index].1 < delimiter_length
                {
                    closing_run_index += 1;
                }
                if closing_run_index >= runs.len() {
                    run_index += 1;
                    cursor = runs.get(run_index).map_or(0, |run| run.0);
                    continue;
                }
                closing_start = runs[closing_run_index].0;
            }
            let end = closing_start + delimiter_length;
            add_range(
                ranges,
                offset + cursor..offset + end,
                TechnicalTokenKind::Code,
            );
            run_index = closing_run_index;
            cursor = end;
        }
        offset += line.len();
    }
}

fn is_technical_identifier(token: &str, custom: &HashSet<String>) -> bool {
    let normalized = token.to_ascii_lowercase();
    DEFAULT_TECHNICAL_IDENTIFIERS.contains(&normalized.as_str())
        || custom.contains(&normalized)
        || token
            .chars()
            .any(|character| character.is_ascii_digit() || matches!(character, '_' | '.' | '-'))
        || (token.len() >= 2
            && token
                .chars()
                .all(|character| character.is_ascii_uppercase()))
        || built_in_regex(r"[a-z][A-Z]").is_match(token)
}

/// Finds technical spans that should not decide natural-language direction.
#[must_use]
pub fn find_technical_token_ranges(
    text: &str,
    technical_identifiers: &[String],
) -> Vec<TechnicalTokenRange> {
    let mut ranges = Vec::new();
    add_code_ranges(text, &mut ranges);
    add_matches(
        text,
        &mut ranges,
        r"</?[A-Za-z][^<>\r\n]*>",
        TechnicalTokenKind::Html,
        0,
        |value| value,
        |_| true,
    );
    add_matches(
        text,
        &mut ranges,
        r"(?:\$\$[^\r\n]*?\$\$|\$[^$\r\n]+\$|\\\([^\r\n]*?\\\))",
        TechnicalTokenKind::Math,
        0,
        |value| value,
        |_| true,
    );

    let urls = built_in_regex(r#"(?i)(?-u:\b)(?:https?|ftp)://[^\s<>{}\"']+"#);
    for found in urls.find_iter(text) {
        let mut value = trim_technical_punctuation(found.as_str());
        for (open, close) in [('(', ')'), ('[', ']'), ('{', '}')] {
            if !value.ends_with(close) {
                continue;
            }
            let mut balance =
                value.matches(open).count() as isize - value.matches(close).count() as isize;
            let mut end = value.len();
            while balance < 0 && value[..end].ends_with(close) {
                balance += 1;
                end -= close.len_utf8();
            }
            value = &value[..end];
        }
        add_range(
            &mut ranges,
            found.start()..found.start() + value.len(),
            TechnicalTokenKind::Url,
        );
    }

    add_matches(
        text,
        &mut ranges,
        r"(?i)(?-u:\b)[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}(?-u:\b)",
        TechnicalTokenKind::Email,
        0,
        |value| value,
        |_| true,
    );
    add_matches(
        text,
        &mut ranges,
        r"(?:^|[^\p{L}\p{N}_])((?:[A-Za-z]:[\\/]|\.{0,2}/|~/)[^\s<>()\[\]{}]+)",
        TechnicalTokenKind::Path,
        1,
        trim_technical_punctuation,
        |_| true,
    );
    add_matches(
        text,
        &mut ranges,
        r"(?-u:\b)(?:[A-Za-z0-9_.-]+[\\/])+(?:[A-Za-z0-9_.-]+)(?-u:\b)",
        TechnicalTokenKind::Path,
        0,
        |value| value,
        |_| true,
    );
    add_matches(
        text,
        &mut ranges,
        r"(?i)(?:^|[^A-Za-z0-9_@])(@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*)",
        TechnicalTokenKind::Identifier,
        1,
        |value| value,
        |_| true,
    );
    add_matches(
        text,
        &mut ranges,
        r"(?:\$\{?[A-Z_][A-Z0-9_]*\}?|%[A-Z_][A-Z0-9_]*%)",
        TechnicalTokenKind::Identifier,
        0,
        |value| value,
        |_| true,
    );
    add_matches(
        text,
        &mut ranges,
        r#"(?-u:\b)(?:npm|pnpm|yarn|npx|git|pip|python|node|cargo|go|docker|kubectl)(?:\s+(?:--?[A-Za-z0-9_-]+|[@./\\A-Za-z0-9_:=+-]+|'[^'\r\n]*'|\"[^\"\r\n]*\"))+"#,
        TechnicalTokenKind::Command,
        0,
        |value| value,
        |_| true,
    );
    add_matches(
        text,
        &mut ranges,
        r"(?-u:\b)(?:[0-9]{1,3}\.){3}[0-9]{1,3}(?-u:\b)",
        TechnicalTokenKind::Number,
        0,
        |value| value,
        is_ipv4,
    );
    add_matches(
        text,
        &mut ranges,
        r"(?:^|[^0-9A-Fa-f:])((?:[0-9A-Fa-f]{0,4}:){2,7}[0-9A-Fa-f]{0,4})(?:$|[^0-9A-Fa-f:])",
        TechnicalTokenKind::Number,
        1,
        |value| value,
        is_ipv6,
    );
    add_matches_with_unicode_end_boundary(
        text,
        &mut ranges,
        r"(?:^|[^\p{L}\p{N}_])(\+?[0-9][0-9 ()-]{6,}[0-9])",
        TechnicalTokenKind::Number,
        1,
    );
    add_matches(
        text,
        &mut ranges,
        r"(?-u:\b)[0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2}(?:[T ][0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?(?:Z|[+-][0-9]{2}:?[0-9]{2})?)?(?-u:\b)",
        TechnicalTokenKind::Number,
        0,
        |value| value,
        |_| true,
    );
    add_matches(
        text,
        &mut ranges,
        r"(?i)(?-u:\b)[0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?(?:\s?[AP]M)?(?-u:\b)",
        TechnicalTokenKind::Number,
        0,
        |value| value,
        |_| true,
    );
    add_matches(
        text,
        &mut ranges,
        r"(?-u:\b)v?[0-9]+(?:\.[0-9]+){1,}(?-u:\b)",
        TechnicalTokenKind::Version,
        0,
        |value| value,
        |_| true,
    );
    add_matches(
        text,
        &mut ranges,
        r"(?i)(?-u:\b)[0-9a-f]{7,40}(?-u:\b)",
        TechnicalTokenKind::Hash,
        0,
        |value| value,
        |_| true,
    );
    add_matches_with_unicode_end_boundary(
        text,
        &mut ranges,
        r"(?:^|[^\p{L}\p{N}_])([+-]?(?:[0-9]+(?:[.,][0-9]+)?|[\u{0660}-\u{0669}]+(?:[\u{066B}\u{066C}][\u{0660}-\u{0669}]+)?|[\u{06F0}-\u{06F9}]+(?:[.,][\u{06F0}-\u{06F9}]+)?))",
        TechnicalTokenKind::Number,
        1,
    );

    let custom: HashSet<String> = technical_identifiers
        .iter()
        .filter(|value| built_in_regex(r"^[A-Za-z][A-Za-z0-9_.-]*$").is_match(value))
        .map(|value| value.to_ascii_lowercase())
        .collect();
    let identifiers = built_in_regex(r"(?-u:\b)[A-Za-z][A-Za-z0-9_.-]*(?-u:\b)");
    for found in identifiers.find_iter(text) {
        if is_technical_identifier(found.as_str(), &custom) {
            add_range(&mut ranges, found.range(), TechnicalTokenKind::Identifier);
        }
    }

    ranges.sort_by(|left, right| {
        left.byte_range
            .start
            .cmp(&right.byte_range.start)
            .then_with(|| right.byte_range.end.cmp(&left.byte_range.end))
    });
    let mut merged: Vec<RawTechnicalTokenRange> = Vec::new();
    for range in ranges {
        if let Some(previous) = merged.last_mut() {
            if range.byte_range.start <= previous.byte_range.end {
                if range.byte_range.end > previous.byte_range.end {
                    previous.byte_range.end = range.byte_range.end;
                }
                continue;
            }
        }
        merged.push(range);
    }
    let mut byte_cursor = 0;
    let mut utf16_cursor = 0;
    let mut code_point_cursor = 0;
    merged
        .into_iter()
        .map(|range| {
            for character in text[byte_cursor..range.byte_range.start].chars() {
                utf16_cursor += character.len_utf16();
                code_point_cursor += 1;
            }
            let utf16_start = utf16_cursor;
            let code_point_start = code_point_cursor;
            for character in text[range.byte_range.clone()].chars() {
                utf16_cursor += character.len_utf16();
                code_point_cursor += 1;
            }
            byte_cursor = range.byte_range.end;
            TechnicalTokenRange {
                text: text[range.byte_range.clone()].to_owned(),
                source_range: SourceRange {
                    bytes: range.byte_range.clone(),
                    utf16: utf16_start..utf16_cursor,
                    code_points: code_point_start..code_point_cursor,
                },
                byte_range: range.byte_range,
                kind: range.kind,
            }
        })
        .collect()
}
