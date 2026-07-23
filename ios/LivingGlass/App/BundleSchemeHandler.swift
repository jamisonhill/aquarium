// BundleSchemeHandler.swift — serves the bundled web build (Web/ inside the
// app bundle) over the custom app://aquarium/ origin.
//
// Why not loadFileURL: Vite emits <script type="module">, and module scripts
// are CORS-blocked under file:// (opaque origin). A custom scheme gives the
// page a real, stable origin — which also makes localStorage (the tank
// save/settings store) persist properly between launches.

import WebKit
import UniformTypeIdentifiers

final class BundleSchemeHandler: NSObject, WKURLSchemeHandler {
    static let scheme = "app"
    static let startURL = URL(string: "app://aquarium/index.html")!

    private static let mimeTypes: [String: String] = [
        "html": "text/html",
        "js": "text/javascript",
        "css": "text/css",
        "json": "application/json",
        "svg": "image/svg+xml",
        "png": "image/png",
        "webmanifest": "application/manifest+json",
        "wasm": "application/wasm",
        "woff2": "font/woff2",
    ]

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let url = urlSchemeTask.request.url else { return }

        // Map app://aquarium/<path> → <bundle>/Web/<path>; "/" → index.html.
        var path = url.path
        if path.isEmpty || path == "/" { path = "/index.html" }

        guard
            let webRoot = Bundle.main.resourceURL?.appendingPathComponent("Web", isDirectory: true),
            case let fileURL = webRoot.appendingPathComponent(String(path.dropFirst())),
            fileURL.standardizedFileURL.path.hasPrefix(webRoot.standardizedFileURL.path), // no traversal
            let data = try? Data(contentsOf: fileURL)
        else {
            urlSchemeTask.didFailWithError(URLError(.fileDoesNotExist))
            return
        }

        let ext = fileURL.pathExtension.lowercased()
        let mime = Self.mimeTypes[ext] ?? "application/octet-stream"
        let response = HTTPURLResponse(
            url: url,
            statusCode: 200,
            httpVersion: "HTTP/1.1",
            headerFields: [
                "Content-Type": mime,
                "Content-Length": String(data.count),
                // Everything is versioned by the app binary itself — cache freely.
                "Cache-Control": "no-cache",
            ]
        )!

        urlSchemeTask.didReceive(response)
        urlSchemeTask.didReceive(data)
        urlSchemeTask.didFinish()
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {
        // Loads are tiny and local; nothing to cancel.
    }
}
