// NativeBridge.swift — the message handler behind window.webkit.messageHandlers
// .native. The web side (src/platform/native.ts) posts {type: 'share'|'saveImage'}
// and this presents the native share sheet.

import WebKit
import UIKit

final class NativeBridge: NSObject, WKScriptMessageHandler {
    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard let body = message.body as? [String: Any],
              let type = body["type"] as? String else { return }

        switch type {
        case "share":
            if let raw = body["url"] as? String, let url = URL(string: raw) {
                presentShareSheet(items: [url])
            }
        case "saveImage":
            // A PNG data-URL from the engine's screenshot — decode and offer
            // the standard sheet (Save Image, Messages, AirDrop, …). Using the
            // share sheet avoids needing photo-library permission.
            if let raw = body["dataUrl"] as? String,
               let comma = raw.firstIndex(of: ","),
               let data = Data(base64Encoded: String(raw[raw.index(after: comma)...])),
               let image = UIImage(data: data) {
                presentShareSheet(items: [image])
            }
        default:
            break
        }
    }

    private func presentShareSheet(items: [Any]) {
        guard let scene = UIApplication.shared.connectedScenes
                .compactMap({ $0 as? UIWindowScene }).first,
              let root = scene.keyWindow?.rootViewController else { return }

        let sheet = UIActivityViewController(activityItems: items, applicationActivities: nil)
        // iPad requires a popover anchor.
        sheet.popoverPresentationController?.sourceView = root.view
        sheet.popoverPresentationController?.sourceRect = CGRect(
            x: root.view.bounds.midX, y: root.view.bounds.maxY - 80, width: 1, height: 1
        )
        root.present(sheet, animated: true)
    }
}
