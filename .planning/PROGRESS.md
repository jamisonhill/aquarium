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
- [x] 50% speed reduction; cory air-gulp behavior (deployed & confirmed live)
- [x] Honey gourami + zebra oto; driftwood decor; pace 0.25 (later session)

## Phase 8: App Store — "Living Glass Aquarium" (iOS + tvOS) [IN PROGRESS 2026-07-23]
One listing, bundle org.duski.livingglass (universal purchase), team HFAWAP3F3Z.
- [x] iOS app (ios/): WKWebView shell over the bundled build via app:// scheme
      handler (module CORS forbids file://), native share/screenshot bridge,
      idle-timer off, safe-area CSS fixes (also live on web). Smoke UITest
      green: engine renders + localStorage persists across relaunch.
- [x] App icon + 5 App Store screenshots at 1320×2868, all from the real engine.
- [x] Engine capture mode (#capture=<preset>, fixed-dt external drive,
      cinematic close-up 0.42) + puppeteer→ffmpeg 4K HEVC seamless-loop
      pipeline (tail→head crossfade). Verified end-to-end.
- [x] tvOS app (LivingGlassTV target, same bundle id): scene picker with
      poster frames, AVPlayerLooper gapless playback, auto-cycle. Verified in
      the Apple TV 4K simulator with a test loop.
- [x] fastlane (ios + tvos lanes), full metadata, review notes (4.2 defense),
      privacy.html; privacy = Data Not Collected.
- [ ] **6-scene 4K capture** ← PAUSED HERE (2026-07-23; run was at 2/6 done and
      still executing — verify per RESUME.md step 1) → then: xcodegen, tvOS
      rebuild + soak check, archive both.
- [ ] **Jamison (~30 min):** ASC API key (.p8) → `fastlane ios create_app` →
      `fastlane ios release` + `fastlane tvos release` → privacy questionnaire
      ("Data Not Collected") + Submit both. See docs/APPSTORE.md.

## Phase 9: WebGPU/TSL renderer migration [PLANNED — after submission]
Plan approved: three ≥r178, single TSL codebase, WebGPURenderer with WebGL2
backend fallback, phased behind ?renderer= flag (1A version bump → 1B TSL parts
→ 1C parity flip). Details in the session plan + docs/APPSTORE.md notes.
