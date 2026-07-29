#if canImport(SwiftUI) && canImport(UIKit)
import SwiftUI
import UIKit
import XCTest
@testable import BidiLens

final class AppleAdapterTests: XCTestCase {
    private let rtl = "React یک کتابخانه جاوااسکریپت بسیار محبوب است."
    private let ltr = "React is a popular JavaScript library."

    @MainActor
    func testSwiftUIBridgeKeepsDirectionAndPhysicalAlignmentIndependent() throws {
        let label = UILabel()
        label.textAlignment = .center
        var configurationCalls = 0

        let analysis = BidiSwiftUIBridge.update(
            label,
            text: rtl,
            options: BidiOptions(),
            alignment: .physicalLeft
        ) {
            configurationCalls += 1
            $0.numberOfLines = 3
            $0.accessibilityIdentifier = "message-body"
        }

        XCTAssertEqual(configurationCalls, 1)
        XCTAssertEqual(analysis.direction, .rightToLeft)
        XCTAssertEqual(analysis.resolvedDirection, .rightToLeft)
        XCTAssertTrue(analysis.interventionRequired)
        XCTAssertEqual(label.text, rtl)
        XCTAssertEqual(label.attributedText?.string, rtl)
        XCTAssertEqual(label.textAlignment, .left)
        XCTAssertEqual(label.numberOfLines, 3)
        XCTAssertEqual(label.accessibilityIdentifier, "message-body")

        let paragraph = try XCTUnwrap(
            label.attributedText?.attribute(
                .paragraphStyle,
                at: 0,
                effectiveRange: nil
            ) as? NSParagraphStyle
        )
        XCTAssertEqual(paragraph.baseWritingDirection, .rightToLeft)
        XCTAssertEqual(paragraph.alignment, .left)
    }

    @MainActor
    func testContentStartFollowsParagraphDirectionWithoutMirroringTheView() throws {
        let label = UILabel()
        label.semanticContentAttribute = .forceLeftToRight

        let analysis = BidiSwiftUIBridge.update(
            label,
            text: rtl,
            options: BidiOptions(),
            alignment: .contentStart,
            configure: { _ in }
        )

        XCTAssertEqual(analysis.resolvedDirection, .rightToLeft)
        XCTAssertEqual(label.textAlignment, .right)
        XCTAssertEqual(label.semanticContentAttribute, .forceLeftToRight)
        XCTAssertEqual(label.effectiveUserInterfaceLayoutDirection, .leftToRight)
        XCTAssertEqual(label.text, rtl)

        let paragraph = try XCTUnwrap(
            label.attributedText?.attribute(
                .paragraphStyle,
                at: 0,
                effectiveRange: nil
            ) as? NSParagraphStyle
        )
        XCTAssertEqual(paragraph.baseWritingDirection, .rightToLeft)
        XCTAssertEqual(paragraph.alignment, .right)
    }

    @MainActor
    func testPureLTRUpdateLeavesConfiguredDirectionPropertiesUntouched() {
        let label = UILabel()

        let analysis = BidiSwiftUIBridge.update(
            label,
            text: ltr,
            options: BidiOptions(),
            alignment: .physicalRight
        ) {
            $0.textAlignment = .center
            $0.semanticContentAttribute = .forceRightToLeft
        }

        XCTAssertEqual(analysis.direction, .leftToRight)
        XCTAssertFalse(analysis.interventionRequired)
        XCTAssertEqual(label.text, ltr)
        XCTAssertNil(label.attributedText)
        XCTAssertEqual(label.textAlignment, .center)
        XCTAssertEqual(label.semanticContentAttribute, .forceRightToLeft)
    }

    @MainActor
    func testTransitionBackToLTRRestoresStateBeforeCallerConfiguration() {
        let label = UILabel()
        label.textAlignment = .natural

        let rtlAnalysis = BidiSwiftUIBridge.update(
            label,
            text: rtl,
            options: BidiOptions(),
            alignment: .physicalLeft,
            configure: { $0.textAlignment = .center }
        )
        XCTAssertTrue(rtlAnalysis.interventionRequired)
        XCTAssertEqual(label.textAlignment, .left)
        XCTAssertNotNil(label.attributedText)

        let ltrAnalysis = BidiSwiftUIBridge.update(
            label,
            text: ltr,
            options: BidiOptions(),
            alignment: .physicalRight
        ) {
            $0.textAlignment = .center
            $0.accessibilityLabel = "English message"
        }

        XCTAssertFalse(ltrAnalysis.interventionRequired)
        XCTAssertEqual(label.text, ltr)
        XCTAssertNil(label.attributedText)
        XCTAssertEqual(label.textAlignment, .center)
        XCTAssertEqual(label.accessibilityLabel, "English message")
    }

    @MainActor
    func testUIKitTextInputsPreserveSourceAndSelection() {
        let textView = UITextView()
        textView.text = rtl
        textView.selectedRange = NSRange(location: 5, length: 3)

        let viewAnalysis = BidiUIKit.apply(
            to: textView,
            alignment: .physicalLeft
        )
        XCTAssertEqual(viewAnalysis.resolvedDirection, .rightToLeft)
        XCTAssertEqual(textView.text, rtl)
        XCTAssertEqual(textView.selectedRange, NSRange(location: 5, length: 3))
        XCTAssertEqual(textView.textAlignment, .left)

        let textField = UITextField()
        textField.text = rtl
        let start = textField.beginningOfDocument
        let position = textField.position(from: start, offset: 5)
        textField.selectedTextRange = position.flatMap {
            textField.textRange(from: $0, to: $0)
        }
        let selection = textField.selectedTextRange

        let fieldAnalysis = BidiUIKit.apply(
            to: textField,
            alignment: .physicalLeft
        )
        XCTAssertEqual(fieldAnalysis.resolvedDirection, .rightToLeft)
        XCTAssertEqual(textField.text, rtl)
        XCTAssertEqual(textField.textAlignment, .left)
        XCTAssertEqual(textField.selectedTextRange, selection)
    }
}
#endif
