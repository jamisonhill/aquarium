// Camera rig: a damped orbital camera with four modes.
//  orbit     — user drags to look, scrolls/pinches to zoom; gentle idle drift
//  cinematic — slow autonomous glide between framings (screensaver-friendly)
//  still     — locked "just watch" framing
//  follow    — smoothly tracks one fish (tap-a-fish)
// All motion is damped and slow by design — never nausea-inducing — and
// prefers-reduced-motion calms it further.

import * as THREE from 'three';
import type { CameraMode } from '../types';

const _target = new THREE.Vector3();

export class CameraRig {
  camera: THREE.PerspectiveCamera;
  mode: CameraMode = 'orbit';
  reducedMotion = false;

  // Spherical state around the look target.
  private theta = 0;          // azimuth (0 = looking at front glass)
  private phi = Math.PI / 2.2; // polar
  private radius = 1.4;
  private tTheta = 0;
  private tPhi = Math.PI / 2.2;
  private tRadius = 1.4;
  private lookAt = new THREE.Vector3();
  private tLookAt = new THREE.Vector3();

  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private idleTime = 0;
  private pinchDist = 0;
  private minR = 0.4;
  private maxR = 4;
  private cineT = 0;
  followTarget: (() => THREE.Vector3 | null) | null = null;

  // Track pointer movement so the engine can tell a click from a drag.
  lastPointerTravel = 0;

  constructor(private dom: HTMLElement, aspect: number) {
    this.camera = new THREE.PerspectiveCamera(46, aspect, 0.01, 60);
    dom.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    dom.addEventListener('wheel', this.onWheel, { passive: false });
    dom.addEventListener('touchstart', this.onTouchStart, { passive: true });
    dom.addEventListener('touchmove', this.onTouchMove, { passive: false });
  }

  dispose(): void {
    this.dom.removeEventListener('pointerdown', this.onDown);
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    this.dom.removeEventListener('wheel', this.onWheel);
    this.dom.removeEventListener('touchstart', this.onTouchStart);
    this.dom.removeEventListener('touchmove', this.onTouchMove);
  }

  // Frame a (new) tank: pull back proportionally to its width.
  frameTank(halfW: number, height: number, midY: number): void {
    this.tLookAt.set(0, midY, 0);
    this.lookAt.copy(this.tLookAt);
    this.tRadius = Math.max(0.5, halfW * 2.6);
    this.radius = this.tRadius * 1.05;
    this.minR = Math.max(0.18, halfW * 0.5);
    this.maxR = halfW * 6 + 1;
    this.tTheta = this.theta = 0;
    this.tPhi = this.phi = Math.PI / 2.14;
  }

  setMode(mode: CameraMode): void {
    this.mode = mode;
    this.cineT = 0;
  }

  private onDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    this.dragging = true;
    this.lastX = e.clientX; this.lastY = e.clientY;
    this.lastPointerTravel = 0;
    this.idleTime = 0;
  };

  private onMove = (e: PointerEvent): void => {
    if (!this.dragging) return;
    const dx = e.clientX - this.lastX, dy = e.clientY - this.lastY;
    this.lastX = e.clientX; this.lastY = e.clientY;
    this.lastPointerTravel += Math.abs(dx) + Math.abs(dy);
    if (this.mode === 'still') return;
    this.tTheta -= dx * 0.005;
    this.tPhi = THREE.MathUtils.clamp(this.tPhi - dy * 0.004, 0.9, 2.0);
    // Any manual input drops us back into orbit mode from cinematic/follow.
    if (this.mode === 'cinematic' || this.mode === 'follow') this.mode = 'orbit';
    this.idleTime = 0;
  };

  private onUp = (): void => { this.dragging = false; };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.tRadius = THREE.MathUtils.clamp(this.tRadius * (1 + Math.sign(e.deltaY) * 0.09), this.minR, this.maxR);
    this.idleTime = 0;
  };

  private onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 2) {
      this.pinchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (this.pinchDist > 0) {
        this.tRadius = THREE.MathUtils.clamp(this.tRadius * (this.pinchDist / d), this.minR, this.maxR);
      }
      this.pinchDist = d;
    }
  };

  update(dt: number): void {
    const damp = (a: number, b: number, l: number) => THREE.MathUtils.damp(a, b, l, dt);
    this.idleTime += dt;
    const calm = this.reducedMotion ? 0.3 : 1;

    if (this.mode === 'cinematic') {
      // A slow figure-eight glide: azimuth sweeps, elevation bobs, zoom breathes.
      this.cineT += dt * 0.05 * calm;
      this.tTheta = Math.sin(this.cineT) * 0.55;
      this.tPhi = Math.PI / 2.15 + Math.sin(this.cineT * 0.7) * 0.1;
      this.tRadius = THREE.MathUtils.clamp(this.tRadius, this.minR, this.maxR);
      this.tRadius += Math.sin(this.cineT * 0.43) * dt * 0.02;
    } else if (this.mode === 'orbit' && this.idleTime > 14 && !this.dragging) {
      // After 14s untouched, a barely-perceptible drift keeps the scene alive.
      this.tTheta += dt * 0.012 * calm;
    }

    if (this.mode === 'follow' && this.followTarget) {
      const p = this.followTarget();
      if (p) {
        this.tLookAt.copy(p);
        this.tRadius = THREE.MathUtils.clamp(this.tRadius, this.minR, this.maxR * 0.4);
      }
    } else {
      // lookAt eases back to the framed center set by frameTank.
    }

    this.theta = damp(this.theta, this.tTheta, 3);
    this.phi = damp(this.phi, this.tPhi, 3);
    this.radius = damp(this.radius, this.tRadius, 3);
    this.lookAt.x = damp(this.lookAt.x, this.tLookAt.x, 2.5);
    this.lookAt.y = damp(this.lookAt.y, this.tLookAt.y, 2.5);
    this.lookAt.z = damp(this.lookAt.z, this.tLookAt.z, 2.5);

    const sinPhi = Math.sin(this.phi);
    this.camera.position.set(
      this.lookAt.x + this.radius * sinPhi * Math.sin(this.theta),
      this.lookAt.y + this.radius * Math.cos(this.phi),
      this.lookAt.z + this.radius * sinPhi * Math.cos(this.theta)
    );
    _target.copy(this.lookAt);
    this.camera.lookAt(_target);
  }

  // Return look target to tank center (when follow ends).
  releaseFollow(midY: number): void {
    this.tLookAt.set(0, midY, 0);
    this.followTarget = null;
  }

  /**
   * Pull the camera in toward the glass for an immersive, full-bleed framing
   * (used by the ambient/tvOS capture). fraction 0 = as close as allowed,
   * 1 = keep the current whole-tank framing.
   */
  closeUp(fraction: number): void {
    this.tRadius = THREE.MathUtils.lerp(this.minR, this.tRadius, THREE.MathUtils.clamp(fraction, 0, 1));
    this.radius = this.tRadius; // snap — capture starts immediately
  }
}
