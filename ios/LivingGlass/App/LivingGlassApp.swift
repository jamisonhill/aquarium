// LivingGlassApp.swift — app entry. A full-bleed web view over the tank's
// deep-water color; the device never sleeps while the aquarium is up.

import SwiftUI

@main
struct LivingGlassApp: App {
    @StateObject private var webState = WebViewState()

    var body: some Scene {
        WindowGroup {
            ZStack {
                Color(red: 0.016, green: 0.078, blue: 0.122) // #04141f
                    .ignoresSafeArea()

                AquariumWebView(state: webState)
                    .ignoresSafeArea()

                // Invisible markers for the UI tests: readiness + storage
                // persistence. Zero visual footprint.
                VStack {
                    if webState.engineReady {
                        Text("ready").accessibilityIdentifier("aquarium.ready")
                    }
                    if webState.storagePersisted {
                        Text("persisted").accessibilityIdentifier("aquarium.persisted")
                    }
                }
                .opacity(0.011)
                .allowsHitTesting(false)
            }
            .persistentSystemOverlays(.hidden)
            .defersSystemGestures(on: .bottom)
            .onAppear {
                // An aquarium is meant to be watched — don't let the screen sleep.
                UIApplication.shared.isIdleTimerDisabled = true
            }
        }
    }
}
