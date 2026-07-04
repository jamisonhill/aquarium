// Hardscape & props: driftwood, rocks, reef rock, and the playful classics.
// Everything is assembled from displaced primitives + procedural textures.
// Decor also feeds the simulation: it exports obstacle spheres (fish steer
// around them), shelter points (nocturnal/ambush fish hide there), and anchor
// points (corals and epiphyte plants attach there).

import * as THREE from 'three';
import { applyUnderwater } from './shaders';
import { rockTexture, woodTexture } from './textures';

export interface DecorOutput {
  obstacles: { pos: THREE.Vector3; radius: number }[];
  shelters: THREE.Vector3[];
  anchors: THREE.Vector3[];
  airstone: THREE.Vector3 | null;
}

// Displace a sphere/icosahedron radially with hash noise → believable rock.
function displace(geo: THREE.BufferGeometry, amount: number, seed = 1): THREE.BufferGeometry {
  const pos = geo.getAttribute('position');
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.set(pos.getX(i), pos.getY(i), pos.getZ(i));
    const n = Math.sin(v.x * 12.3 * seed + v.y * 7.7) * Math.cos(v.z * 9.1 - v.y * 5.3) * 0.5
      + Math.sin(v.x * 27.1 + v.z * 19.7) * 0.25;
    v.multiplyScalar(1 + n * amount);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

export class DecorSystem {
  group = new THREE.Group();
  private materials: THREE.Material[] = [];

  constructor(parent: THREE.Object3D) {
    parent.add(this.group);
  }

  private mat(opts: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial {
    const m = new THREE.MeshStandardMaterial(opts);
    applyUnderwater(m, { caustics: true, causticStrength: 1 });
    this.materials.push(m);
    return m;
  }

  rebuild(decorIds: string[], dims: { halfW: number; halfD: number; floorY: number; height: number }): DecorOutput {
    this.group.clear();
    for (const m of this.materials) m.dispose();
    this.materials = [];

    const out: DecorOutput = { obstacles: [], shelters: [], anchors: [], airstone: null };
    const { halfW, halfD, floorY } = dims;
    const scale = Math.min(1.2, halfW * 1.6); // props scale with tank size

    for (const id of decorIds) {
      switch (id) {
        case 'driftwood': {
          // A main bough with two branches, arching across the left third.
          const wood = this.mat({ map: woodTexture(), color: '#8a6844', roughness: 0.85 });
          const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-halfW * 0.7, floorY, -halfD * 0.2),
            new THREE.Vector3(-halfW * 0.3, floorY + dims.height * 0.35, 0),
            new THREE.Vector3(halfW * 0.15, floorY + dims.height * 0.55, halfD * 0.25),
          ]);
          const bough = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.02 * scale + 0.008, 7), wood);
          this.group.add(bough);
          for (let b = 0; b < 2; b++) {
            const t0 = 0.35 + b * 0.3;
            const p0 = curve.getPoint(t0);
            const branch = new THREE.CatmullRomCurve3([
              p0,
              p0.clone().add(new THREE.Vector3((b ? 1 : -1) * halfW * 0.2, dims.height * 0.18, (b ? -1 : 1) * halfD * 0.25)),
            ]);
            this.group.add(new THREE.Mesh(new THREE.TubeGeometry(branch, 8, 0.012 * scale + 0.004, 6), wood));
          }
          const mid = curve.getPoint(0.5);
          out.obstacles.push({ pos: mid, radius: 0.1 * scale });
          out.shelters.push(new THREE.Vector3(-halfW * 0.5, floorY + 0.02, -halfD * 0.1));
          out.anchors.push(curve.getPoint(0.3), curve.getPoint(0.7));
          break;
        }
        case 'river-rocks': {
          const rock = this.mat({ map: rockTexture('#5e5852'), roughness: 0.9 });
          for (let i = 0; i < 5; i++) {
            const r = (0.03 + Math.random() * 0.05) * scale + 0.015;
            const g = displace(new THREE.SphereGeometry(r, 10, 8), 0.25, i + 2);
            const m = new THREE.Mesh(g, rock);
            m.position.set(halfW * (0.15 + Math.random() * 0.5), floorY + r * 0.55, halfD * (Math.random() * 0.8 - 0.5));
            m.rotation.set(Math.random(), Math.random() * Math.PI, Math.random());
            this.group.add(m);
            out.obstacles.push({ pos: m.position.clone(), radius: r * 1.1 });
            out.anchors.push(m.position.clone().add(new THREE.Vector3(0, r * 0.8, 0)));
          }
          break;
        }
        case 'slate-stack': {
          const slate = this.mat({ map: rockTexture('#565a60'), roughness: 0.8 });
          const cx = -halfW * 0.45, cz = halfD * 0.15;
          let y = floorY;
          for (let i = 0; i < 3; i++) {
            const w = (0.16 - i * 0.03) * scale + 0.04, d = (0.12 - i * 0.02) * scale + 0.03, h = 0.014 * scale + 0.006;
            const m = new THREE.Mesh(displace(new THREE.BoxGeometry(w, h, d, 4, 1, 4), 0.08, i + 5), slate);
            m.position.set(cx + (Math.random() - 0.5) * 0.03, y + h / 2 + (i > 0 ? 0.02 : 0), cz + (Math.random() - 0.5) * 0.03);
            m.rotation.y = Math.random() * 0.6;
            this.group.add(m);
            y = m.position.y + h / 2;
          }
          out.obstacles.push({ pos: new THREE.Vector3(cx, y, cz), radius: 0.12 * scale });
          out.shelters.push(new THREE.Vector3(cx, floorY + 0.025, cz + 0.05)); // the cave gap
          out.anchors.push(new THREE.Vector3(cx, y + 0.01, cz));
          break;
        }
        case 'reef-rock': {
          // A porous rock wall across the back — the reef's skeleton.
          const rockMat = this.mat({ map: rockTexture('#6a625a'), roughness: 0.95 });
          for (let i = 0; i < 7; i++) {
            const r = (0.06 + Math.random() * 0.09) * scale + 0.02;
            const g = displace(new THREE.SphereGeometry(r, 12, 9), 0.45, i * 1.7 + 1);
            const m = new THREE.Mesh(g, rockMat);
            const x = -halfW * 0.8 + (i / 6) * halfW * 1.6;
            m.position.set(x + (Math.random() - 0.5) * 0.06, floorY + r * (0.4 + Math.random() * 0.5), -halfD * (0.35 + Math.random() * 0.3));
            m.rotation.set(Math.random(), Math.random() * Math.PI, Math.random());
            this.group.add(m);
            out.obstacles.push({ pos: m.position.clone(), radius: r });
            out.shelters.push(m.position.clone().add(new THREE.Vector3(0.03, r * 0.3, r * 0.9)));
            out.anchors.push(m.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * r, r * 0.85, (Math.random() - 0.5) * r * 0.5)));
          }
          break;
        }
        case 'sunken-ship': {
          const hullMat = this.mat({ map: woodTexture(), color: '#7a6a52', roughness: 0.9 });
          const ship = new THREE.Group();
          // Hull: a stretched, pointed box; listing to one side in the sand.
          const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.045 * scale + 0.02, 0.22 * scale + 0.06, 4, 8), hullMat);
          hull.scale.set(1, 0.7, 1.4);
          hull.rotation.z = Math.PI / 2;
          ship.add(hull);
          const deckhouse = new THREE.Mesh(new THREE.BoxGeometry(0.07 * scale + 0.02, 0.04 * scale + 0.01, 0.05 * scale + 0.015), hullMat);
          deckhouse.position.y = 0.045 * scale + 0.015;
          ship.add(deckhouse);
          for (const mx of [-0.07, 0.05]) {
            const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.006, 0.18 * scale + 0.05, 5), hullMat);
            mast.position.set(mx * scale, 0.1 * scale + 0.03, 0);
            mast.rotation.z = 0.15;
            ship.add(mast);
          }
          ship.position.set(halfW * 0.45, floorY + 0.03 * scale, -halfD * 0.15);
          ship.rotation.set(0.18, -0.5, -0.28); // wrecked list
          this.group.add(ship);
          out.obstacles.push({ pos: ship.position.clone(), radius: 0.16 * scale });
          out.shelters.push(ship.position.clone().add(new THREE.Vector3(0, 0.02, 0.08)));
          break;
        }
        case 'castle': {
          const stone = this.mat({ map: rockTexture('#8a8288'), roughness: 0.85 });
          const castle = new THREE.Group();
          const keep = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * scale + 0.015, 0.06 * scale + 0.02, 0.16 * scale + 0.05, 8), stone);
          keep.position.y = 0.08 * scale + 0.025;
          castle.add(keep);
          const roof = new THREE.Mesh(new THREE.ConeGeometry(0.055 * scale + 0.018, 0.06 * scale + 0.02, 8), this.mat({ color: '#5a4a7a', roughness: 0.7 }));
          roof.position.y = 0.19 * scale + 0.06;
          castle.add(roof);
          for (const [tx, tz] of [[-0.07, 0.04], [0.07, 0.04], [0, -0.07]] as const) {
            const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.02 * scale + 0.008, 0.025 * scale + 0.01, 0.1 * scale + 0.03, 7), stone);
            tower.position.set(tx * scale, 0.05 * scale + 0.015, tz * scale);
            castle.add(tower);
            const tr = new THREE.Mesh(new THREE.ConeGeometry(0.024 * scale + 0.009, 0.035 * scale + 0.012, 7), roof.material);
            tr.position.set(tx * scale, 0.115 * scale + 0.038, tz * scale);
            castle.add(tr);
          }
          castle.position.set(-halfW * 0.15, floorY, halfD * 0.3);
          castle.rotation.y = 0.4;
          this.group.add(castle);
          out.obstacles.push({ pos: castle.position.clone().add(new THREE.Vector3(0, 0.08 * scale, 0)), radius: 0.13 * scale });
          out.shelters.push(castle.position.clone().add(new THREE.Vector3(0.06 * scale, 0.02, 0.03)));
          break;
        }
        case 'airstone': {
          const stoneMat = this.mat({ map: rockTexture('#b8b4ac'), roughness: 1 });
          const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.02, 10), stoneMat);
          stone.position.set(halfW * 0.72, floorY + 0.01, -halfD * 0.55);
          this.group.add(stone);
          out.airstone = stone.position.clone();
          break;
        }
      }
    }
    return out;
  }
}
