// Plants, corals and anemones — procedural geometry + vertex-shader motion.
//
// Motion model (RESEARCH.md §4):
//  • Current-driven sway: each vertex carries `aSway` (0 at the root, →1 at the
//    tip). The shader displaces tips with world-coherent sine "flow" so nearby
//    plants move together, plus a static per-plant lean sampled once from the
//    filter jet — plants near the outflow visibly lean downstream.
//  • Pulsing Xenia is different on purpose: its open/close rhythm is
//    SELF-driven (each polyp breathes on its own clock), decoupled from flow.
//  • Hard corals are rigid — their skeleton must never deform.

import * as THREE from 'three';
import type { FloraDef } from '../types';
import { floraById } from '../data/flora';
import { applyUnderwater } from './shaders';
import { CurrentField } from './CurrentField';

const _m = new THREE.Matrix4();
const _c = new THREE.Color();

// Accumulates transformed template geometry into one merged buffer, tracking
// our custom attributes (sway weight, phase, vertex color) per primitive.
class GeoAccum {
  positions: number[] = [];
  normals: number[] = [];
  colors: number[] = [];
  sway: number[] = [];
  phase: number[] = [];
  index: number[] = [];
  private offset = 0;

  // swayFn maps a vertex's LOCAL pre-transform position to a 0..1 sway weight.
  add(geo: THREE.BufferGeometry, matrix: THREE.Matrix4, color: THREE.Color, swayFn: (x: number, y: number, z: number) => number, phase: number): void {
    const pos = geo.getAttribute('position');
    const nor = geo.getAttribute('normal');
    const normalMat = new THREE.Matrix3().getNormalMatrix(matrix);
    const v = new THREE.Vector3();
    const n = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      const lx = pos.getX(i), ly = pos.getY(i), lz = pos.getZ(i);
      v.set(lx, ly, lz).applyMatrix4(matrix);
      n.set(nor.getX(i), nor.getY(i), nor.getZ(i)).applyMatrix3(normalMat).normalize();
      this.positions.push(v.x, v.y, v.z);
      this.normals.push(n.x, n.y, n.z);
      this.colors.push(color.r, color.g, color.b);
      this.sway.push(swayFn(lx, ly, lz));
      this.phase.push(phase);
    }
    const idx = geo.getIndex();
    if (idx) for (let i = 0; i < idx.count; i++) this.index.push(idx.getX(i) + this.offset);
    else for (let i = 0; i < pos.count; i++) this.index.push(i + this.offset);
    this.offset += pos.count;
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
    g.setAttribute('aSway', new THREE.Float32BufferAttribute(this.sway, 1));
    g.setAttribute('aPhase', new THREE.Float32BufferAttribute(this.phase, 1));
    g.setIndex(this.index);
    return g;
  }
}

// Reusable low-poly templates.
const bladeTemplate = new THREE.PlaneGeometry(1, 1, 1, 6);       // tall blade, 6 height segs for smooth bending
const leafTemplate = (() => {
  // A pointed leaf: plane pinched at both ends by shaping X by Y.
  const g = new THREE.PlaneGeometry(1, 1, 2, 7);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) + 0.5; // 0..1 along leaf
    p.setX(i, p.getX(i) * Math.sin(Math.PI * Math.min(1, y * 1.05)));
  }
  g.computeVertexNormals();
  return g;
})();
const coneTemplate = new THREE.ConeGeometry(0.5, 1, 5, 3);
const sphereTemplate = new THREE.SphereGeometry(0.5, 7, 5);
const cylTemplate = new THREE.CylinderGeometry(0.5, 0.6, 1, 6, 2);

const swayPars = /* glsl */ `
  attribute float aSway;
  attribute float aPhase;
  uniform float uSwayAmp;
  uniform float uSwayFreq;
  uniform float uPulse;      // >0 only for self-pulsing corals (Xenia)
  uniform vec2 uLean;        // static lean from the filter jet at this cluster
`;

const swayHook = /* glsl */ `
{
  float sw = aSway * aSway; // quadratic: roots pinned, tips move most
  vec4 wp4 = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    wp4 = instanceMatrix * wp4;
  #endif
  vec3 wp = (modelMatrix * wp4).xyz;
  float t = uTime;
  // World-coherent flow (same spirit as the JS CurrentField): one slow wave
  // traveling across the tank + a faster small flutter.
  float w1 = sin(t * uSwayFreq + wp.x * 2.2 + wp.z * 1.6 + aPhase);
  float w2 = sin(t * uSwayFreq * 2.63 + wp.y * 9.0 + aPhase * 2.7);
  transformed.x += sw * ((w1 * 0.7 + w2 * 0.18) * uSwayAmp + uLean.x);
  transformed.z += sw * ((cos(t * uSwayFreq * 0.81 + wp.x * 1.9 + aPhase) * 0.55 + w2 * 0.12) * uSwayAmp + uLean.y);
  // Self-driven pulsing (Xenia): breathe along the normal, per-polyp phase.
  if (uPulse > 0.0) {
    float breathe = 0.5 + 0.5 * sin(t * 1.35 + aPhase * 6.2831);
    transformed += objectNormal * aSway * uPulse * breathe;
  }
}
`;

