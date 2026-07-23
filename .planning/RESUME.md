# Resume: Virtual Aquarium / Living Glass Aquarium

**Paused:** 2026-07-23 — Phase 8 automated work 100% complete (all six 4K
loops rendered + seam-verified, tvOS bundled + sim-verified, both platforms
archive with signing). Waiting solely on Jamison's App Store Connect steps.

## ⚠️ FIRST THING ON RESUME — only Jamison's ASC steps remain
Everything automated is DONE (captures, tvOS bundle, seam check, both archives).
Skip to step 4 below. Steps 1–3 kept only as reference if scenes ever need
regenerating.

## (reference) Capture/verify procedure
1. `ls -la ios/LivingGlassTV/Videos/` — expect SIX ~118MB .mp4 files
   (reef-lagoon, amazon-community, blackwater-stream, tang-highway,
   betta-oasis, nano-planted). At pause time 2/6 were done, scene 3 rendering.
   - Missing some? Serve dist (`cd dist && python3 -m http.server 4174 &`) and
     `node scripts/capture-scene.mjs <slug> --secs 70 --fps 30 --out ios/LivingGlassTV/Videos`
     per missing slug (~30 min each), or rerun `scripts/capture-all.mjs`.
   - ⚠️ reef-lagoon.mp4 must be ~118MB (60s). If it's ~28MB it's the old 14s
     test loop — recapture it.
2. `cd ios && xcodegen generate` (videos join the tvOS bundle) → rebuild
   LivingGlassTV, spot-check playback in the Apple TV 4K sim, scrub a loop
   seam (frame ~50s→0s should be invisible).
3. Test-archive both schemes (should Just Work — signing verified on this Mac
   via Exegesis; same team HFAWAP3F3Z).
4. **Then remind Jamison of his ~25 min** (NOT yet done as of pause):
   create the ASC app record → `fastlane ios release` + `fastlane tvos release`
   → privacy questionnaire ("Data Not Collected") → Submit both platforms.
   Full procedure: **docs/APPSTORE.md**.
   **The ASC API key is no longer a blocker** (resolved 2026-07-23): the key
   made 2026-07-17 for the recipe book is account-wide — Key ID `JBJW94LBNC`,
   issuer `ff442907-b72c-4ffa-a2d6-e526a6569aa1`, file
   `~/.appstoreconnect/private_keys/AuthKey_JBJW94LBNC.p8`. It uploads builds
   and metadata, but ASC does not allow CREATE on `apps` for key auth at all
   (verified with two separate keys — not a role issue), so the app record must
   be made by hand in the ASC web UI. Same applies to the Exegesis submission
   (bibleReading repo).

## State snapshot
- Web app: live at aquarium.duski.org; this session's safe-area CSS fixes and
  the native/capture seams are deployed (push→CI→Watchtower unchanged).
- iOS app: complete + smoke-tested (ios/, scheme LivingGlass). Icon + five
  6.9" store screenshots committed (fastlane/screenshots).
- tvOS app: complete + sim-verified (scheme LivingGlassTV, same bundle id =
  one listing / universal purchase). Videos are gitignored — regenerate, never
  commit.
- fastlane: metadata, review notes (guideline-4.2 defense), both platform lanes.
- Decision log: name "Living Glass Aquarium"; tvOS = ambient video app (no
  WKWebView exists on tvOS); WebGPU/TSL migration (Phase 9) deliberately AFTER
  submission — approved plan summary in PROGRESS.md Phase 9.

## Key invariants (don't break)
- Vite `base: './'`, zero runtime network, all-procedural assets — the iOS
  scheme handler and offline claim depend on this.
- window.__NATIVE_IOS__ / __AQUARIUM_READY__ / #capture= seams (docs/APPSTORE.md
  lists all of them with file paths).

## Dev quickstart
```bash
npm run dev                      # web at :5173
cd ios && xcodegen generate      # then build/test in Xcode or xcodebuild
```
