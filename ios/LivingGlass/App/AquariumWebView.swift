// AquariumWebView.swift — the full-screen WKWebView hosting the aquarium.
// Also polls the page's readiness + persistence markers so UI tests (and the
// launch overlay) know when the tank is actually rendering.

import SwiftUI
import WebKit

/// Observable readiness state shared with the SwiftUI shell.
final class WebViewState: ObservableObject {
    @Published var engineReady = false
    @Published var storagePersisted = false
}

struct AquariumWebView: UIViewRepresentable {
    @ObservedObject var state: WebViewState

    func makeCoordinator() -> Coordinator {
        Coordinator(state: state)
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(BundleSchemeHandler(), forURLScheme: BundleSchemeHandler.scheme)
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        // Mark the page as native-hosted before any app code runs.
        let flag = WKUserScript(
            source: "window.__NATIVE_IOS__ = true;",
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        config.userContentController.addUserScript(flag)
        config.userContentController.add(NativeBridge(), name: "native")

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.016, green: 0.078, blue: 0.122, alpha: 1) // #04141f
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.allowsBackForwardNavigationGestures = false

        webView.load(URLRequest(url: BundleSchemeHandler.startURL))
        context.coordinator.beginPolling(webView)
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    final class Coordinator {
        private let state: WebViewState
        private var timer: Timer?

        init(state: WebViewState) {
            self.state = state
        }

        /// Poll the page until the engine has rendered its first frame, and
        /// stamp/check a localStorage marker that proves the custom-scheme
        /// origin persists across launches (the tank saves depend on it).
        func beginPolling(_ webView: WKWebView) {
            timer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self, weak webView] t in
                guard let self, let webView else { t.invalidate(); return }
                webView.evaluateJavaScript("window.__AQUARIUM_READY__ === true") { result, _ in
                    if (result as? Bool) == true, !self.state.engineReady {
                        DispatchQueue.main.async { self.state.engineReady = true }
                    }
                }
                webView.evaluateJavaScript(
                    "(() => { const had = localStorage.getItem('lg.boot') === '1';" +
                    " localStorage.setItem('lg.boot', '1'); return had; })()"
                ) { result, _ in
                    if (result as? Bool) == true, !self.state.storagePersisted {
                        DispatchQueue.main.async { self.state.storagePersisted = true }
                    }
                }
                if self.state.engineReady && self.state.storagePersisted { t.invalidate() }
            }
        }
    }
}
