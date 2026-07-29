#if canImport(UIKit)
import UIKit
import ObjectiveC

private var labelStateKey: UInt8 = 0
private var textViewStateKey: UInt8 = 0
private var textFieldStateKey: UInt8 = 0

public enum BidiUIKit {
    private final class LabelState: NSObject {
        let alignment: NSTextAlignment
        let attributedText: NSAttributedString?
        var renderedText: NSAttributedString?

        init(_ label: UILabel) {
            alignment = label.textAlignment
            attributedText = label.attributedText?.copy() as? NSAttributedString
        }
    }

    private final class InputState: NSObject {
        let alignment: NSTextAlignment
        let direction: NSWritingDirection

        init(alignment: NSTextAlignment, direction: NSWritingDirection) {
            self.alignment = alignment
            self.direction = direction
        }
    }

    /// Applies direction and alignment without changing `label.text`.
    @discardableResult
    public static func apply(
        to label: UILabel,
        options: BidiOptions = BidiOptions(),
        alignment: BidiAlignment = .contentStart
    ) -> BidiAnalysis {
        let source = label.text ?? label.attributedText?.string ?? ""
        let analysis = BidiAnalyzer.analyze(source, options: options)
        var state = objc_getAssociatedObject(label, &labelStateKey) as? LabelState
        if let existing = state,
           !attributedTextMatches(label.attributedText, existing.renderedText) {
            objc_setAssociatedObject(label, &labelStateKey, nil, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
            state = nil
        }
        if !analysis.interventionRequired {
            restore(label)
            return analysis
        }
        if state == nil {
            state = LabelState(label)
            objc_setAssociatedObject(
                label,
                &labelStateKey,
                state,
                .OBJC_ASSOCIATION_RETAIN_NONATOMIC
            )
        }

        label.textAlignment = uiAlignment(
            alignment,
            direction: analysis.resolvedDirection,
            original: state?.alignment ?? label.textAlignment
        )
        let rendered = paragraphAttributedText(
            state?.attributedText ?? label.attributedText ?? NSAttributedString(string: source),
            source: source,
            direction: analysis.resolvedDirection,
            alignment: label.textAlignment
        )
        state?.renderedText = rendered
        label.attributedText = rendered
        return analysis
    }

    /// Restores the label properties captured before BidiLens first intervened.
    public static func restore(_ label: UILabel) {
        guard let state = objc_getAssociatedObject(label, &labelStateKey) as? LabelState else {
            return
        }
        label.textAlignment = state.alignment
        if attributedTextMatches(label.attributedText, state.renderedText),
           state.attributedText?.string == label.attributedText?.string {
            label.attributedText = state.attributedText
        }
        objc_setAssociatedObject(label, &labelStateKey, nil, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
    }

    private static func attributedTextMatches(
        _ current: NSAttributedString?,
        _ rendered: NSAttributedString?
    ) -> Bool {
        switch (current, rendered) {
        case (nil, nil):
            return true
        case let (current?, rendered?):
            return current.isEqual(to: rendered)
        default:
            return false
        }
    }

    /// Uses UITextInput's native paragraph direction API and preserves selection.
    @discardableResult
    public static func apply(
        to textView: UITextView,
        options: BidiOptions = BidiOptions(),
        alignment: BidiAlignment = .contentStart
    ) -> BidiAnalysis {
        let source = textView.text ?? ""
        let selection = textView.selectedRange
        let analysis = BidiAnalyzer.analyze(source, options: options)
        let state = inputState(
            textView,
            key: &textViewStateKey,
            alignment: textView.textAlignment
        )
        if !analysis.interventionRequired {
            restore(textView)
            return analysis
        }

        textView.textAlignment = uiAlignment(
            alignment,
            direction: analysis.resolvedDirection,
            original: state.alignment
        )
        let start = textView.beginningOfDocument
        if let end = textView.position(from: start, offset: (source as NSString).length),
           let range = textView.textRange(from: start, to: end) {
            textView.setBaseWritingDirection(
                writingDirection(analysis.resolvedDirection),
                for: range
            )
        }
        textView.selectedRange = selection
        return analysis
    }

    public static func restore(_ textView: UITextView) {
        guard let state = objc_getAssociatedObject(
            textView,
            &textViewStateKey
        ) as? InputState else { return }
        let selection = textView.selectedRange
        textView.textAlignment = state.alignment
        setWritingDirection(state.direction, on: textView, source: textView.text ?? "")
        textView.selectedRange = selection
        objc_setAssociatedObject(
            textView,
            &textViewStateKey,
            nil,
            .OBJC_ASSOCIATION_RETAIN_NONATOMIC
        )
    }

    /// Applies input direction and alignment without changing text or selection.
    @discardableResult
    public static func apply(
        to textField: UITextField,
        options: BidiOptions = BidiOptions(),
        alignment: BidiAlignment = .contentStart
    ) -> BidiAnalysis {
        let source = textField.text ?? ""
        let selection = textField.selectedTextRange
        let analysis = BidiAnalyzer.analyze(source, options: options)
        let state = inputState(
            textField,
            key: &textFieldStateKey,
            alignment: textField.textAlignment
        )
        if !analysis.interventionRequired {
            restore(textField)
            return analysis
        }

        textField.textAlignment = uiAlignment(
            alignment,
            direction: analysis.resolvedDirection,
            original: state.alignment
        )
        let start = textField.beginningOfDocument
        if let end = textField.position(from: start, offset: (source as NSString).length),
           let range = textField.textRange(from: start, to: end) {
            textField.setBaseWritingDirection(
                writingDirection(analysis.resolvedDirection),
                for: range
            )
        }
        textField.selectedTextRange = selection
        return analysis
    }

    public static func restore(_ textField: UITextField) {
        guard let state = objc_getAssociatedObject(
            textField,
            &textFieldStateKey
        ) as? InputState else { return }
        let selection = textField.selectedTextRange
        textField.textAlignment = state.alignment
        setWritingDirection(state.direction, on: textField, source: textField.text ?? "")
        textField.selectedTextRange = selection
        objc_setAssociatedObject(
            textField,
            &textFieldStateKey,
            nil,
            .OBJC_ASSOCIATION_RETAIN_NONATOMIC
        )
    }

    private static func inputState(
        _ input: UITextInput,
        key: UnsafeRawPointer,
        alignment: NSTextAlignment
    ) -> InputState {
        if let state = objc_getAssociatedObject(input, key) as? InputState {
            return state
        }
        let start = input.beginningOfDocument
        let state = InputState(
            alignment: alignment,
            direction: input.baseWritingDirection(for: start, in: .forward)
        )
        objc_setAssociatedObject(input, key, state, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
        return state
    }

    private static func setWritingDirection(
        _ direction: NSWritingDirection,
        on input: UITextInput,
        source: String
    ) {
        let start = input.beginningOfDocument
        if let end = input.position(from: start, offset: (source as NSString).length),
           let range = input.textRange(from: start, to: end) {
            input.setBaseWritingDirection(direction, for: range)
        }
    }

    private static func writingDirection(_ direction: BidiDirection) -> NSWritingDirection {
        direction == .rightToLeft ? .rightToLeft : .leftToRight
    }

    private static func uiAlignment(
        _ alignment: BidiAlignment,
        direction: BidiDirection,
        original: NSTextAlignment
    ) -> NSTextAlignment {
        switch alignment {
        case .preserve: return original
        case .contentStart: return direction == .rightToLeft ? .right : .left
        case .physicalLeft: return .left
        case .physicalRight: return .right
        case .center: return .center
        case .justified: return .justified
        }
    }

    private static func paragraphAttributedText(
        _ base: NSAttributedString,
        source: String,
        direction: BidiDirection,
        alignment: NSTextAlignment
    ) -> NSAttributedString {
        let attributed = NSMutableAttributedString(
            attributedString: base.string == source ? base : NSAttributedString(string: source)
        )
        let fullRange = NSRange(location: 0, length: attributed.length)
        if fullRange.length == 0 { return attributed }
        var updates: [(NSRange, NSMutableParagraphStyle)] = []
        attributed.enumerateAttribute(.paragraphStyle, in: fullRange) { value, range, _ in
            let paragraph = ((value as? NSParagraphStyle)?.mutableCopy() as? NSMutableParagraphStyle)
                ?? NSMutableParagraphStyle()
            paragraph.baseWritingDirection = writingDirection(direction)
            paragraph.alignment = alignment
            updates.append((range, paragraph))
        }
        if updates.isEmpty {
            let paragraph = NSMutableParagraphStyle()
            paragraph.baseWritingDirection = writingDirection(direction)
            paragraph.alignment = alignment
            updates.append((fullRange, paragraph))
        }
        for (range, paragraph) in updates {
            attributed.addAttribute(.paragraphStyle, value: paragraph, range: range)
        }
        return attributed
    }
}
#endif
