#if canImport(SwiftUI) && canImport(UIKit)
import SwiftUI
import UIKit

/// A SwiftUI text view whose paragraph direction is independent from its
/// physical alignment.
///
/// `BidiText` is backed by `UILabel` so it can apply a paragraph base-writing
/// direction without changing the layout direction of the surrounding SwiftUI
/// hierarchy. The logical source string is never rewritten.
@available(iOS 15.0, *)
public struct BidiText: UIViewRepresentable {
    public typealias UIViewType = UILabel
    public typealias Configuration = (UILabel) -> Void

    private let text: String
    private let options: BidiOptions
    private let alignment: BidiAlignment
    private let configuration: Configuration

    public init(
        _ text: String,
        options: BidiOptions = BidiOptions(),
        alignment: BidiAlignment = .contentStart,
        configure: @escaping Configuration = { _ in }
    ) {
        self.text = text
        self.options = options
        self.alignment = alignment
        self.configuration = configure
    }

    public func makeUIView(context: Context) -> UILabel {
        let label = UILabel()
        label.numberOfLines = 0
        return label
    }

    public func updateUIView(_ label: UILabel, context: Context) {
        BidiSwiftUIBridge.update(
            label,
            text: text,
            options: options,
            alignment: alignment,
            configure: configuration
        )
    }

    public static func dismantleUIView(_ label: UILabel, coordinator: ()) {
        BidiUIKit.restore(label)
    }
}

enum BidiSwiftUIBridge {
    /// Restores the previous intervention before applying caller styling and
    /// reanalyzing the current source. The source is assigned after the
    /// configuration closure so styling cannot replace the logical value.
    /// SwiftUI owns this label, so repeated updates cannot retain stale
    /// paragraph state.
    @discardableResult
    static func update(
        _ label: UILabel,
        text: String,
        options: BidiOptions,
        alignment: BidiAlignment,
        configure: (UILabel) -> Void
    ) -> BidiAnalysis {
        BidiUIKit.restore(label)
        configure(label)
        label.text = text
        return BidiUIKit.apply(
            to: label,
            options: options,
            alignment: alignment
        )
    }
}
#endif
