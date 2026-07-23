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
- [x] 6-scene 4K capture COMPLETE (3.2h, six 60.0s loops, 100–120MB each).
      Seam verified (mean pixel delta 2.30 across the wrap — invisible).
- [x] tvOS rebuilt with all six scenes (652MB debug bundle), picker + playback
      verified in the Apple TV 4K sim; tvOS store screenshots captured.
- [x] **Both platforms archive successfully with signing** (Release,
      -allowProvisioningUpdates). ← PAUSED HERE — everything automated is done.
- [x] **ASC API key resolved (2026-07-23):** no new key needed — the key created
      2026-07-17 for the recipe book is account-wide (Key ID `JBJW94LBNC`, issuer
      `ff442907-b72c-4ffa-a2d6-e526a6569aa1`, file
      `~/.appstoreconnect/private_keys/AuthKey_JBJW94LBNC.p8`). It uploads fine
      but cannot CREATE app records — see docs/APPSTORE.md.
- [x] **ASC app record created** (2026-07-23, by hand in the web UI — API keys
      cannot create apps). Apple ID `6793975991`, bundle id registered as
      Universal so one record covers iOS + tvOS.
- [x] **Both platforms uploaded (2026-07-23):** v1.0.0 build 1 on iOS and tvOS,
      each attached to its version; 1429-char description, support URL, and
      screenshots (5 iPhone 6.9", 2 Apple TV) on both; App Review contact set.
      Precheck clean. Fixed the tvOS lane along the way — it had skipped
      metadata entirely, leaving the tvOS listing empty.
- [x] **Submitted for review 2026-07-23** — both iOS and tvOS v1.0.0 build 1 are
      WAITING_FOR_REVIEW. Cleared the five ASC prerequisites first: 13" iPad
      screenshots (2064x2752), privacy policy URL, age rating questionnaire
      (rates 4+), content rights, and price tier Free.

## <- PAUSED HERE (2026-07-23) - awaiting App Review on both platforms.
Nothing is blocked on us. Next work is Phase 9 below, once review clears.

## Phase 9: WebGPU/TSL renderer migration [PLANNED — after submission]
Plan approved: three ≥r178, single TSL codebase, WebGPURenderer with WebGL2
backend fallback, phased behind ?renderer= flag (1A version bump → 1B TSL parts
→ 1C parity flip). Details in the session plan + docs/APPSTORE.md notes.
