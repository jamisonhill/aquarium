# Progress — Virtual Aquarium

## Phase 0: Research [COMPLETE]
- [x] RESEARCH.md — engine, locomotion, flora, stocking, assets, perf, audio

## Phase 1: Architecture & Tooling [COMPLETE]
- [x] Vite + React + TS + Zustand + Three.js (WebGL2), fully static output
- [x] Engine decoupled from React; git repo; LICENSES.md

## Phase 2: Photorealism Core [COMPLETE]
- [x] Per-channel absorption fog, multiplicative caustics, god rays, water surface
- [x] Glass tank, substrates, backgrounds, marine snow, bubbles
- [x] Camera modes, quality tiers + auto-detect/downgrade

## Phase 3: Living Fish [COMPLETE]
- [x] 32 procedural species; vertex-shader swim; boids; 8 archetypes; warnings engine
- [x] Global SPEED_SCALE 0.5 pace dial (user-requested realism fix)
- [x] Cory two-phase air-gulp rocket (bronze + albino)
- [x] Glass-crawler system: snails + reticulated hillstream loach

## Phase 4: Flora & Crew [COMPLETE]
- [x] FW plants, SW corals (pulsing Xenia, anemone, LPS, hard corals), decor library

## Phase 5: Customization [COMPLETE]
- [x] Water type / size slider / browsers / substrate / background / lighting
- [x] Save/load/name, randomize, 6 presets, share URLs

## Phase 6: Extras [COMPLETE]
- [x] Day/night + realtime, feeding, tap-a-fish + naming, procedural audio,
      screensaver/kiosk, photo mode, HUD, reduced-motion, responsive

## Phase 7: Verify & Deploy [COMPLETE]
- [x] Headless-browser test suite, zero console errors
- [x] Live: https://aquarium.duski.org (Cloudflare Tunnel) + http://192.168.0.9:3023 (LAN)
- [x] Auto-deploy verified: push → Actions → ghcr.io → Watchtower (~5–10 min)

## Post-launch additions
- [x] Ember tetra, albino corydoras (red eyes), hillstream loach
- [x] 50% speed reduction; cory air-gulp behavior ← PAUSED HERE (deployed & confirmed live)

No blockers. Project is feature-complete and live.
