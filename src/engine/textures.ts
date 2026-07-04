// Procedural texture generation on <canvas>.
// Every texture in the aquarium is painted in code at startup — zero downloaded
// assets, zero licensing risk, and tiny page weight. The trade-off (vs. photo
// scans) is made up for by PBR lighting, caustics and fog doing the heavy
// lifting for realism.

import * as THREE from 'three';
import type { SubstrateId, BackgroundId, FishPalette, FishShape } from '../types';

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable — cannot generate textures');
  return [c, ctx];
}

function toTexture(c: HTMLCanvasElement, repeat = 1): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

// ── Substrate (sand / gravel / black sand / crushed coral) ──
export function substrateTexture(id: SubstrateId): { map: THREE.Texture; bumpMap: THREE.Texture; color: string } {
  const [c, ctx] = makeCanvas(512, 512);
  const [bc, bctx] = makeCanvas(512, 512);

  const palettes: Record<SubstrateId, { bg: string; grains: string[]; grainSize: [number, number]; count: number }> = {
    sand:         { bg: '#c8b48c', grains: ['#d8c49c', '#b8a47c', '#e0d0ac', '#a89468', '#d0bc94'], grainSize: [0.6, 1.8], count: 26000 },
    blacksand:    { bg: '#26262a', grains: ['#3a3a40', '#1a1a1e', '#4a4a52', '#2e2e34', '#565660'], grainSize: [0.6, 1.8], count: 26000 },
    gravel:       { bg: '#8a7a66', grains: ['#a89880', '#6a5c4c', '#b0a088', '#7c6e5c', '#948470', '#5c5044'], grainSize: [3, 9], count: 3200 },
    crushedcoral: { bg: '#ddd6c8', grains: ['#f0eadc', '#c8c0b0', '#e8d8c8', '#f4f0e4', '#d0c4ae', '#e8c8c0'], grainSize: [2, 6], count: 5200 },
  };
  const p = palettes[id];

  ctx.fillStyle = p.bg; ctx.fillRect(0, 0, 512, 512);
  bctx.fillStyle = '#808080'; bctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < p.count; i++) {
    const x = Math.random() * 512, y = Math.random() * 512;
    const r = rand(p.grainSize[0], p.grainSize[1]);
    ctx.fillStyle = p.grains[Math.floor(Math.random() * p.grains.length)];
    ctx.beginPath(); ctx.ellipse(x, y, r, r * rand(0.7, 1), rand(0, Math.PI), 0, Math.PI * 2); ctx.fill();
    // The bump map gets a bright top-left / dark bottom-right per grain,
    // which reads as tiny 3D relief under directional light.
    const l = Math.floor(rand(120, 200));
    bctx.fillStyle = `rgb(${l},${l},${l})`;
    bctx.beginPath(); bctx.arc(x - r * 0.2, y - r * 0.2, r * 0.8, 0, Math.PI * 2); bctx.fill();
    const d = Math.floor(rand(40, 90));
    bctx.fillStyle = `rgb(${d},${d},${d})`;
    bctx.beginPath(); bctx.arc(x + r * 0.25, y + r * 0.25, r * 0.55, 0, Math.PI * 2); bctx.fill();
  }
  const bump = new THREE.CanvasTexture(bc);
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(3, 3); // must match the color map's tiling
  return { map: toTexture(c, 3), bumpMap: bump, color: p.bg };
}

