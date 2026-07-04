// Quality tiers (RESEARCH.md Area 2): every expensive effect scales with the
// tier so weak hardware still gets a smooth, pretty tank and strong hardware
// gets the full treatment. 'auto' picks a tier from device heuristics, then the
// engine downgrades itself at runtime if the frame rate can't hold.

import type { QualityTier } from '../types';

export interface QualitySettings {
  tier: QualityTier;
  pixelRatioCap: number;
  bloom: boolean;
  godRayCount: number;
  snowCount: number;
  bubbleCount: number;
  maxFish: number;        // hard cap on total simulated fish
  causticStrength: number;
  antialias: boolean;
}

export const QUALITY: Record<QualityTier, QualitySettings> = {
  low:    { tier: 'low',    pixelRatioCap: 1,    bloom: false, godRayCount: 0,  snowCount: 120,  bubbleCount: 40,  maxFish: 60,  causticStrength: 0.8, antialias: false },
  medium: { tier: 'medium', pixelRatioCap: 1.25, bloom: false, godRayCount: 5,  snowCount: 300,  bubbleCount: 80,  maxFish: 120, causticStrength: 1.0, antialias: true },
  high:   { tier: 'high',   pixelRatioCap: 1.75, bloom: true,  godRayCount: 9,  snowCount: 700,  bubbleCount: 140, maxFish: 220, causticStrength: 1.0, antialias: true },
  ultra:  { tier: 'ultra',  pixelRatioCap: 2,    bloom: true,  godRayCount: 14, snowCount: 1400, bubbleCount: 220, maxFish: 400, causticStrength: 1.1, antialias: true },
};

export function detectQuality(renderer?: { getContext(): WebGLRenderingContext | WebGL2RenderingContext }): QualityTier {
  try {
    const isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
    const cores = navigator.hardwareConcurrency ?? 4;

    // Ask WebGL who the GPU actually is — the single best signal available.
    let gpu = '';
    if (renderer) {
      const gl = renderer.getContext();
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      if (info) gpu = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)).toLowerCase();
    }

    if (isMobile) {
      // Modern Apple GPUs handle 'medium' fine; everything else starts low.
      return /apple/.test(gpu) ? 'medium' : 'low';
    }
    if (/(rtx|radeon rx|apple m[1-9])/i.test(gpu)) return cores >= 8 ? 'ultra' : 'high';
    if (/(intel|uhd|iris)/.test(gpu)) return 'medium';
    return cores >= 8 ? 'high' : 'medium';
  } catch {
    return 'medium'; // detection failing should never break the app
  }
}