interface FloraMotion { swayAmp: number; swayFreq: number; pulse: number }
const MOTION: Record<string, FloraMotion> = {
  stem:      { swayAmp: 0.035, swayFreq: 0.9, pulse: 0 },
  rosette:   { swayAmp: 0.02, swayFreq: 0.8, pulse: 0 },
  carpet:    { swayAmp: 0.008, swayFreq: 1.6, pulse: 0 },
  moss:      { swayAmp: 0.004, swayFreq: 2.2, pulse: 0 },
  floating:  { swayAmp: 0.02, swayFreq: 0.7, pulse: 0 },
  softcoral: { swayAmp: 0.02, swayFreq: 0.7, pulse: 0 },
  xenia:     { swayAmp: 0.008, swayFreq: 0.9, pulse: 0.02 },
  lps:       { swayAmp: 0.028, swayFreq: 1.1, pulse: 0 },
  anemone:   { swayAmp: 0.022, swayFreq: 0.9, pulse: 0.004 },
  zoa:       { swayAmp: 0.006, swayFreq: 1.4, pulse: 0 },
  hardcoral: { swayAmp: 0, swayFreq: 0, pulse: 0 },
};

export class FloraSystem {
  group = new THREE.Group();
  private meshes: THREE.Mesh[] = [];

  constructor(parent: THREE.Object3D) {
    parent.add(this.group);
  }

