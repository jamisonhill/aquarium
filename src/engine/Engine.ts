// The engine: owns the renderer, render loop, and all subsystems. Deliberately
// decoupled from React — the UI talks to it through plain method calls and
// callbacks, and it never touches React state directly.

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

import type { QualityTier, TankConfig } from '../types';
import { tankDims } from '../data/tanks';
import { installUnderwaterFog, SharedUniforms } from './shaders';
import { markReady } from '../platform/native';
import { QUALITY, detectQuality, type QualitySettings } from './quality';
import { CameraRig } from './CameraRig';
import { CurrentField } from './CurrentField';
import { EnvironmentSystem, type TankDimsWorld } from './Environment';
import { DecorSystem } from './Decor';
import { FloraSystem } from './Flora';
import { FishSystem, type SimEnv } from './FishSystem';

export interface EngineCallbacks {
  onFishPicked?: (key: string | null) => void;
  onAutoQuality?: (tier: QualityTier) => void;
  onFed?: () => void;
}

export class Engine {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  rig: CameraRig;
  callbacks: EngineCallbacks = {};

  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private environment: EnvironmentSystem;
  private decor: DecorSystem;
  private flora: FloraSystem;
  private fish: FishSystem;
  private current = new CurrentField();
  private clock = new THREE.Clock();
  private simEnv: SimEnv;
  private dims: TankDimsWorld = { halfW: 0.5, halfD: 0.25, height: 0.5, floorY: 0, surfaceY: 0.48 };
  private config: TankConfig | null = null;
  private quality: QualitySettings = QUALITY.medium;
  private requestedTier: QualityTier | 'auto' = 'auto';
  private dayFactor = 1;
  private raycaster = new THREE.Raycaster();
  private running = true;
  private firstFrameDone = false;
  private disposed = false;
  private frameTimes: number[] = [];
  private feedMode = false;
  private lastCycleT = 0;
  // FPS + draw call counters for the dev HUD.
  stats = { fps: 60, drawCalls: 0, triangles: 0, fishCount: 0 };

  constructor(private container: HTMLElement) {
    // Must run BEFORE any material compiles — swaps Three's fog for our
    // per-channel underwater absorption.
    installUnderwaterFog();

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;';

    // Image-based lighting from a neutral procedural "room" — gives PBR
    // materials something real to reflect without shipping an HDRI file.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.06).texture;
    pmrem.dispose();
    this.scene.background = new THREE.Color('#04141f');

    this.rig = new CameraRig(this.renderer.domElement, 1);
    this.environment = new EnvironmentSystem(this.scene);
    this.decor = new DecorSystem(this.scene);
    this.flora = new FloraSystem(this.scene);
    this.fish = new FishSystem(this.scene);

    this.simEnv = {
      time: 0, dayFactor: 1,
      halfW: 0.5, halfD: 0.25, floorY: 0, surfaceY: 0.48,
      current: this.current,
      reducedMotion: false,
      obstacles: [], shelters: [],
    };

    // Resolve 'auto' quality once the GL context exists.
    this.quality = QUALITY[detectQuality(this.renderer)];
    this.applySize();

    window.addEventListener('resize', this.applySize);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.renderer.domElement.addEventListener('pointerup', this.onClick);

    this.renderer.setAnimationLoop(this.tick);
  }

  dispose(): void {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    window.removeEventListener('resize', this.applySize);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.renderer.domElement.removeEventListener('pointerup', this.onClick);
    this.rig.dispose();
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }

  private onVisibility = (): void => {
    // Pause the sim when the tab is hidden (saves battery; clock clamp
    // prevents a physics jump when we come back).
    this.running = document.visibilityState === 'visible';
  };

