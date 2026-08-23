use std::collections::BTreeSet;
use std::time::{Duration, Instant};

use bidilens_core::{
    AnalysisOptions, DetectionStrategy, Direction, Intervention, IsolationKind, OptionsError,
    SecurityReport, analyze, detect_direction, find_technical_token_ranges, format_for_display,
    needs_bidi_intervention, plan_inline_isolation, scan_bidi_security,
};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct Fixture {
    id: String,
    text: String,
    expected: String,
    #[serde(rename = "expectedIsolations")]
    expected_isolations: Option<Vec<ExpectedIsolation>>,
    #[serde(rename = "expectedSecurityCodes")]
    expected_security_codes: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, PartialEq)]
struct ExpectedIsolation {
    text: String,
    direction: String,
    kind: String,
}

fn corpus() -> Vec<Fixture> {
    serde_json::from_str(include_str!("../../corpus/cases.json"))
        .expect("the checked corpus must deserialize")
}

fn direction(value: &str) -> Direction {
    match value {
        "ltr" => Direction::Ltr,
        "rtl" => Direction::Rtl,
        "neutral" | "auto" => Direction::Neutral,
        unexpected => panic!("unexpected direction {unexpected}"),
    }
}

fn kind(value: IsolationKind) -> &'static str {
    match value {
        IsolationKind::Code => "code",
        IsolationKind::Url => "url",
        IsolationKind::Email => "email",
        IsolationKind::Path => "path",
        IsolationKind::Version => "version",
        IsolationKind::Hash => "hash",
        IsolationKind::Identifier => "identifier",
        IsolationKind::Number => "number",
        IsolationKind::Command => "command",
        IsolationKind::Math => "math",
        IsolationKind::Html => "html",
        IsolationKind::OppositeDirectionRun => "opposite-direction-run",
    }
}

#[test]
fn shared_corpus_direction_contract() {
    let fixtures = corpus();
    assert_eq!(
        fixtures.len(),
        932,
        "corpus size changed; review the Rust gate"
    );
    let options = AnalysisOptions::default();
    let failures: Vec<_> = fixtures
        .iter()
        .filter_map(|fixture| {
            let actual = detect_direction(&fixture.text, &options).expect("valid defaults");
            (actual != direction(&fixture.expected)).then(|| {
                format!(
                    "{}: expected {}, received {actual:?}",
                    fixture.id, fixture.expected
                )
            })
        })
        .collect();
    assert!(failures.is_empty(), "{}", failures.join("\n"));
}

#[test]
fn shared_corpus_isolation_contract() {
    let options = AnalysisOptions::default();
    let mut checked = 0;
    let mut failures = Vec::new();
    for fixture in corpus() {
        let Some(expected) = fixture.expected_isolations else {
            continue;
        };
        checked += 1;
        let block_direction = match direction(&fixture.expected) {
            Direction::Neutral => options.inherited_direction,
            resolved => resolved,
        };
        let actual: Vec<_> = plan_inline_isolation(&fixture.text, block_direction, &options)
            .expect("resolved block direction")
            .into_iter()
            .map(|isolation| ExpectedIsolation {
                text: isolation.text,
                direction: match isolation.direction {
                    Direction::Ltr => "ltr",
                    Direction::Rtl => "rtl",
                    Direction::Neutral => "auto",
                }
                .to_owned(),
                kind: kind(isolation.kind).to_owned(),
            })
            .collect();
        if actual != expected {
            failures.push(format!(
                "{}:\nexpected {expected:#?}\nactual {actual:#?}",
                fixture.id
            ));
        }
    }
    assert!(
        checked >= 190,
        "expected at least 190 explicit isolation plans"
    );
    assert!(failures.is_empty(), "{}", failures.join("\n"));
}

