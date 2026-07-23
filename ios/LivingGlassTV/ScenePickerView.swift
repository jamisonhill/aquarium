// ScenePickerView.swift — the tvOS home screen: a row of scene cards (poster
// frames pulled from the loops), plus the auto-cycle setting. Native tvOS
// focus handling via the .card button style.

import SwiftUI

struct ScenePickerView: View {
    @AppStorage("autoCycleMinutes") private var autoCycleMinutes = 0
    @State private var posters: [String: UIImage] = [:]
    @State private var playing: AmbientScene?

    private let scenes = SceneCatalog.available

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Living Glass")
                        .font(.system(size: 54, weight: .bold, design: .serif))
                    Text("A living aquarium for your TV — pick a tank and let it swim.")
                        .font(.title3)
                        .foregroundStyle(.secondary)
                }
                .padding(.top, 40)

                if scenes.isEmpty {
                    ContentUnavailableView(
                        "No scenes in this build",
                        systemImage: "fish",
                        description: Text("Scene loops were not bundled. Rebuild with LivingGlassTV/Videos/*.mp4 present.")
                    )
                } else {
                    ScrollView(.horizontal, showsIndicators: false) {
                        LazyHStack(spacing: 40) {
                            ForEach(scenes) { scene in
                                Button {
                                    playing = scene
                                } label: {
                                    card(for: scene)
                                }
                                .buttonStyle(.card)
                            }
                        }
                        .padding(.vertical, 30)
                        .padding(.horizontal, 10)
                    }
                }

                // Auto-cycle: rotate through every tank like a gallery.
                HStack(spacing: 16) {
                    Text("Change tanks")
                        .font(.headline)
                        .foregroundStyle(.secondary)
                    Picker("Change tanks", selection: $autoCycleMinutes) {
                        Text("Never").tag(0)
                        Text("Every 5 min").tag(5)
                        Text("Every 15 min").tag(15)
                        Text("Every 30 min").tag(30)
                    }
                    .pickerStyle(.segmented)
                }
                .padding(.bottom, 40)
            }
            .padding(.horizontal, 80)
        }
        .background(Color(red: 0.016, green: 0.078, blue: 0.122)) // #04141f
        .fullScreenCover(item: $playing) { scene in
            PlayerView(scene: scene, autoCycleMinutes: autoCycleMinutes)
        }
        .task {
            for scene in scenes where posters[scene.slug] == nil {
                if let poster = await SceneCatalog.poster(for: scene) {
                    posters[scene.slug] = poster
                }
            }
        }
    }

    @ViewBuilder private func card(for scene: AmbientScene) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Group {
                if let poster = posters[scene.slug] {
                    Image(uiImage: poster)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } else {
                    Rectangle()
                        .fill(Color(red: 0.03, green: 0.12, blue: 0.18))
                        .overlay(ProgressView())
                }
            }
            .frame(width: 500, height: 281)
            .clipShape(RoundedRectangle(cornerRadius: 14))

            VStack(alignment: .leading, spacing: 2) {
                Text(scene.title).font(.headline)
                Text(scene.subtitle).font(.caption).foregroundStyle(.secondary)
            }
        }
    }
}
