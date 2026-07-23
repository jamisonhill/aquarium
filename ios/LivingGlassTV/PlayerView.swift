// PlayerView.swift — full-screen gapless loop playback of one ambient scene,
// with optional auto-cycling through every available scene. Menu/tap exits
// back to the picker (standard tvOS behavior via the dismiss action).

import SwiftUI
import AVKit

/// UIViewRepresentable AVPlayerLayer host — full bleed, no playback chrome
/// (AVPlayerViewController would add transport UI we don't want for ambience).
private struct PlayerLayerView: UIViewRepresentable {
    let player: AVPlayer

    final class LayerHost: UIView {
        override static var layerClass: AnyClass { AVPlayerLayer.self }
        var playerLayer: AVPlayerLayer { layer as! AVPlayerLayer }
    }

    func makeUIView(context: Context) -> LayerHost {
        let view = LayerHost()
        view.playerLayer.videoGravity = .resizeAspectFill
        view.playerLayer.player = player
        return view
    }

    func updateUIView(_ view: LayerHost, context: Context) {
        view.playerLayer.player = player
    }
}

struct PlayerView: View {
    let scene: AmbientScene
    /// 0 = stay on this scene; otherwise minutes between scene changes.
    let autoCycleMinutes: Int

    @Environment(\.dismiss) private var dismiss
    @State private var player = AVQueuePlayer()
    @State private var looper: AVPlayerLooper?
    @State private var current: AmbientScene?

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            PlayerLayerView(player: player)
                .ignoresSafeArea()
        }
        .onAppear { play(scene) }
        .onDisappear {
            player.pause()
            looper = nil
        }
        // The Siri Remote's touch surface click exits (Menu exits automatically).
        .onTapGesture { dismiss() }
        .task {
            guard autoCycleMinutes > 0 else { return }
            let scenes = SceneCatalog.available
            guard scenes.count > 1 else { return }
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(Double(autoCycleMinutes) * 60))
                guard !Task.isCancelled, let now = current,
                      let index = scenes.firstIndex(of: now) else { continue }
                play(scenes[(index + 1) % scenes.count])
            }
        }
    }

    private func play(_ scene: AmbientScene) {
        guard let url = scene.videoURL else { return }
        current = scene
        player.pause()
        player.removeAllItems()
        let item = AVPlayerItem(url: url)
        // AVPlayerLooper handles the gapless wrap; the file's own tail→head
        // crossfade makes the wrap invisible.
        looper = AVPlayerLooper(player: player, templateItem: item)
        player.play()
    }
}