#[test]
fn shared_corpus_security_contract() {
    let mut checked = 0;
    let mut failures = Vec::new();
    for fixture in corpus() {
        let Some(expected) = fixture.expected_security_codes else {
            continue;
        };
        checked += 1;
        let actual: BTreeSet<_> = scan_bidi_security(&fixture.text)
            .findings
            .into_iter()
            .map(|finding| finding.code.to_owned())
            .collect();
        let expected: BTreeSet<_> = expected.into_iter().collect();
        if actual != expected {
            failures.push(format!(
                "{}: expected {expected:?}, received {actual:?}",
                fixture.id
            ));
        }
    }
    assert!(checked >= 5, "security fixtures unexpectedly disappeared");
    assert!(failures.is_empty(), "{}", failures.join("\n"));
}

#[test]
fn ordinary_ltr_is_an_exact_no_op() {
    let source = "React is a popular JavaScript library.";
    let options = AnalysisOptions::default();
    let analysis = analyze(source, &options).expect("valid defaults");
    assert_eq!(analysis.direction, Direction::Ltr);
    assert!(!analysis.intervention_required);
    assert!(analysis.isolations.is_empty());
    assert_eq!(analysis.text, source);
    assert_eq!(format_for_display(&analysis), source);
}

#[test]
fn persian_majority_ignores_leading_product_name() {
    let source = "React یک کتابخانه جاوااسکریپت بسیار محبوب است.";
    let analysis = analyze(source, &AnalysisOptions::default()).expect("valid defaults");
    assert_eq!(analysis.direction, Direction::Rtl);
    assert_eq!(analysis.raw_first_strong, Direction::Ltr);
    assert_eq!(analysis.first_strong, Direction::Rtl);
    assert!(analysis.mixed);
    assert!(analysis.intervention_required);
    assert_eq!(analysis.isolations[0].text, "React");
    assert_eq!(analysis.isolations[0].kind, IsolationKind::Identifier);
}

#[test]
fn english_majority_keeps_persian_run_isolated() {
    let source = "The Persian word کتاب means book.";
    let analysis = analyze(source, &AnalysisOptions::default()).expect("valid defaults");
    assert_eq!(analysis.direction, Direction::Ltr);
    assert!(analysis.intervention_required);
    assert!(analysis.isolations.iter().any(|value| {
        value.text == "کتاب"
            && value.direction == Direction::Rtl
            && value.kind == IsolationKind::OppositeDirectionRun
    }));
}

#[test]
fn hyphenated_english_compounds_stay_natural_language_evidence() {
    // A hyphen is ordinary English compounding. Excluding these tokens removes
    // only LTR evidence, which would silently bias mixed blocks toward RTL.
    let source = "The well-known state-of-the-art open-source کتابخانه";
    let analysis = analyze(source, &AnalysisOptions::default()).expect("valid defaults");
    assert_eq!(analysis.direction, Direction::Ltr);
    assert!(find_technical_token_ranges(source, &[]).is_empty());
    // A segment that is itself a known technical word still excludes the token.
    assert_eq!(
        find_technical_token_ranges("react-markdown", &[]).len(),
        1,
        "a known technical segment must still be recognized"
    );
}

#[test]
fn emphasized_uppercase_prose_is_evidence_but_acronyms_are_technical() {
    let shouted = "PLEASE READ THIS IMPORTANT WARNING کتاب";
    let analysis = analyze(shouted, &AnalysisOptions::default()).expect("valid defaults");
    assert_eq!(analysis.direction, Direction::Ltr);
    assert!(find_technical_token_ranges(shouted, &[]).is_empty());
    // Inside mixed-case prose the same shape is an acronym again.
    let acronyms = find_technical_token_ranges("Use the HTTP API for this", &[]);
    assert_eq!(acronyms.len(), 2);
    let acronym_phrase = find_technical_token_ranges("HTTP API", &[]);
    assert_eq!(acronym_phrase.len(), 2);
}

#[test]
fn forced_physical_alignment_does_not_change_semantic_direction() {
    let source = "این متن فارسی است.";
    let analysis = analyze(source, &AnalysisOptions::default()).expect("valid defaults");
    assert_eq!(analysis.direction, Direction::Rtl);
    // Alignment is intentionally owned by the host widget. A developer may
    // render this semantic RTL paragraph at physical left without changing it.
    assert_eq!(analysis.text, source);
}

