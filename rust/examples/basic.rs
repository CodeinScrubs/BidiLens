use bidilens_core::{AnalysisOptions, analyze, format_for_display};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let source = "React یک کتابخانه جاوااسکریپت بسیار محبوب است.";
    let analysis = analyze(source, &AnalysisOptions::default())?;

    println!("semantic direction: {:?}", analysis.direction);
    println!("display-only value: {}", format_for_display(&analysis));
    println!("stored source unchanged: {}", analysis.text == source);
    Ok(())
}