// ── Background wall (painted gradient + soft silhouettes) ──
export function backgroundTexture(id: BackgroundId, water: 'freshwater' | 'saltwater'): THREE.Texture {
  const [c, ctx] = makeCanvas(1024, 512);
  const g = ctx.createLinearGradient(0, 0, 0, 512);

  const silhouette = (color: string, blur: number, draw: () => void) => {
    ctx.save(); ctx.filter = `blur(${blur}px)`; ctx.fillStyle = color; draw(); ctx.restore();
  };

  switch (id) {
    case 'black':
      ctx.fillStyle = '#050608'; ctx.fillRect(0, 0, 1024, 512);
      break;
    case 'deepblue':
      g.addColorStop(0, '#0a2c4a'); g.addColorStop(1, '#04121f');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 512);
      break;
    case 'natural': {
      g.addColorStop(0, water === 'saltwater' ? '#1a5a7a' : '#3a6a5a');
      g.addColorStop(1, water === 'saltwater' ? '#0a2a3e' : '#16302a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 512);
      // Distant rock mounds, heavily blurred = out-of-focus depth.
      for (let i = 0; i < 7; i++) {
        silhouette(`rgba(10,25,25,${rand(0.25, 0.5)})`, 18, () => {
          ctx.beginPath();
          ctx.ellipse(rand(0, 1024), 512 - rand(0, 60), rand(80, 220), rand(60, 160), 0, Math.PI, 0);
          ctx.fill();
        });
      }
      break;
    }
    case 'planted': {
      g.addColorStop(0, '#2e5a3a'); g.addColorStop(1, '#122616');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 512);
      // Blurry vertical fronds — a jungle wall behind glass.
      for (let i = 0; i < 40; i++) {
        const x = rand(0, 1024), w = rand(8, 26), h = rand(160, 420);
        silhouette(`rgba(${Math.floor(rand(10, 40))},${Math.floor(rand(50, 95))},${Math.floor(rand(15, 45))},${rand(0.3, 0.65)})`, 10, () => {
          ctx.beginPath();
          ctx.ellipse(x, 512 - h / 2, w, h / 2, rand(-0.12, 0.12), 0, Math.PI * 2);
          ctx.fill();
        });
      }
      break;
    }
    case 'reef': {
      g.addColorStop(0, '#2a7ab0'); g.addColorStop(1, '#0a2440');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 512);
      for (let i = 0; i < 10; i++) {
        silhouette(`rgba(15,30,50,${rand(0.3, 0.55)})`, 14, () => {
          const x = rand(0, 1024), baseY = 512 - rand(0, 40);
          ctx.beginPath();
          ctx.ellipse(x, baseY, rand(60, 160), rand(70, 200), 0, Math.PI, 0);
          ctx.fill();
          // branchy bits on top
          for (let b = 0; b < 5; b++) {
            ctx.fillRect(x + rand(-60, 60), baseY - rand(120, 240), rand(6, 14), rand(60, 140));
          }
        });
      }
      break;
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ── Fish skin painting ──
// The texture is an unwrapped side view: x = nose→tail, y = belly→back.
// The geometry builder UV-maps the body the same way, so stripes/bars/spots
// land exactly where they do on the real fish.
export function fishTexture(palette: FishPalette, shape: FishShape): THREE.Texture {
  const W = 256, H = 128;
  const [c, ctx] = makeCanvas(W, H);

  // Base: vertical gradient belly → flank → back (countershading — nearly all
  // fish are dark on top and pale underneath).
  const g = ctx.createLinearGradient(0, H, 0, 0);
  g.addColorStop(0, palette.belly);
  g.addColorStop(0.45, palette.base);
  g.addColorStop(1, palette.back);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // Subtle scale shimmer: rows of faint lighter arcs.
  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = '#ffffff';
  for (let y = 8; y < H; y += 7) {
    for (let x = 0; x < W; x += 9) {
      ctx.beginPath(); ctx.arc(x + (y % 14 > 7 ? 4.5 : 0), y, 4, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  const pp = palette.patternParams ?? [];
  switch (palette.pattern) {
    case 'hstripe': {
      // Horizontal stripe(s) along the flank (neon tetra's electric line).
      const n = pp[0] ?? 1;
      for (let i = 0; i < n; i++) {
        const y = H * (0.38 + (i * 0.18));
        const grd = ctx.createLinearGradient(0, y - 9, 0, y + 9);
        grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(0.5, palette.patternColor); grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grd; ctx.fillRect(0, y - 9, W, 18);
      }
      if (palette.patternColor2 && n === 1) {
        // Secondary lower stripe over the rear half (neon/cardinal red).
        const y = H * 0.62;
        const grd = ctx.createLinearGradient(0, y - 10, 0, y + 10);
        grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(0.5, palette.patternColor2); grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(W * (palette.patternColor2 === palette.base ? 0 : 0.35), y - 10, W, 20);
      }
      break;
    }
    case 'vbars': {
      const n = pp[0] ?? 4;
      const widthScale = pp[1] ?? 0.7;
      for (let i = 0; i < n; i++) {
        const x = W * ((i + 0.75) / (n + 1));
        const w = (W / (n + 1)) * 0.42 * widthScale;
        const grd = ctx.createLinearGradient(x - w, 0, x + w, 0);
        grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(0.5, palette.patternColor); grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grd; ctx.fillRect(x - w, 0, w * 2, H);
        // Clownfish-style dark edge on the white bars.
        if (palette.patternColor2) {
          ctx.strokeStyle = palette.patternColor2; ctx.lineWidth = 2.5;
          ctx.strokeRect(x - w * 0.55, -2, w * 1.1, H + 4);
        }
      }
      break;
    }
    case 'spots': {
      const c1 = palette.patternColor, c2 = palette.patternColor2 ?? palette.patternColor;
      for (let i = 0; i < 26; i++) {
        ctx.fillStyle = Math.random() < 0.5 ? c1 : c2;
        ctx.globalAlpha = rand(0.35, 0.8);
        ctx.beginPath(); ctx.arc(rand(W * 0.2, W), rand(0, H), rand(2, 7), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'headpatch': {
      // Colored head (rummynose) or two-tone split (royal gramma, firefish).
      const split = pp[0] ?? 0.3;               // where the head zone ends (0..1 nose→tail)
      const direction = pp[1] ?? 0;              // 1 = rear patch instead (gramma yellow tail)
      const x0 = 0, x1 = W * split;
      const grd = ctx.createLinearGradient(direction >= 0 ? x0 : W, 0, direction >= 0 ? x1 : W - x1, 0);
      grd.addColorStop(0, direction === 1 ? palette.patternColor2 ?? palette.patternColor : palette.patternColor);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      if (direction === 1) {
        // gramma: purple front, yellow rear — paint the rear half.
        const rg = ctx.createLinearGradient(W * split, 0, W, 0);
        rg.addColorStop(0, 'rgba(0,0,0,0)');
        rg.addColorStop(0.5, palette.patternColor2 ?? '#f2c80a');
        ctx.fillStyle = rg; ctx.fillRect(W * split, 0, W, H);
      } else if (direction === -1) {
        // firefish: red rear.
        const rg = ctx.createLinearGradient(W * 0.4, 0, W, 0);
        rg.addColorStop(0, 'rgba(0,0,0,0)');
        rg.addColorStop(1, palette.patternColor2 ?? '#d82a10');
        ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      } else {
        ctx.fillStyle = grd; ctx.fillRect(0, 0, x1, H);
        if (palette.patternColor2 && palette.patternColor2 !== '#00000000') {
          // rummynose: black-and-white banded tail zone.
          for (let i = 0; i < 3; i++) {
            ctx.fillStyle = palette.patternColor2;
            ctx.fillRect(W * (0.86 + i * 0.05), 0, W * 0.024, H);
          }
        }
      }
      break;
    }
    case 'lateralline': {
      // Wedge / line thickening toward the tail (rasbora, blue tang mark).
      const startX = W * (pp[0] ?? 0.45);
      ctx.fillStyle = palette.patternColor;
      ctx.beginPath();
      ctx.moveTo(startX, H * 0.28);
      ctx.lineTo(W, H * 0.42);
      ctx.lineTo(W, H * 0.58);
      ctx.lineTo(startX, H * 0.52);
      ctx.closePath(); ctx.fill();
      break;
    }
    case 'mottle': {
      for (let i = 0; i < 90; i++) {
        ctx.fillStyle = palette.patternColor;
        ctx.globalAlpha = rand(0.15, 0.45);
        ctx.beginPath();
        ctx.ellipse(rand(0, W), rand(0, H), rand(4, 16), rand(3, 9), rand(0, Math.PI), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }
  }

  // Gill plate hint + eye is geometry/material; add a soft gill shadow line.
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(W * 0.16, H * 0.5, H * 0.32, -0.9, 0.9); ctx.stroke();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// ── Small utility sprites ──
export function radialSpriteTexture(inner: string, outer: string, ring = false): THREE.Texture {
  const [c, ctx] = makeCanvas(64, 64);
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  if (ring) {
    // Bubble: bright rim, transparent middle — reads as a refractive sphere.
    g.addColorStop(0, 'rgba(255,255,255,0.05)');
    g.addColorStop(0.72, 'rgba(255,255,255,0.10)');
    g.addColorStop(0.88, inner);
    g.addColorStop(1, 'rgba(255,255,255,0)');
  } else {
    g.addColorStop(0, inner);
    g.addColorStop(1, outer);
  }
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  if (ring) {
    // specular glint
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.ellipse(24, 22, 5, 3.4, -0.6, 0, Math.PI * 2); ctx.fill();
  }
  return new THREE.CanvasTexture(c);
}

// Wood grain for driftwood.
export function woodTexture(): THREE.Texture {
  const [c, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#4a3826'; ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) {
    ctx.strokeStyle = `rgba(${Math.floor(rand(30, 90))},${Math.floor(rand(22, 60))},${Math.floor(rand(12, 38))},${rand(0.3, 0.7)})`;
    ctx.lineWidth = rand(1, 4);
    ctx.beginPath();
    const y = rand(0, 256);
    ctx.moveTo(0, y);
    for (let x = 0; x <= 256; x += 32) ctx.lineTo(x, y + Math.sin(x * 0.05 + i) * rand(2, 9));
    ctx.stroke();
  }
  return toTexture(c, 2);
}

// Rock surface.
export function rockTexture(base = '#6a6a66'): THREE.Texture {
  const [c, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = base; ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2200; i++) {
    const v = Math.floor(rand(-28, 28));
    ctx.fillStyle = `rgba(${128 + v},${128 + v},${124 + v},${rand(0.08, 0.3)})`;
    ctx.beginPath(); ctx.arc(rand(0, 256), rand(0, 256), rand(1, 7), 0, Math.PI * 2); ctx.fill();
  }
  return toTexture(c, 2);
}