#[test]
fn inherited_rtl_context_intervenes_for_ltr_text_without_reclassifying_it() {
    let options = AnalysisOptions {
        inherited_direction: Direction::Rtl,
        ..AnalysisOptions::default()
    };
    let analysis = analyze("hello", &options).expect("valid options");
    assert_eq!(analysis.direction, Direction::Ltr);
    assert!(analysis.intervention_required);
}

#[test]
fn explicit_always_mode_annotates_otherwise_plain_ltr() {
    let options = AnalysisOptions {
        intervention: Intervention::Always,
        ..AnalysisOptions::default()
    };
    assert!(needs_bidi_intervention("hello", &options));
}

#[test]
fn first_strong_mode_observes_a_leading_technical_identifier() {
    let options = AnalysisOptions {
        strategy: DetectionStrategy::FirstStrong,
        ..AnalysisOptions::default()
    };
    assert_eq!(
        detect_direction("React یک کتابخانه است", &options).expect("valid options"),
        Direction::Ltr
    );
}

#[test]
fn forced_strategies_and_inheritance_are_explicit() {
    let mut options = AnalysisOptions {
        strategy: DetectionStrategy::Rtl,
        ..AnalysisOptions::default()
    };
    assert_eq!(detect_direction("hello", &options), Ok(Direction::Rtl));
    options.strategy = DetectionStrategy::Ltr;
    assert_eq!(detect_direction("سلام", &options), Ok(Direction::Ltr));
    options.strategy = DetectionStrategy::Inherit;
    options.inherited_direction = Direction::Rtl;
    assert_eq!(detect_direction("123", &options), Ok(Direction::Rtl));
}

#[test]
fn invalid_options_are_rejected() {
    let neutral_inherited = AnalysisOptions {
        inherited_direction: Direction::Neutral,
        ..AnalysisOptions::default()
    };
    assert_eq!(
        neutral_inherited.validate(),
        Err(OptionsError::NeutralInheritedDirection)
    );
    let zero_minimum = AnalysisOptions {
        minimum_strong_characters: 0,
        ..AnalysisOptions::default()
    };
    assert_eq!(
        zero_minimum.validate(),
        Err(OptionsError::ZeroMinimumStrongCharacters)
    );
    let low_threshold = AnalysisOptions {
        majority_threshold: 0.49,
        ..AnalysisOptions::default()
    };
    assert_eq!(
        low_threshold.validate(),
        Err(OptionsError::InvalidMajorityThreshold)
    );
    let high_threshold = AnalysisOptions {
        majority_threshold: 1.01,
        ..AnalysisOptions::default()
    };
    assert_eq!(
        high_threshold.validate(),
        Err(OptionsError::InvalidMajorityThreshold)
    );
    assert_eq!(
        plan_inline_isolation("hello", Direction::Neutral, &AnalysisOptions::default()),
        Err(OptionsError::NeutralBlockDirection)
    );
}

#[test]
fn source_offsets_cover_bytes_utf16_and_code_points() {
    let source = "😀 React سلام";
    let tokens = find_technical_token_ranges(source, &[]);
    let react = tokens
        .iter()
        .find(|token| token.text == "React")
        .expect("React token");
    assert_eq!(react.byte_range, 5..10);
    assert_eq!(react.source_range.utf16, 3..8);
    assert_eq!(react.source_range.code_points, 2..7);
}

#[test]
fn security_reports_controls_balance_and_invisibles() {
    let report = scan_bidi_security("safe\u{202E}hidden\u{200B}");
    let codes: BTreeSet<_> = report.findings.iter().map(|value| value.code).collect();
    assert!(codes.contains("BIDI_OVERRIDE_CONTROL"));
    assert!(codes.contains("BIDI_UNCLOSED_EMBEDDING"));
    assert!(codes.contains("HIDDEN_ZERO_WIDTH_SPACE"));
    assert!(!report.safe);
}

