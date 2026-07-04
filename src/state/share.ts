// Shareable config URLs: the whole TankConfig is packed into the URL hash as
// base64url JSON, so a visitor can send their exact build to a friend.
// No backend involved — the receiving browser decodes it locally.

import type { TankConfig } from '../types';

export function encodeShareUrl(config: TankConfig): string {
  const json = JSON.stringify(config);
  // btoa only handles latin1, so escape unicode (tank names can be anything).
  const b64 = btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const url = new URL(window.location.href);
  url.hash = `t=${b64}`;
  return url.toString();
}

export function decodeShareHash(): TankConfig | null {
  try {
    const match = window.location.hash.match(/t=([A-Za-z0-9\-_]+)/);
    if (!match) return null;
    const b64 = match[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(escape(atob(b64)));
    const config = JSON.parse(json) as TankConfig;
    // Minimal validation — a corrupt hash should fail quietly, not crash the app.
    if (!config || typeof config !== 'object' || !config.water || !config.gallons) return null;
    return {
      ...config,
      fishNames: config.fishNames ?? {},
      decor: config.decor ?? [],
      flora: config.flora ?? {},
      fish: config.fish ?? {},
    };
  } catch {
    return null; // malformed share links are ignored
  }
}