  private applySize = (): void => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, this.quality.pixelRatioCap);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h);
    this.rig.camera.aspect = w / h;
    this.rig.camera.updateProjectionMatrix();
    this.rebuildComposer(w, h);
  };

  private rebuildComposer(w: number, h: number): void {
    this.composer?.dispose();
    if (this.quality.bloom) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.rig.camera));
      this.bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.32, 0.6, 0.82);
      this.composer.addPass(this.bloomPass);
      this.composer.addPass(new OutputPass());
      this.composer.setSize(w, h);
    } else {
      this.composer = null;
      this.bloomPass = null;
    }
  }

  setQuality(tier: QualityTier | 'auto'): void {
    this.requestedTier = tier;
    const resolved = tier === 'auto' ? detectQuality(this.renderer) : tier;
    if (QUALITY[resolved].tier === this.quality.tier) return;
    this.quality = QUALITY[resolved];
    this.applySize();
    if (this.config) this.applyConfig(this.config, true); // rebuild particles/fish caps
  }

  setReducedMotion(on: boolean): void {
    this.simEnv.reducedMotion = on;
    this.rig.reducedMotion = on;
  }

  setFeedMode(on: boolean): void { this.feedMode = on; }

  setCameraMode(mode: 'orbit' | 'cinematic' | 'still' | 'follow'): void {
    this.rig.setMode(mode);
    if (mode !== 'follow') {
      this.rig.releaseFollow(this.dims.floorY + this.dims.height * 0.5);
    }
  }

  followFish(key: string | null): void {
    if (!key) {
      this.rig.releaseFollow(this.dims.floorY + this.dims.height * 0.5);
      if (this.rig.mode === 'follow') this.rig.setMode('orbit');
      return;
    }
    const found = this.fish.findByKey(key);
    if (found) {
      this.rig.followTarget = () => this.fish.findByKey(key)?.agent.pos ?? null;
      this.rig.setMode('follow');
    }
  }

  // Apply a tank config, rebuilding only what changed (structure vs. stock).
  private lastStructureKey = '';
  private lastFishKey = '';
  applyConfig(config: TankConfig, force = false): void {
    const structureKey = JSON.stringify([
      config.water, Math.round(config.gallons * 10), config.substrate,
      config.background, config.lighting, config.decor, config.flora, this.quality.tier,
    ]);
    const fishKey = JSON.stringify(config.fish) + this.quality.tier;
    const structureChanged = force || structureKey !== this.lastStructureKey;
    const fishChanged = force || structureChanged || fishKey !== this.lastFishKey;
    this.config = config;

    if (structureChanged) {
      this.lastStructureKey = structureKey;
      const d = tankDims(config.gallons);
      this.dims = {
        halfW: d.width / 2,
        halfD: d.depth / 2,
        height: d.height,
        floorY: 0,
        surfaceY: d.height * 0.94, // waterline sits a touch below the rim
      };
      Object.assign(this.simEnv, {
        halfW: this.dims.halfW, halfD: this.dims.halfD,
        floorY: this.dims.floorY, surfaceY: this.dims.surfaceY,
      });
      this.current.setup(d.width, d.height, d.depth);

      const decorOut = this.decor.rebuild(config.decor, {
        halfW: this.dims.halfW, halfD: this.dims.halfD,
        floorY: this.dims.floorY, height: this.dims.height,
      });
      const floraOut = this.flora.rebuild(
        config.flora,
        { halfW: this.dims.halfW, halfD: this.dims.halfD, floorY: this.dims.floorY, surfaceY: this.dims.surfaceY },
        this.current,
        decorOut.anchors,
      );
      this.simEnv.obstacles = [...decorOut.obstacles, ...floraOut.obstacles];
      this.simEnv.shelters = decorOut.shelters;

      this.environment.rebuild(
        this.dims, config.water, config.substrate, config.background, config.lighting,
        this.quality, decorOut.airstone,
      );
      SharedUniforms.uSurfaceY.value = this.dims.surfaceY;
      this.rig.frameTank(this.dims.halfW, this.dims.height, this.dims.floorY + this.dims.height * 0.52);
    }

    if (fishChanged) {
      this.lastFishKey = fishKey;
      this.fish.rebuild(config.fish, this.simEnv, this.quality.maxFish);
    }
  }

  // Drop food at screen coordinates (raycast onto the water surface plane).
  feedAt(clientX: number, clientY: number): boolean {
    const ndc = this.toNdc(clientX, clientY);
    this.raycaster.setFromCamera(ndc, this.rig.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), this.dims.surfaceY);
    const hit = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(plane, hit)) {
      const x = THREE.MathUtils.clamp(hit.x, -this.dims.halfW * 0.9, this.dims.halfW * 0.9);
      const z = THREE.MathUtils.clamp(hit.z, -this.dims.halfD * 0.9, this.dims.halfD * 0.9);
      this.fish.feed(x, z, this.simEnv);
      this.callbacks.onFed?.();
      return true;
    }
    return false;
  }

  private toNdc(clientX: number, clientY: number): THREE.Vector2 {
    const rect = this.renderer.domElement.getBoundingClientRect();
    return new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
  }

  private onClick = (e: PointerEvent): void => {
    // Ignore if this was a drag, not a tap.
    if (this.rig.lastPointerTravel > 8) return;
    // 1) Try picking a fish.
    const ndc = this.toNdc(e.clientX, e.clientY);
    this.raycaster.setFromCamera(ndc, this.rig.camera);
    const meshes = this.fish.populations.map((p) => p.mesh);
    const hits = this.raycaster.intersectObjects(meshes, false);
    if (hits.length > 0 && hits[0].instanceId !== undefined) {
      const speciesId = hits[0].object.userData.speciesId as string;
      const agent = this.fish.agentAt(speciesId, hits[0].instanceId);
      if (agent) {
        this.callbacks.onFishPicked?.(agent.key);
        return;
      }
    }
    // 2) Feed mode: tap drops food.
    if (this.feedMode) {
      this.feedAt(e.clientX, e.clientY);
      return;
    }
    // 3) Tap on nothing clears the selection.
    this.callbacks.onFishPicked?.(null);
  };

  // Compute the day/night factor for the current mode.
  private targetDayFactor(): number {
    const mode = this.config?.dayNight ?? 'day';
    switch (mode) {
      case 'day': return 1;
      case 'night': return 0;
      case 'realtime': {
        const h = new Date().getHours() + new Date().getMinutes() / 60;
        // Dawn 6–8, day 8–18, dusk 18–21, night otherwise.
        if (h >= 8 && h < 18) return 1;
        if (h >= 6 && h < 8) return (h - 6) / 2;
        if (h >= 18 && h < 21) return 1 - (h - 18) / 3;
        return 0;
      }
      case 'cycle': {
        // A full day every 4 minutes: generous daytime, brief warm dusk,
        // a stretch of moonlight. lastCycleT accumulates in tick().
        const t = (this.lastCycleT % 240) / 240;
        if (t < 0.55) return 1;
        if (t < 0.62) return 1 - (t - 0.55) / 0.07;
        if (t < 0.93) return 0;
        return (t - 0.93) / 0.07;
      }
    }
  }

  screenshot(): string {
    // Render fresh, then read pixels in the same task (buffer isn't preserved).
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.rig.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  fishPosition(key: string): THREE.Vector3 | null {
    return this.fish.findByKey(key)?.agent.pos ?? null;
  }

  private tick = (): void => {
    if (this.disposed) return;
    const dt = Math.min(this.clock.getDelta(), 0.1);
    if (!this.running) return;

    const t = SharedUniforms.uTime.value + dt;
    SharedUniforms.uTime.value = t;
    this.lastCycleT += dt;
    this.simEnv.time = t;
    this.current.time = t;

    // Smoothly chase the target day factor (sunrise takes a few seconds).
    this.dayFactor = THREE.MathUtils.damp(this.dayFactor, this.targetDayFactor(), 0.5, dt);
    this.simEnv.dayFactor = this.dayFactor;

    this.fish.update(dt, this.simEnv);
    this.environment.update(this.dayFactor, this.rig.camera);
    this.rig.update(dt);

    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.rig.camera);

    // First rendered frame → readiness flag (polled by the iOS app's tests).
    if (!this.firstFrameDone) {
      this.firstFrameDone = true;
      markReady();
    }

    // — Stats + automatic quality downgrade —
    this.frameTimes.push(dt);
    if (this.frameTimes.length >= 60) {
      const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
      this.stats.fps = Math.round(1 / avg);
      this.frameTimes = [];
      // If the user asked for 'auto' and we can't hold ~28fps, step down a tier.
      if (this.requestedTier === 'auto' && this.stats.fps < 28) {
        const order: QualityTier[] = ['ultra', 'high', 'medium', 'low'];
        const idx = order.indexOf(this.quality.tier);
        if (idx >= 0 && idx < order.length - 1) {
          this.quality = QUALITY[order[idx + 1]];
          this.applySize();
          if (this.config) this.applyConfig(this.config, true);
          this.callbacks.onAutoQuality?.(this.quality.tier);
        }
      }
    }
    this.stats.drawCalls = this.renderer.info.render.calls;
    this.stats.triangles = this.renderer.info.render.triangles;
    this.stats.fishCount = this.fish.populations.reduce((a, p) => a + p.agents.length, 0);
  };
}