#[test]
fn formatting_controls_do_not_balance_across_paragraph_boundaries() {
    for separator in [
        "\n",
        "\r",
        "\r\n",
        "\u{0085}",
        "\u{001C}",
        "\u{001D}",
        "\u{001E}",
        "\u{2029}",
    ] {
        let source = format!("{}before{separator}after{}", '\u{202E}', '\u{202C}');
        let report = scan_bidi_security(&source);
        let codes: BTreeSet<_> = report.findings.iter().map(|value| value.code).collect();
        assert!(
            codes.contains("BIDI_UNCLOSED_EMBEDDING"),
            "missing unclosed embedding for {separator:?}"
        );
        assert!(
            codes.contains("BIDI_UNMATCHED_PDF"),
            "missing unmatched PDF for {separator:?}"
        );
    }
}

#[test]
fn formatting_controls_balance_within_one_paragraph() {
    let report = scan_bidi_security("before\u{202E}inside\u{202C}after");
    assert!(!report.findings.iter().any(|finding| matches!(
        finding.code,
        "BIDI_UNCLOSED_EMBEDDING" | "BIDI_UNMATCHED_PDF"
    )));
}

#[test]
fn isolates_do_not_balance_across_paragraph_boundaries() {
    let report = scan_bidi_security("\u{2067}before\u{2029}after\u{2069}");
    let codes: BTreeSet<_> = report.findings.iter().map(|value| value.code).collect();
    assert!(codes.contains("BIDI_UNCLOSED_ISOLATE"));
    assert!(codes.contains("BIDI_UNMATCHED_PDI"));
}

#[test]
fn isolates_balance_within_one_paragraph() {
    let report = scan_bidi_security("\u{2067}inside\u{2069}");
    assert!(!report.findings.iter().any(|finding| matches!(
        finding.code,
        "BIDI_UNCLOSED_ISOLATE" | "BIDI_UNMATCHED_PDI"
    )));
}

#[test]
fn default_security_report_matches_an_empty_scan() {
    assert_eq!(SecurityReport::default(), scan_bidi_security(""));
}

#[test]
fn security_scan_avoids_quadratic_offsets_for_dense_invisible_text() {
    const FINDINGS: usize = 20_000;
    let source = "\u{200B}".repeat(FINDINGS);
    let started = Instant::now();
    let report = scan_bidi_security(&source);
    let elapsed = started.elapsed();

    assert_eq!(report.findings.len(), FINDINGS);
    assert_eq!(
        report.findings.last().expect("last finding").source_range,
        bidilens_core::SourceRange {
            bytes: (source.len() - '\u{200B}'.len_utf8())..source.len(),
            utf16: (FINDINGS - 1)..FINDINGS,
            code_points: (FINDINGS - 1)..FINDINGS,
        }
    );
    assert!(
        elapsed < Duration::from_secs(2),
        "dense security scan took {elapsed:?}; source offsets may have regressed to quadratic work"
    );
}

#[test]
fn technical_scan_attaches_dense_source_offsets_after_merging() {
    const TOKENS: usize = 10_000;
    let source = "React ".repeat(TOKENS);
    let started = Instant::now();
    let ranges = find_technical_token_ranges(&source, &[]);
    let elapsed = started.elapsed();

    assert_eq!(ranges.len(), TOKENS);
    assert_eq!(
        ranges.last().expect("last range").source_range,
        bidilens_core::SourceRange {
            bytes: ((TOKENS - 1) * 6)..((TOKENS - 1) * 6 + 5),
            utf16: ((TOKENS - 1) * 6)..((TOKENS - 1) * 6 + 5),
            code_points: ((TOKENS - 1) * 6)..((TOKENS - 1) * 6 + 5),
        }
    );
    assert!(
        elapsed < Duration::from_secs(2),
        "dense technical scan took {elapsed:?}; source offsets may have regressed to quadratic work"
    );
}

#[test]
fn display_formatting_is_transient_and_balanced() {
    let source = "React یک کتابخانه است.";
    let analysis = analyze(source, &AnalysisOptions::default()).expect("valid defaults");
    let display = format_for_display(&analysis);
    assert_eq!(analysis.text, source);
    assert!(display.contains("\u{2066}React\u{2069}"));
    assert_eq!(
        display.matches('\u{2066}').count() + display.matches('\u{2067}').count(),
        display.matches('\u{2069}').count()
    );
}
