// SceneCatalog.swift — the ambient scenes: one seamless 4K loop per starter
// tank, rendered from the same engine as the iOS/web app. Videos are bundled
// (LivingGlassTV/Videos/<slug>.mp4); a scene only appears if its file shipped.

import Foundation
import AVFoundation
import UIKit

struct AmbientScene: Identifiable, Hashable {
    let slug: String
    let title: String
    let subtitle: String

    var id: String { slug }

    var videoURL: URL? {
        Bundle.main.url(forResource: slug, withExtension: "mp4")
    }
}

enum SceneCatalog {
    /// Order = display order in the picker (hero scene first).
    static let all: [AmbientScene] = [
        AmbientScene(slug: "reef-lagoon", title: "Reef Lagoon", subtitle: "Saltwater · corals & clownfish"),
        AmbientScene(slug: "amazon-community", title: "Amazon Community", subtitle: "Freshwater · tetras & angelfish"),
        AmbientScene(slug: "blackwater-stream", title: "Blackwater Stream", subtitle: "Moody · tannin-stained wild"),
        AmbientScene(slug: "tang-highway", title: "Tang Highway", subtitle: "Big saltwater · open swimmers"),
        AmbientScene(slug: "betta-oasis", title: "Betta Oasis", subtitle: "A quiet corner for one"),
        AmbientScene(slug: "nano-planted", title: "Nano Planted", subtitle: "Tiny jungle · shrimp & neons"),
    ]

    /// Only the scenes whose loop actually shipped in this build.
    static var available: [AmbientScene] {
        all.filter { $0.videoURL != nil }
    }

    /// Poster frame for the picker card, pulled from the loop itself
    /// (~2 s in, past the seam) so no separate poster assets are needed.
    static func poster(for scene: AmbientScene) async -> UIImage? {
        guard let url = scene.videoURL else { return nil }
        let generator = AVAssetImageGenerator(asset: AVURLAsset(url: url))
        generator.appliesPreferredTrackTransform = true
        generator.maximumSize = CGSize(width: 800, height: 450)
        let time = CMTime(seconds: 2, preferredTimescale: 600)
        return await withCheckedContinuation { continuation in
            generator.generateCGImageAsynchronously(for: time) { cgImage, _, _ in
                continuation.resume(returning: cgImage.map(UIImage.init))
            }
        }
    }
}
