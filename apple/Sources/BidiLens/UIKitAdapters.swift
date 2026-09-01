#if canImport(UIKit)
import UIKit
import ObjectiveC

private var labelStateKey: UInt8 = 0
private var textViewStateKey: UInt8 = 0
private var textFieldStateKey: UInt8 = 0

public enum BidiUIKit {
    private struct ParagraphState {
        let range: NSRange
        let direction: NSWritingDirection
        let alignment: NSTextAlignment
    }

    private final class LabelState: NSObject {
        let alignment: NSTextAlignment
        let source: String
        let paragraphs: [ParagraphState]
        var renderedAlignment: NSTextAlignment?
        var renderedDirection: NSWritingDirection?

        init(_ label: UILabel, source: String) {
            alignment = label.textAlignment
            self.source = source
            let attributed = label.attributedText ?? NSAttributedString(string: source)
            paragraphs = BidiUIKit.paragraphStates(attributed)
        }
    }

    private final class InputState: NSObject {
        var alignment: NSTextAlignment
        var direction: NSWritingDirection
        var renderedAlignment: NSTextAlignment?
        var renderedDirection: NSWritingDirection?

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
        if let existing = state, !ownsRendering(label, state: existing) {
            objc_setAssociatedObject(label, &labelStateKey, nil, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
            state = nil
        }
        if !analysis.interventionRequired {
            restore(label)
            return analysis
        }
        if state == nil {
            state = LabelState(label, source: source)
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
            label.attributedText ?? NSAttributedString(string: source),
            source: source,
            direction: analysis.resolvedDirection,
            alignment: label.textAlignment
        )
        label.attributedText = rendered
        state?.renderedAlignment = label.textAlignment
        state?.renderedDirection = writingDirection(analysis.resolvedDirection)
        return analysis
    }

    /// Restores the label properties captured before BidiLens first intervened.
    public static func restore(_ label: UILabel) {
        guard let state = objc_getAssociatedObject(label, &labelStateKey) as? LabelState else {
            return
        }
        defer {
            objc_setAssociatedObject(label, &labelStateKey, nil, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
        }
        guard ownsRendering(label, state: state) else {
            return
        }
        if let current = label.attributedText, current.string == state.source {
            label.attributedText = restoringParagraphState(current, from: state.paragraphs)
        }
        label.textAlignment = state.alignment
    }

    private static func ownsRendering(
        _ label: UILabel,
        state: LabelState
    ) -> Bool {
        guard let expectedAlignment = state.renderedAlignment,
              let expectedDirection = state.renderedDirection,
              label.textAlignment == expectedAlignment else {
            return false
        }
        let current = label.attributedText
        guard (current?.string ?? label.text ?? "") == state.source else {
            return false
        }
        guard let current, current.length > 0 else {
            return state.source.isEmpty
        }
        var matches = true
        current.enumerateAttribute(
            .paragraphStyle,
            in: NSRange(location: 0, length: current.length)
        ) { value, _, stop in
            guard let paragraph = value as? NSParagraphStyle,
                  paragraph.alignment == expectedAlignment,
                  paragraph.baseWritingDirection == expectedDirection else {
                matches = false
                stop.pointee = true
                return
            }
        }
        return matches
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
        markInputRendered(textView, state: state, alignment: textView.textAlignment)
        return analysis
    }

    public static func restore(_ textView: UITextView) {
        guard let state = objc_getAssociatedObject(
            textView,
            &textViewStateKey
        ) as? InputState else { return }
        let selection = textView.selectedRange
        reconcileInputState(textView, state: state, alignment: textView.textAlignment)
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
        markInputRendered(textField, state: state, alignment: textField.textAlignment)
        return analysis
    }

    public static func restore(_ textField: UITextField) {
        guard let state = objc_getAssociatedObject(
            textField,
            &textFieldStateKey
        ) as? InputState else { return }
        let selection = textField.selectedTextRange
        reconcileInputState(textField, state: state, alignment: textField.textAlignment)
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
            reconcileInputState(input, state: state, alignment: alignment)
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

    private static func reconcileInputState(
        _ input: UITextInput,
        state: InputState,
        alignment: NSTextAlignment
    ) {
        if let renderedAlignment = state.renderedAlignment,
           alignment != renderedAlignment {
            state.alignment = alignment
        }
        let currentDirection = input.baseWritingDirection(
            for: input.beginningOfDocument,
            in: .forward
        )
        if let renderedDirection = state.renderedDirection,
           currentDirection != renderedDirection {
            state.direction = currentDirection
        }
    }

    private static func markInputRendered(
        _ input: UITextInput,
        state: InputState,
        alignment: NSTextAlignment
    ) {
        state.renderedAlignment = alignment
        state.renderedDirection = input.baseWritingDirection(
            for: input.beginningOfDocument,
            in: .forward
        )
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

    private static func paragraphStates(
        _ attributed: NSAttributedString
    ) -> [ParagraphState] {
        guard attributed.length > 0 else { return [] }
        var states: [ParagraphState] = []
        attributed.enumerateAttribute(
            .paragraphStyle,
            in: NSRange(location: 0, length: attributed.length)
        ) { value, range, _ in
            let paragraph = value as? NSParagraphStyle
            states.append(
                ParagraphState(
                    range: range,
                    direction: paragraph?.baseWritingDirection ?? .natural,
                    alignment: paragraph?.alignment ?? .natural
                )
            )
        }
        return states
    }

    private static func restoringParagraphState(
        _ attributed: NSAttributedString,
        from states: [ParagraphState]
    ) -> NSAttributedString {
        let restored = NSMutableAttributedString(attributedString: attributed)
        for state in states where NSMaxRange(state.range) <= restored.length {
            var updates: [(NSRange, NSMutableParagraphStyle)] = []
            restored.enumerateAttribute(.paragraphStyle, in: state.range) { value, range, _ in
                let paragraph = ((value as? NSParagraphStyle)?.mutableCopy()
                    as? NSMutableParagraphStyle) ?? NSMutableParagraphStyle()
                paragraph.baseWritingDirection = state.direction
                paragraph.alignment = state.alignment
                updates.append((range, paragraph))
            }
            for (range, paragraph) in updates {
                restored.addAttribute(.paragraphStyle, value: paragraph, range: range)
            }
        }
        return restored
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
