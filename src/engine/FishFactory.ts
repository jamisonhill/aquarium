// Procedural fish builder.
//
// Geometry: each species's body is lofted from elliptical cross-sections along
// a spine (nose at x=+0.5, tail tip at x=-0.5, unit length — the instance
// matrix scales it to real size). Fins are thin double-sided sheets attached in
// a second geometry group so they can use a translucent material.
//
// Motion: swimming is done ENTIRELY in the vertex shader (RESEARCH.md §3.1) —
// a traveling sine wave runs nose→tail with amplitude growing toward the tail.
// The CPU only updates a per-fish accumulated phase, so a whole school is one
// instanced draw call. Speed is coupled to tail-beat frequency (U ≈ 0.7·L·f),
// which is what makes the movement read as *swimming* instead of gliding.

import * as THREE from 'three';
import type { SpeciesDef } from '../types';
import { fishTexture } from './textures';
import { applyUnderwater } from './shaders';

const TAU = Math.PI * 2;

// Vertex-shader declarations for the swim deformation.
const swimPars = /* glsl */ `
  attribute vec3 aDyn;      // per-instance dynamics: x = accumulated swim phase,
                            // y = turn bend (curls body into turns), z = pectoral flap amount
  attribute float aRand;    // per-instance random seed (desynchronizes idle motion)
  attribute float aPart;    // per-vertex: 0 body, 1 caudal fin, 2 median fins, 3 pectorals
  attribute float aFlutterD;// per-vertex: distance from a pectoral fin's root
  uniform float uWaveLen;   // undulation wavelength in body lengths
  uniform float uAmp;       // tail amplitude as a fraction of body length
  uniform float uMode;      // swim mode: 0 eel … 3 tail-only
`;

// The swim deformation itself, spliced in right after Three.js computes
// `transformed` (the local-space vertex position).
const swimHook = /* glsl */ `
{
  float s = clamp(0.5 - transformed.x, 0.0, 1.0); // 0 at nose → 1 at tail tip

  // Amplitude envelope: which part of the body undulates depends on the swim
  // mode (eels wave everything; tunas & boxfish only wave the tail).
  float env;
  if (uMode < 0.5)      env = 0.25 + 0.75 * s;                        // anguilliform
  else if (uMode < 1.5) env = 0.08 + 0.92 * smoothstep(0.30, 1.0, s); // subcarangiform
  else if (uMode < 2.5) env = 0.05 + 0.95 * smoothstep(0.55, 1.0, s); // carangiform
  else                  env = smoothstep(0.78, 1.0, s);               // ostraciiform

  // The traveling wave: aDyn.x is the phase accumulated on the CPU as
  // phase += 2π·f·dt, so changing speed never "pops" the animation.
  float wave = sin(s * 6.28318 / uWaveLen - aDyn.x);
  transformed.z += uAmp * env * wave;

  // Head recoil: the front of the body counter-sways slightly — without this
  // the fish looks like a flag on a stick instead of a swimmer.
  transformed.z -= uAmp * 0.22 * sin(-aDyn.x) * (1.0 - s) * (1.0 - s);

  // Bank/bend into turns: parabolic curvature along the spine.
  transformed.z += aDyn.y * s * s * 0.7;

  // Pectoral fin sculling: hovering fish constantly flutter their side fins
  // (a stationary fish is unstable — RESEARCH.md §3.2). aDyn.z rises as the
  // fish slows down, so flutter appears exactly when swimming stops.
  if (aPart > 2.5) {
    transformed.z += aFlutterD * aDyn.z * 0.35 * sin(uTime * 11.0 + aRand * 37.0);
    transformed.y += aFlutterD * aDyn.z * 0.15 * cos(uTime * 11.0 + aRand * 37.0);
  }

  // Gentle gill/breathing pulse near the head — barely visible, but it's the
  // difference between a fish and a statue when the fish is at rest.
  float headness = smoothstep(0.35, 0.05, s);
  transformed.z *= 1.0 + 0.03 * headness * sin(uTime * 2.4 + aRand * 51.0);
}
`;

export interface FishAsset {
  geometry: THREE.BufferGeometry;
  materials: THREE.Material[];   // [body, fins]
  uniforms: { uWaveLen: THREE.IUniform; uAmp: THREE.IUniform; uMode: THREE.IUniform };
}

const assetCache = new Map<string, FishAsset>();

export function getFishAsset(sp: SpeciesDef): FishAsset {
  let asset = assetCache.get(sp.id);
  if (!asset) {
    asset = buildFishAsset(sp);
    assetCache.set(sp.id, asset);
  }
  return asset;
}