  rebuild(
    floraCounts: Record<string, number>,
    dims: { halfW: number; halfD: number; floorY: number; surfaceY: number },
    current: CurrentField,
    anchors: THREE.Vector3[],  // rock/wood tops where epiphytes & corals sit
  ): { obstacles: { pos: THREE.Vector3; radius: number }[] } {
    for (const m of this.meshes) {
      this.group.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
    this.meshes = [];
    const obstacles: { pos: THREE.Vector3; radius: number }[] = [];

    let anchorIdx = 0;
    for (const [id, count] of Object.entries(floraCounts)) {
      const def = floraById.get(id);
      if (!def || count <= 0) continue;
      const motion = MOTION[def.kind];
      const acc = new GeoAccum();

      for (let i = 0; i < count; i++) {
        // Placement: floating at surface; corals/epiphytes on rock anchors when
        // available; stems toward the back; carpets toward the front.
        let x: number, z: number, y = dims.floorY;
        const isCoral = ['softcoral', 'xenia', 'lps', 'anemone', 'zoa', 'hardcoral'].includes(def.kind);
        const epiphyte = ['java-fern', 'anubias', 'java-moss'].includes(def.id);
        if (def.kind === 'floating') {
          x = (Math.random() - 0.5) * dims.halfW * 1.7;
          z = (Math.random() - 0.5) * dims.halfD * 1.5;
          y = dims.surfaceY;
        } else if ((isCoral || epiphyte) && anchors.length > 0) {
          const a = anchors[anchorIdx++ % anchors.length];
          x = a.x + (Math.random() - 0.5) * 0.06;
          z = a.z + (Math.random() - 0.5) * 0.06;
          y = a.y;
        } else if (def.kind === 'stem' || def.kind === 'rosette') {
          x = (Math.random() - 0.5) * dims.halfW * 1.8;
          z = -dims.halfD * (0.25 + Math.random() * 0.65); // back half
        } else {
          x = (Math.random() - 0.5) * dims.halfW * 1.7;
          z = dims.halfD * (Math.random() * 1.4 - 0.55);   // mid → front
        }

        const spot = new THREE.Vector3(x, y, z);
        this.buildOne(def, acc, spot, dims);
        if (isCoral) obstacles.push({ pos: spot.clone().add(new THREE.Vector3(0, def.heightM * 0.5, 0)), radius: def.heightM * 0.7 });
      }

      const geo = acc.build();
      const mat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.75,
        metalness: 0,
        side: THREE.DoubleSide,
      });
      // Static lean: sample the current once at the cluster centroid.
      geo.computeBoundingSphere();
      const centroid = geo.boundingSphere?.center ?? new THREE.Vector3();
      const flow = current.sample(centroid, new THREE.Vector3());
      applyUnderwater(mat, {
        caustics: true,
        causticStrength: 0.85,
        vertexPars: swayPars,
        vertexHook: swayHook,
        extraUniforms: {
          uSwayAmp: { value: motion.swayAmp },
          uSwayFreq: { value: motion.swayFreq },
          uPulse: { value: motion.pulse },
          uLean: { value: new THREE.Vector2(flow.x * 0.5, flow.z * 0.5) },
        },
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      this.group.add(mesh);
      this.meshes.push(mesh);
    }
    return { obstacles };
  }

  // Build one plant/coral at `spot` into the accumulator.
  private buildOne(def: FloraDef, acc: GeoAccum, spot: THREE.Vector3, dims: { floorY: number; surfaceY: number }): void {
    // Cap height so nothing pokes out of the water — vallisneria in a shallow
    // tank bends at the surface in real life; here we just grow it shorter.
    const waterH = dims.surfaceY - dims.floorY;
    const H = Math.min(def.heightM * (0.75 + Math.random() * 0.5), waterH * 0.88);
    // Deep, slightly desaturated tones read as living tissue instead of neon.
    const colors = def.colors.map((c) => new THREE.Color(c).multiplyScalar(0.72));
    const pick = () => colors[Math.floor(Math.random() * colors.length)];
    const phase = Math.random();
    // Sway weight from local height (templates are unit-height centered at 0).
    const byHeight = (_x: number, y: number) => THREE.MathUtils.clamp(y + 0.5, 0, 1);

    switch (def.kind) {
      case 'stem': {
        // A cluster of tall grass ribbons (vallisneria).
        const blades = 5 + Math.floor(Math.random() * 5);
        for (let b = 0; b < blades; b++) {
          const h = H * (0.7 + Math.random() * 0.5);
          _m.compose(
            new THREE.Vector3(spot.x + (Math.random() - 0.5) * 0.05, spot.y + h / 2, spot.z + (Math.random() - 0.5) * 0.05),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.random() * Math.PI, (Math.random() - 0.5) * 0.15)),
            new THREE.Vector3(0.012 + Math.random() * 0.006, h, 1)
          );
          acc.add(bladeTemplate, _m, _c.copy(pick()).multiplyScalar(0.8 + Math.random() * 0.4), byHeight, phase + b * 0.13);
        }
        break;
      }
      case 'rosette': {
        // Radial leaves from a crown (sword, crypt, anubias, java fern).
        const leaves = 7 + Math.floor(Math.random() * 6);
        for (let l = 0; l < leaves; l++) {
          const ang = (l / leaves) * Math.PI * 2 + Math.random() * 0.5;
          const lean = 0.35 + Math.random() * 0.55;       // outward arch
          const h = H * (0.75 + Math.random() * 0.45);
          _m.compose(
            new THREE.Vector3(spot.x + Math.cos(ang) * 0.015, spot.y + h / 2 * Math.cos(lean * 0.8), spot.z + Math.sin(ang) * 0.015),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.sin(ang) * lean, -ang, Math.cos(ang) * lean, 'YXZ')),
            new THREE.Vector3(h * (def.id === 'amazon-sword' ? 0.3 : def.id === 'anubias' ? 0.55 : 0.35), h, 1)
          );
          acc.add(leafTemplate, _m, _c.copy(pick()).multiplyScalar(0.75 + Math.random() * 0.5), byHeight, phase + l * 0.11);
        }
        break;
      }
      case 'carpet': {
        // A tuft of tiny blades; many tufts of the same species = a lawn.
        const blades = 24;
        for (let b = 0; b < blades; b++) {
          const h = H * (0.6 + Math.random() * 0.8);
          _m.compose(
            new THREE.Vector3(spot.x + (Math.random() - 0.5) * 0.09, spot.y + h / 2, spot.z + (Math.random() - 0.5) * 0.09),
            new THREE.Quaternion().setFromEuler(new THREE.Euler((Math.random() - 0.5) * 0.4, Math.random() * Math.PI, (Math.random() - 0.5) * 0.4)),
            new THREE.Vector3(0.004, h, 1)
          );
          acc.add(bladeTemplate, _m, _c.copy(pick()).multiplyScalar(0.8 + Math.random() * 0.5), byHeight, Math.random());
        }
        break;
      }
      case 'moss': {
        // A cushion of small randomly-oriented fronds.
        for (let b = 0; b < 30; b++) {
          _m.compose(
            new THREE.Vector3(spot.x + (Math.random() - 0.5) * 0.08, spot.y + Math.random() * H, spot.z + (Math.random() - 0.5) * 0.08),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)),
            new THREE.Vector3(0.014, 0.02, 1)
          );
          acc.add(leafTemplate, _m, _c.copy(pick()).multiplyScalar(0.6 + Math.random() * 0.7), () => 0.4 + Math.random() * 0.4, Math.random());
        }
        break;
      }
      case 'floating': {
        // Surface rosette + dangling roots.
        const leaves = 5 + Math.floor(Math.random() * 3);
        for (let l = 0; l < leaves; l++) {
          const ang = (l / leaves) * Math.PI * 2;
          _m.compose(
            new THREE.Vector3(spot.x + Math.cos(ang) * 0.018, spot.y - 0.004, spot.z + Math.sin(ang) * 0.018),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2 + 0.15, -ang, 0, 'YXZ')),
            new THREE.Vector3(0.03, 0.035, 1)
          );
          acc.add(leafTemplate, _m, _c.copy(pick()), () => 0.15, phase);
        }
        for (let r = 0; r < 5; r++) {
          const len = 0.05 + Math.random() * H;
          _m.compose(
            new THREE.Vector3(spot.x + (Math.random() - 0.5) * 0.02, spot.y - len / 2, spot.z + (Math.random() - 0.5) * 0.02),
            new THREE.Quaternion(),
            new THREE.Vector3(0.0015, len, 1)
          );
          // Roots sway MORE at the bottom (inverted weight).
          acc.add(bladeTemplate, _m, _c.set('#c8c0a0'), (_x, y) => 1 - (y + 0.5), Math.random());
        }
        break;
      }
      case 'softcoral': {
        // Trunk + branch knobs (kenya tree) or cap (toadstool).
        const trunkH = H * 0.5;
        _m.compose(new THREE.Vector3(spot.x, spot.y + trunkH / 2, spot.z), new THREE.Quaternion(), new THREE.Vector3(H * 0.22, trunkH, H * 0.22));
        acc.add(cylTemplate, _m, _c.copy(pick()).multiplyScalar(0.85), byHeight, phase);
        if (def.id === 'toadstool') {
          _m.compose(new THREE.Vector3(spot.x, spot.y + trunkH + H * 0.08, spot.z), new THREE.Quaternion(), new THREE.Vector3(H * 0.85, H * 0.22, H * 0.85));
          acc.add(sphereTemplate, _m, _c.copy(pick()), () => 0.75, phase + 0.3);
        } else {
          for (let b = 0; b < 8; b++) {
            const ang = Math.random() * Math.PI * 2, r = Math.random() * H * 0.3;
            _m.compose(
              new THREE.Vector3(spot.x + Math.cos(ang) * r, spot.y + trunkH + Math.random() * H * 0.4, spot.z + Math.sin(ang) * r),
              new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random(), Math.random(), Math.random())),
              new THREE.Vector3(H * 0.28, H * 0.3, H * 0.28)
            );
            acc.add(sphereTemplate, _m, _c.copy(pick()).multiplyScalar(0.8 + Math.random() * 0.4), () => 0.7 + Math.random() * 0.3, Math.random());
          }
        }
        break;
      }
      case 'xenia': {
        // Stalks tipped with feathery "hands" that pulse open/closed.
        const stalks = 5 + Math.floor(Math.random() * 4);
        for (let s = 0; s < stalks; s++) {
          const sx = spot.x + (Math.random() - 0.5) * 0.05, sz = spot.z + (Math.random() - 0.5) * 0.05;
          const h = H * (0.6 + Math.random() * 0.5);
          _m.compose(new THREE.Vector3(sx, spot.y + h / 2, sz), new THREE.Quaternion(), new THREE.Vector3(0.008, h, 0.008));
          acc.add(cylTemplate, _m, _c.copy(pick()).multiplyScalar(0.8), byHeight, s * 0.17);
          // The polyp hand: a small sphere whose vertices breathe along normals.
          _m.compose(new THREE.Vector3(sx, spot.y + h + 0.008, sz), new THREE.Quaternion(), new THREE.Vector3(0.028, 0.02, 0.028));
          acc.add(sphereTemplate, _m, _c.copy(pick()), () => 1, s * 0.17 + Math.random() * 0.1);
        }
        break;
      }
      case 'lps': {
        // Dense cluster of long flowing tentacles (hammer/torch coral).
        for (let tnt = 0; tnt < 26; tnt++) {
          const ang = Math.random() * Math.PI * 2, r = Math.random() * H * 0.45;
          const h = H * (0.7 + Math.random() * 0.6);
          _m.compose(
            new THREE.Vector3(spot.x + Math.cos(ang) * r, spot.y + h / 2, spot.z + Math.sin(ang) * r),
            new THREE.Quaternion().setFromEuler(new THREE.Euler((Math.random() - 0.5) * 0.7, 0, (Math.random() - 0.5) * 0.7)),
            new THREE.Vector3(0.014, h, 0.014)
          );
          acc.add(coneTemplate, _m, _c.copy(pick()).multiplyScalar(0.8 + Math.random() * 0.5), byHeight, Math.random());
        }
        break;
      }
      case 'anemone': {
        // Dome base + a crown of bulb-tipped tentacles.
        _m.compose(new THREE.Vector3(spot.x, spot.y + H * 0.12, spot.z), new THREE.Quaternion(), new THREE.Vector3(H * 0.7, H * 0.3, H * 0.7));
        acc.add(sphereTemplate, _m, _c.copy(colors[0]).multiplyScalar(0.7), () => 0.1, phase);
        for (let tnt = 0; tnt < 34; tnt++) {
          const ang = Math.random() * Math.PI * 2, r = Math.random() * H * 0.32;
          const h = H * (0.5 + Math.random() * 0.55);
          _m.compose(
            new THREE.Vector3(spot.x + Math.cos(ang) * r, spot.y + H * 0.2 + h / 2, spot.z + Math.sin(ang) * r),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.cos(ang) * 0.5, 0, -Math.sin(ang) * 0.5)),
            new THREE.Vector3(0.016, h, 0.016)
          );
          acc.add(coneTemplate, _m, _c.copy(colors[1 % colors.length]).multiplyScalar(0.85 + Math.random() * 0.35), byHeight, Math.random());
        }
        break;
      }
      case 'zoa': {
        // A mat of little button polyps in mixed neon colors.
        for (let p = 0; p < 22; p++) {
          const px = spot.x + (Math.random() - 0.5) * 0.09, pz = spot.z + (Math.random() - 0.5) * 0.09;
          const h = H * (0.6 + Math.random() * 0.6);
          _m.compose(new THREE.Vector3(px, spot.y + h / 2, pz), new THREE.Quaternion(), new THREE.Vector3(0.006, h, 0.006));
          acc.add(cylTemplate, _m, _c.set('#7a6a58'), byHeight, Math.random());
          _m.compose(new THREE.Vector3(px, spot.y + h, pz), new THREE.Quaternion(), new THREE.Vector3(0.02, 0.005, 0.02));
          acc.add(sphereTemplate, _m, _c.copy(pick()), () => 0.9, Math.random());
        }
        break;
      }
      case 'hardcoral': {
        if (def.id === 'brain-coral') {
          _m.compose(new THREE.Vector3(spot.x, spot.y + H * 0.4, spot.z), new THREE.Quaternion(), new THREE.Vector3(H * 1.6, H * 0.8, H * 1.4));
          acc.add(sphereTemplate, _m, _c.copy(pick()), () => 0, phase);
        } else if (def.id === 'montipora-plate') {
          for (let p = 0; p < 3; p++) {
            _m.compose(
              new THREE.Vector3(spot.x + (Math.random() - 0.5) * 0.04, spot.y + H * (0.3 + p * 0.3), spot.z + (Math.random() - 0.5) * 0.04),
              new THREE.Quaternion().setFromEuler(new THREE.Euler((Math.random() - 0.5) * 0.3, Math.random(), (Math.random() - 0.5) * 0.3)),
              new THREE.Vector3(H * (1.5 - p * 0.3), H * 0.08, H * (1.5 - p * 0.3))
            );
            acc.add(sphereTemplate, _m, _c.copy(pick()).multiplyScalar(0.85 + p * 0.12), () => 0, phase);
          }
        } else {
          // Acropora: rigid branching — trunk + angled branch cones.
          for (let b = 0; b < 12; b++) {
            const ang = Math.random() * Math.PI * 2, r = Math.random() * H * 0.35;
            const h = H * (0.5 + Math.random() * 0.7);
            _m.compose(
              new THREE.Vector3(spot.x + Math.cos(ang) * r, spot.y + h / 2, spot.z + Math.sin(ang) * r),
              new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.cos(ang) * 0.45, 0, -Math.sin(ang) * 0.45)),
              new THREE.Vector3(0.02, h, 0.02)
            );
            acc.add(coneTemplate, _m, _c.copy(pick()).multiplyScalar(0.75 + Math.random() * 0.5), () => 0, Math.random());
          }
        }
        break;
      }
    }
  }
}
