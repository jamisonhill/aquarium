// native.ts — the tiny seam between the web app and the iOS shell.
// The iOS app injects `window.__NATIVE_IOS__ = true` at documentStart and
// registers a `native` message handler. On the open web all of these are
// no-ops / false, so the app behaves identically in a plain browser.

declare global {
  interface Window {
    __NATIVE_IOS__?: boolean;
    __AQUARIUM_READY__?: boolean;
    webkit?: {
      messageHandlers?: {
        native?: { postMessage: (msg: unknown) => void };
      };
    };
  }
}

export function isNativeIOS(): boolean {
  return window.__NATIVE_IOS__ === true;
}

function post(msg: Record<string, unknown>): boolean {
  const handler = window.webkit?.messageHandlers?.native;
  if (!handler) return false;
  handler.postMessage(msg);
  return true;
}

/** Open the native share sheet with a URL (share links). */
export function nativeShare(url: string): boolean {
  return post({ type: 'share', url });
}

/** Hand a PNG data-URL to the native side (share sheet → Save Image etc.). */
export function nativeSaveImage(dataUrl: string): boolean {
  return post({ type: 'saveImage', dataUrl });
}

/** Flag the first rendered frame — the iOS smoke test polls this. */
export function markReady(): void {
  window.__AQUARIUM_READY__ = true;
}
