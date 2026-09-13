import Foundation

extension BidiAnalyzer {
    // Forward-only math heuristic, matching the core dollar-boundary policy.
    static func mathRanges(_ text: String) -> [TechnicalTokenRange] {
        guard text.contains("$") || text.contains("\\(") else { return [] }
        let units = Array(text.utf16)
        let delimiters: [[UInt16]] = [[36], [36, 36], [92, 41]]
        var scanned = [-1, -1, -1]
        var ranges: [TechnicalTokenRange] = []
        var i = 0
        func at(_ delimiter: [UInt16], _ index: Int) -> Bool {
            index + delimiter.count <= units.count
                && units[index..<(index + delimiter.count)].elementsEqual(delimiter)
        }
        func space(_ unit: UInt16) -> Bool {
            // Pin ECMAScript whitespace instead of a host-specific predicate.
            switch unit {
            case 0x09...0x0d, 0x2000...0x200a, 0x20, 0xa0, 0x1680, 0x2028, 0x2029, 0x202f, 0x205f, 0x3000, 0xfeff:
                return true
            default: return false
            }
        }
        while i < units.count {
            let paren = at([92, 40], i)
            if units[i] == 92 && !paren { i += 2; continue }
            let kind = units[i] == 36 ? (at([36, 36], i) ? 1 : 0) : (paren ? 2 : -1)
            if kind < 0 || i < scanned[kind] { i += 1; continue }
            let delimiter = delimiters[kind]
            if kind == 0 && (i + 1 == units.count || space(units[i + 1])) { i += 1; continue }
            var end = i + delimiter.count
            while end < units.count && units[end] != 13 && units[end] != 10 && !at(delimiter, end) {
                end += units[end] == 92 && end + 1 < units.count && units[end + 1] != 13 && units[end + 1] != 10 ? 2 : 1
            }
            if at(delimiter, end) && (kind != 0 || end > i + 1) {
                let next: UInt16 = end + 1 < units.count ? units[end + 1] : 0
                if kind == 0 && (space(units[end - 1]) || (48...57).contains(next)
                    || (0x660...0x669).contains(next) || (0x6f0...0x6f9).contains(next)) {
                    i = end
                    continue
                }
                let range = i..<(end + delimiter.count)
                ranges.append(TechnicalTokenRange(
                    text: UnicodeClassifier.substring(text, utf16Range: range),
                    utf16Range: range, kind: .math
                ))
                i = range.upperBound
            } else {
                scanned[kind] = end
                i += 1
            }
        }
        return ranges
    }
}
