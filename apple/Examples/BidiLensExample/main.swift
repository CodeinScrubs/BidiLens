import BidiLens

let source = "React یک کتابخانه جاوااسکریپت بسیار محبوب است."
let presentation = BidiAnalyzer.presentation(source, alignment: .physicalLeft)

print("source: \(presentation.analysis.text)")
print("direction: \(presentation.direction.rawValue)")
print("alignment: physicalLeft")
print("intervention: \(presentation.analysis.interventionRequired)")
