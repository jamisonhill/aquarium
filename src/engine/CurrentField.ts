// The water current field (RESEARCH.md §4.3) — the single source of truth for
// "which way is the water pushing" at any point. One filter-return jet plus a
// gentle curl-noise ambient drift. Plants sample an equivalent formula in their
// vertex shader; fish sample this JS version for drift + rheotaxis (facing
// into the current). Sharing one field makes the whole tank feel like a single
// coherent body of water.

import * as THREE from 'three';

const _tmp = new THREE.Vector3();

export class CurrentField {
  jetOrigin = new THREE.Vector3();
  jetDir = new THREE.Vector3(1, -0.15, 0.2).normalize();
  jetStrength = 0.16;   // m/s at the nozzle
  ambient = 0.02;       // background drift magnitude
  time = 0;

  // Reconfigure for a new tank: the filter outflow sits at the top-back-left
  // corner, blowing across the tank — the standard real-world placement.
  setup(width: number, height: number, depth: number): void {
    this.jetOrigin.set(-width * 0.46, height * 0.82, -depth * 0.3);
    this.jetDir.set(1, -0.18, 0.35).normalize();
    this.jetStrength = 0.1 + width * 0.06;
  }

  // Velocity at a world point, written into `out`.
  sample(p: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
    // Jet: a cone of flow that decays with distance and off-axis angle.
    _tmp.copy(p).sub(this.jetOrigin);
    const along = _tmp.dot(this.jetDir);
    out.set(0, 0, 0);
    if (along > 0) {
      const radial = Math.sqrt(Math.max(0, _tmp.lengthSq() - along * along));
      const spread = 0.08 + along * 0.45;                  // cone widens downstream
      const axial = Math.exp(-along * 1.6);                // decays with distance
      const off = Math.exp(-(radial * radial) / (spread * spread));
      out.copy(this.jetDir).multiplyScalar(this.jetStrength * axial * off);
    }
    // Ambient curl-ish drift: two out-of-phase sine fields — cheap, divergence-
    // light, and identical in spirit to what the plant shader computes.
    const t = this.time * 0.3;
    out.x += Math.sin(p.y * 3.1 + t + p.z * 2.0) * this.ambient;
    out.y += Math.sin(p.x * 2.3 + t * 1.3) * this.ambient * 0.35;
    out.z += Math.cos(p.x * 2.7 - t + p.y * 1.7) * this.ambient;
    return out;
  }
}