function buildFishAsset(sp: SpeciesDef): FishAsset {
  const geometry = sp.id.includes('snail') ? buildSnailGeometry(sp) : buildFishGeometry(sp);

  const uniforms = {
    uWaveLen: { value: sp.swim.waveLen },
    // Snails are rigid — zero amplitude keeps the shell from wobbling.
    uAmp: { value: sp.id.includes('snail') ? 0 : sp.swim.amp },
    uMode: { value: sp.swim.mode },
  };

  const map = fishTextureWithEye(sp);
  const body = new THREE.MeshStandardMaterial({
    map,
    roughness: 0.42,
    metalness: 0.55 * sp.palette.iridescence, // structural shimmer on tetras etc.
    envMapIntensity: 0.8 + sp.palette.iridescence,
  });
  const fins = new THREE.MeshStandardMaterial({
    color: new THREE.Color(sp.palette.fin),
    roughness: 0.55,
    metalness: 0.1,
    transparent: true,
    opacity: sp.palette.finOpacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  for (const m of [body, fins]) {
    applyUnderwater(m, {
      caustics: true,
      causticStrength: 0.7,
      vertexPars: swimPars,
      vertexHook: swimHook,
      extraUniforms: uniforms,
    });
  }
  return { geometry, materials: [body, fins], uniforms };
}

// Paint the species texture, then add the eye directly into the map (the UV
// layout is deterministic, so we know exactly where the head is).
function fishTextureWithEye(sp: SpeciesDef): THREE.Texture {
  const tex = fishTexture(sp.palette, sp.shape);
  const canvas = tex.image as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;
  const W = canvas.width, H = canvas.height;
  const ex = W * 0.115, ey = H * (1 - 0.62), r = H * sp.shape.eyeSize * 2.4;
  ctx.fillStyle = '#d8d2c0';
  ctx.beginPath(); ctx.arc(ex, ey, r * 1.25, 0, TAU); ctx.fill();
  ctx.fillStyle = '#0a0a0c';
  ctx.beginPath(); ctx.arc(ex, ey, r * 0.85, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath(); ctx.arc(ex - r * 0.3, ey - r * 0.3, r * 0.28, 0, TAU); ctx.fill();
  tex.needsUpdate = true;
  return tex;
}

// ── Body profile helpers ──
// u runs 0 (nose) → 1 (tail base). Returns half-height of the body there.
function bodyProfile(u: number, sp: SpeciesDef): number {
  const sh = sp.shape;
  // A skewed sine bump: peak position slides forward for deep-bodied fish.
  const peak = sh.eelLike ? 0.5 : 0.42;
  const x = u < peak ? u / peak : (1 - u) / (1 - peak);
  let h = Math.pow(Math.sin((Math.PI / 2) * THREE.MathUtils.clamp(x, 0, 1)), sh.eelLike ? 0.35 : 0.8 + sh.noseSharp * 0.7);
  // Eel-like bodies stay near-constant thickness.
  if (sh.eelLike) h = 0.35 + 0.65 * h;
  return (sh.height / 2) * h;
}

function buildFishGeometry(sp: SpeciesDef): THREE.BufferGeometry {
  const sh = sp.shape;
  const RINGS = 22, SIDES = 12;
  const positions: number[] = [];
  const uvs: number[] = [];
  const parts: number[] = [];
  const flutter: number[] = [];
  const indices: number[] = [];

  const bodyLen = 1 - sh.tailSize;          // body occupies [tailBaseX, +0.5]
  const tailBaseX = 0.5 - bodyLen;

  // — Body tube —
  for (let i = 0; i <= RINGS; i++) {
    const u = i / RINGS;                     // 0 nose → 1 tail base
    const x = 0.5 - u * bodyLen;
    const hh = Math.max(0.004, bodyProfile(u, sp));
    const ww = hh * sh.width;
    // Fish backs arch more than bellies drop — shift the section center up a touch.
    const cy = hh * 0.12 * Math.sin(u * Math.PI);
    for (let j = 0; j <= SIDES; j++) {
      const th = (j / SIDES) * TAU;
      positions.push(x, cy + hh * Math.cos(th), ww * Math.sin(th));
      uvs.push(0.03 + u * 0.82, 0.5 + 0.5 * Math.cos(th));
      parts.push(0); flutter.push(0);
    }
  }
  for (let i = 0; i < RINGS; i++) {
    for (let j = 0; j < SIDES; j++) {
      const a = i * (SIDES + 1) + j, b = a + SIDES + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const finStart = positions.length / 3;

  // Helper to add a flat fin sheet from a list of 2D outline points (x, y),
  // triangulated as a fan around the first point. `zOff` places pectorals.
  const addFin = (
    outline: [number, number][], part: number, zOff = 0, zTilt = 0, flutterRoot?: [number, number]
  ) => {
    const base = positions.length / 3;
    for (const [x, y] of outline) {
      positions.push(x, y, zOff + zTilt * Math.abs(x - outline[0][0]));
      uvs.push(0.9, 0.5);
      parts.push(part);
      flutter.push(flutterRoot ? Math.hypot(x - flutterRoot[0], y - flutterRoot[1]) : 0);
    }
    for (let k = 1; k < outline.length - 1; k++) {
      indices.push(base, base + k, base + k + 1);
    }
  };

  // — Caudal (tail) fin — a fan from the peduncle, forked by tailFork.
  {
    const rootX = tailBaseX + 0.02;
    const tipX = -0.5;
    const H = sh.height * (0.55 + sh.tailFork * 0.45) * (sh.finLong ? 1.35 : 1);
    const pts: [number, number][] = [[rootX, 0]];
    const N = 9;
    for (let k = 0; k <= N; k++) {
      const t = k / N;                     // 0 top → 1 bottom of trailing edge
      const y = (0.5 - t) * H;
      // Fork: pull the middle of the trailing edge forward.
      const notch = Math.pow(Math.abs(0.5 - t) * 2, 1.4);
      const x = tipX + (1 - notch) * sh.tailFork * sh.tailSize * 0.85;
      pts.push([x, y]);
    }
    addFin(pts, 1);
  }

  // — Dorsal fin — along the back.
  if (sh.dorsalHeight > 0.02) {
    const u0 = sh.finLong ? 0.28 : 0.34, u1 = sh.finLong ? 0.92 : 0.72;
    const pts: [number, number][] = [];
    const backAt = (u: number) => bodyProfile(u, sp) + bodyProfile(u, sp) * 0.12;
    pts.push([0.5 - u0 * bodyLen, backAt(u0)]);
    const N = 6;
    for (let k = 0; k <= N; k++) {
      const t = k / N, u = u0 + (u1 - u0) * t;
      const raise = Math.sin(Math.PI * Math.min(1, t * 1.4)) ** (sh.finLong ? 0.6 : 1);
      pts.push([0.5 - u * bodyLen, backAt(u) + sh.dorsalHeight * sh.height * raise]);
    }
    pts.push([0.5 - u1 * bodyLen, backAt(u1)]);
    addFin(pts, 2);
  }

  // — Anal fin — mirror of the dorsal, smaller.
  if (sh.analHeight > 0.02) {
    const u0 = 0.55, u1 = 0.85;
    const pts: [number, number][] = [];
    const bellyAt = (u: number) => -bodyProfile(u, sp);
    pts.push([0.5 - u0 * bodyLen, bellyAt(u0)]);
    const N = 5;
    for (let k = 0; k <= N; k++) {
      const t = k / N, u = u0 + (u1 - u0) * t;
      pts.push([0.5 - u * bodyLen, bellyAt(u) - sh.analHeight * sh.height * Math.sin(Math.PI * Math.min(1, t * 1.3))]);
    }
    addFin(pts, 2);
  }

  // — Pectoral fins — small side sheets near the head; these scull/flutter.
  {
    const u = 0.24;
    const x0 = 0.5 - u * bodyLen;
    const ww = bodyProfile(u, sp) * sh.width;
    const L = 0.13 * (sh.finLong ? 1.5 : 1);
    for (const side of [1, -1]) {
      const pts: [number, number][] = [
        [x0, -0.02],
        [x0 - L * 0.35, -0.02 - L * 0.5],
        [x0 - L, -0.03 - L * 0.55],
        [x0 - L * 0.8, -0.01],
      ];
      addFin(pts, 3, side * ww * 0.95, side * 0.25, [x0, -0.02]);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('aPart', new THREE.Float32BufferAttribute(parts, 1));
  geo.setAttribute('aFlutterD', new THREE.Float32BufferAttribute(flutter, 1));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  // Two material groups: body tube (0) and all fins (1).
  const finIndexStart = (() => {
    // Count body indices: RINGS*SIDES*6.
    return RINGS * SIDES * 6;
  })();
  geo.clearGroups();
  geo.addGroup(0, finIndexStart, 0);
  geo.addGroup(finIndexStart, indices.length - finIndexStart, 1);
  void finStart;
  return geo;
}

// Snails: a squashed spiral-ish shell over a low foot. They don't undulate —
// the shader still runs but uMode=3 with amp≈0 keeps them rigid.
function buildSnailGeometry(sp: SpeciesDef): THREE.BufferGeometry {
  const shell = new THREE.SphereGeometry(0.32, 14, 10);
  shell.scale(1, 0.85, 0.8);
  shell.translate(0.02, 0.3, 0);
  const foot = new THREE.CylinderGeometry(0.3, 0.36, 0.14, 12);
  foot.translate(0, 0.07, 0);

  // Merge the two by hand (avoids importing BufferGeometryUtils for one case).
  const geos = [shell, foot];
  const positions: number[] = [], uvs: number[] = [], parts: number[] = [], flutter: number[] = [], indices: number[] = [];
  let offset = 0;
  for (const g of geos) {
    const pos = g.getAttribute('position'), uv = g.getAttribute('uv');
    const idx = g.getIndex()!;
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      uvs.push(uv.getX(i), uv.getY(i));
      parts.push(0); flutter.push(0);
    }
    for (let i = 0; i < idx.count; i++) indices.push(idx.getX(i) + offset);
    offset += pos.count;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('aPart', new THREE.Float32BufferAttribute(parts, 1));
  geo.setAttribute('aFlutterD', new THREE.Float32BufferAttribute(flutter, 1));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.clearGroups();
  geo.addGroup(0, indices.length, 0);
  geo.addGroup(indices.length, 0, 1); // empty fin group keeps material array valid
  return geo;
}
