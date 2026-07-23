// captureMode.ts — headless video-capture entry for the tvOS ambient app.
// Loading the app with  #capture=<preset-slug>&fps=30&secs=70  skips React
// entirely: the engine mounts alone at ultra quality with the cinematic
// camera, detached from requestAnimationFrame, and the puppeteer driver
// (scripts/capture-scene.mjs) steps it frame-by-frame via window.__step(dt)
// and screenshots each frame. Fixed dt = smooth video even though rendering
// and readback run far slower than real time.

import { Engine } from '../engine/Engine';
import { PRESETS } from '../data/presets';

export interface CaptureParams {
  preset: string;
  fps: number;
  secs: number;
}

declare global {
  interface Window {
    __step?: (dt: number) => void;
    __closeUp?: (fraction: number) => void;
    __captureInfo?: CaptureParams & { presetName: string };
  }
}

const slugOf = (name: string) => name.toLowerCase().replace(/\s+/g, '-');

export function parseCapture(): CaptureParams | null {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const preset = params.get('capture');
  if (!preset) return null;
  return {
    preset,
    fps: Number(params.get('fps')) || 30,
    secs: Number(params.get('secs')) || 70,
  };
}

export function bootCapture(params: CaptureParams): void {
  const preset = PRESETS.find((p) => slugOf(p.name) === params.preset.toLowerCase());
  if (!preset) {
    document.body.textContent = `Unknown capture preset: ${params.preset}`;
    return;
  }

  const host = document.getElementById('root')!;
  host.style.cssText = 'position:fixed;inset:0;background:#04141f';

  const engine = new Engine(host);
  engine.setQuality('ultra');
  // Fixed daylight — the 4-minute day/night cycle would shift brightness
  // across the loop and fight the seam crossfade.
  engine.applyConfig({ ...preset, dayNight: 'day' });
  engine.setCameraMode('cinematic');
  // Full-bleed underwater framing — an exterior product shot of the glass box
  // reads wrong on a TV. Tuned via the __closeUp hook below.
  engine.cinematicCloseUp(0.42);
  engine.enableExternalDrive();

  window.__step = (dt: number) => engine.advance(dt);
  window.__closeUp = (f: number) => engine.cinematicCloseUp(f);
  window.__captureInfo = { ...params, presetName: preset.name };
}
