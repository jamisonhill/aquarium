# Resume: Living Glass Aquarium (Virtual Aquarium)

**Paused:** 2026-07-23 — **submitted to the App Store on both platforms, waiting
on review.** Nothing is blocked on us.
**Updated:** 2026-07-23

## Status at pause
- **Web app live:** https://aquarium.duski.org (Cloudflare tunnel →
  192.168.0.9:3023; push→CI→GHCR→Watchtower unchanged).
- **iOS v1.0.0 build 1 — `WAITING_FOR_REVIEW`**
- **tvOS v1.0.0 build 1 — `WAITING_FOR_REVIEW`** (submitted separately; one ASC
  record, universal purchase). ASC app Apple ID `6793975991`.

## What happened this session
Everything from "archives successfully" to "submitted", including five ASC
prerequisites that blocked *Add for Review*:

- **13" iPad screenshots** (2064×2752) — required because the app ships
  `TARGETED_DEVICE_FAMILY "1,2"`. `scripts/store-screens.mjs` gained
  `--device iphone|ipad` and renders at the true CSS viewport per device.
- **Privacy policy URL** → https://aquarium.duski.org/privacy.html (tvOS shows
  this as "Apple TV Privacy Policy"; Jamison also pasted a plain-text version).
- **Age rating questionnaire** — all none/false; the app rates **4+**.
- **Content rights** — `DOES_NOT_USE_THIRD_PARTY_CONTENT` (all procedural).
- **Price tier Free** — set by Jamison in the UI; the API can't do it (Apple
  replaced the `prices` relationship with price schedules, unsupported by this
  fastlane).

Four Fastfile bugs were fixed first, all found while releasing Exegesis:
`project:` path, `export_method`, and `metadata_path`/`screenshots_path` (which
resolve relative to `ios/`, not `ios/fastlane/`).

## Gotchas worth remembering (also in docs/APPSTORE.md)
- **ASC keys cannot create app records.** The record was made by hand in the web
  UI; `fastlane create_app` only works via an Apple ID + 2FA login.
- **tvOS needs its own listing metadata** — ASC keeps a separate localization
  per platform version. The lane used to `skip_metadata`, which left the tvOS
  description empty and unsubmittable.
- **A still-processing build isn't attached** to its version by deliver. The
  tvOS bundle is ~650MB so it always is. Note the platform value on a *build*
  is `TV_OS`, not `APPLE_TVOS`.
- **deliver uploads every screenshot twice** and `overwrite_screenshots: true`
  does not stop it. Dedupe after every release.
- **Serve dist with `npx vite preview --port 4174`** for captures — Python's
  `http.server` stalls partway through a run.
- **`build/` is gitignored** — the tvOS .ipa is ~650MB and GitHub rejects it.

## Next actions (in order)
1. **Nothing until Apple responds** on either platform.
2. If rejected: Resolution Center → fix → bump `MARKETING_VERSION` /
   `CURRENT_PROJECT_VERSION` in `ios/project.yml` → `fastlane ios release`
   and/or `fastlane tvos release` (env: `ASC_KEY_ID=WRL6479U8F`,
   `ASC_ISSUER_ID=ff442907-b72c-4ffa-a2d6-e526a6569aa1`,
   `ASC_KEY_PATH=~/.appstoreconnect/private_keys/AuthKey_WRL6479U8F.p8`) →
   dedupe screenshots → attach builds → resubmit.
3. **Phase 9 (planned, after submission): WebGPU/TSL renderer migration.** Three
   ≥r178, single TSL codebase, WebGPURenderer with WebGL2 fallback, phased
   behind `?renderer=` (1A version bump → 1B TSL parts → 1C parity flip).
   Details in PROGRESS.md Phase 9.

## Key invariants (don't break)
- Vite `base: './'`, zero runtime network, all-procedural assets — the iOS
  scheme handler and the offline/privacy claims all depend on this.
- `window.__NATIVE_IOS__` / `__AQUARIUM_READY__` / `#capture=` seams
  (docs/APPSTORE.md lists them with file paths).
- tvOS scene loops in `ios/LivingGlassTV/Videos/*.mp4` are **gitignored** —
  six ~100–120MB files, regenerate with `scripts/capture-all.mjs`, never commit.

## Dev quickstart
```bash
npm run dev                      # web at :5173
npx vite preview --port 4174     # serve dist for screenshot/video capture
cd ios && xcodegen generate      # then build/test in Xcode or xcodebuild
```

## How to restart
`/resume-work "Living Glass Aquarium"`. First thing: check whether App Review
has responded on either platform.
