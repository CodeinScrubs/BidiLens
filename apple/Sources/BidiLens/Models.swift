import Foundation

public enum BidiDirection: String, Codable, Sendable {
    case neutral
    case leftToRight
    case rightToLeft
}

public enum BidiDetectionStrategy: Equatable, Sendable {
    case contentMajority
    case firstStrong
    case strictUAX9
    case inherit
    case leftToRight
    case rightToLeft
}

public enum BidiIntervention: Equatable, Sendable {
    case auto
    case always
}

/// Alignment is deliberately independent from paragraph direction.
public enum BidiAlignment: Equatable, Sendable {
    case preserve
    case contentStart
    case physicalLeft
    case physicalRight
    case center
    case justified
}

public struct BidiOptions: Sendable {
    public var strategy: BidiDetectionStrategy
    public var fallback: BidiDirection
    public var inheritedDirection: BidiDirection
    public var minimumStrongCharacters: Int
    public var majorityThreshold: Double
    public var excludeTechnicalTokens: Bool
    public var technicalIdentifiers: Set<String>
    public var intervention: BidiIntervention

    public init(
        strategy: BidiDetectionStrategy = .contentMajority,
        fallback: BidiDirection = .neutral,
        inheritedDirection: BidiDirection = .leftToRight,
        minimumStrongCharacters: Int = 1,
        majorityThreshold: Double = 0.5,
        excludeTechnicalTokens: Bool = true,
        technicalIdentifiers: Set<String> = [],
        intervention: BidiIntervention = .auto
    ) {
        precondition(inheritedDirection != .neutral, "inheritedDirection must be leftToRight or rightToLeft")
        precondition(minimumStrongCharacters >= 1, "minimumStrongCharacters must be at least one")
        precondition((0.5...1.0).contains(majorityThreshold), "majorityThreshold must be between 0.5 and 1.0")
        self.strategy = strategy
        self.fallback = fallback
        self.inheritedDirection = inheritedDirection
        self.minimumStrongCharacters = minimumStrongCharacters
        self.majorityThreshold = majorityThreshold
        self.excludeTechnicalTokens = excludeTechnicalTokens
        self.technicalIdentifiers = technicalIdentifiers
        self.intervention = intervention
    }
}

public struct StrongCharacterCounts: Equatable, Sendable {
    public let leftToRight: Int
    public let rightToLeft: Int
    public var total: Int { leftToRight + rightToLeft }
}

public enum TechnicalTokenKind: String, Sendable {
    case code, url, email, path, version, hash, identifier, number, command, math, html
}

public struct TechnicalTokenRange: Equatable, Sendable {
    public let text: String
    public let utf16Range: Range<Int>
    public let kind: TechnicalTokenKind
}

public enum BidiIsolationKind: String, Sendable {
    case code, url, email, path, version, hash, identifier, number, command, math, html
    case oppositeDirectionRun
}

public struct BidiIsolation: Equatable, Sendable {
    public let text: String
    public let direction: BidiDirection
    public let utf16Range: Range<Int>
    public let codePointRange: Range<Int>
    public let kind: BidiIsolationKind
}

public struct BidiControlFinding: Equatable, Sendable {
    public let character: String
    public let codePoint: String
    public let utf16Range: Range<Int>
    public let name: String
    public let risk: String
}

public struct BidiSecurityReport: Equatable, Sendable {
    public let safe: Bool
    public let controls: [BidiControlFinding]
}

public struct BidiAnalysis: Equatable, Sendable {
    public let text: String
    public let direction: BidiDirection
    public let resolvedDirection: BidiDirection
    public let firstStrong: BidiDirection
    public let rawFirstStrong: BidiDirection
    public let counts: StrongCharacterCounts
    public let rawCounts: StrongCharacterCounts
    public let confidence: Double
    public let mixed: Bool
    public let interventionRequired: Bool
    public let technicalTokens: [TechnicalTokenRange]
    public let isolations: [BidiIsolation]
    public let security: BidiSecurityReport
}

public struct BidiPresentation: Equatable, Sendable {
    public let analysis: BidiAnalysis
    public let direction: BidiDirection
    public let alignment: BidiAlignment
}
