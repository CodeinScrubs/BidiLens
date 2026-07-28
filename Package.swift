// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "BidiLens",
    platforms: [
        .iOS(.v15),
        .macOS(.v12),
    ],
    products: [
        .library(name: "BidiLens", targets: ["BidiLens"]),
        .executable(name: "BidiLensExample", targets: ["BidiLensExample"]),
    ],
    targets: [
        .target(
            name: "BidiLens",
            path: "apple/Sources/BidiLens"
        ),
        .executableTarget(
            name: "BidiLensExample",
            dependencies: ["BidiLens"],
            path: "apple/Examples/BidiLensExample"
        ),
        .testTarget(
            name: "BidiLensTests",
            dependencies: ["BidiLens"],
            path: "apple/Tests/BidiLensTests",
            resources: [.copy("Resources/cases.json")]
        ),
    ]
)
