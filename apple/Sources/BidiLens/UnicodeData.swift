import Foundation

public enum BidiUnicodeData {
    public static let version = GeneratedBidiRanges.unicodeVersion
    public static let bidiSHA256 = GeneratedBidiRanges.bidiSHA256
    public static let generalCategorySHA256 = GeneratedBidiRanges.generalCategorySHA256
}
enum UnicodeClassifier {
    static func contains(_ ranges: [UInt32], _ scalar: UInt32) -> Bool {
        var low = 0
        var high = ranges.count / 2 - 1
        while low <= high {
            let middle = (low + high) / 2
            let start = ranges[middle * 2]
            let end = ranges[middle * 2 + 1]
            if scalar < start {
                high = middle - 1
            } else if scalar > end {
                low = middle + 1
            } else {
                return true
            }
        }
        return false
    }

    static func classifyStrong(_ scalar: UInt32) -> BidiDirection {
        if contains(GeneratedBidiRanges.nonStrong, scalar) { return .neutral }
        return contains(GeneratedBidiRanges.rtl, scalar) ? .rightToLeft : .leftToRight
    }

    static func classifyNatural(_ scalar: UInt32) -> BidiDirection {
        contains(GeneratedBidiRanges.naturalLetters, scalar) ? classifyStrong(scalar) : .neutral
    }

    static func enumerate(_ text: String) -> [(scalar: UnicodeScalar, utf16: Int, codePoint: Int)] {
        var utf16 = 0
        var result: [(UnicodeScalar, Int, Int)] = []
        result.reserveCapacity(text.unicodeScalars.count)
        for (codePoint, scalar) in text.unicodeScalars.enumerated() {
            result.append((scalar, utf16, codePoint))
            utf16 += scalar.value > 0xffff ? 2 : 1
        }
        return result
    }

    static func codePointOffset(_ text: String, utf16Offset: Int) -> Int {
        var consumed = 0
        var count = 0
        for scalar in text.unicodeScalars {
            if consumed >= utf16Offset { break }
            consumed += scalar.value > 0xffff ? 2 : 1
            count += 1
        }
        return count
    }

    static func substring(_ text: String, utf16Range: Range<Int>) -> String {
        (text as NSString).substring(with: NSRange(
            location: utf16Range.lowerBound,
            length: utf16Range.count
        ))
    }
}
