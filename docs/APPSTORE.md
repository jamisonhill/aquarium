# Living Glass Aquarium — iOS & tvOS App Store operations

One App Store listing, two binaries, one bundle id (`org.duski.livingglass`,
team HFAWAP3F3Z). iOS = the live simulation in a WKWebView shell; tvOS =
pre-rendered 4K ambient loops of the same tanks (tvOS has no web runtime).

## Layout

```
ios/
  project.yml            # xcodegen — targets LivingGlass (iOS), LivingGlassTV (tvOS)
  scripts/embed-web.sh   # pre-build: npm run build → bundle Web/
  LivingGlass/           # iOS shell: scheme handler (app://aquarium), bridge, icon
  LivingGlassTV/         # tvOS: scene picker + AVPlayerLooper; Videos/*.mp4 gitignored
  LivingGlassUITests/    # smoke: engine renders + localStorage persists
  fastlane/              # Appfile, Fastfile (ios/tvos lanes), metadata, screenshots
```

## Everyday commands

```bash
cd ios && xcodegen generate
xcodebuild -project LivingGlass.xcodeproj -scheme LivingGlass \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' test      # iOS smoke
xcodebuild -project LivingGlass.xcodeproj -scheme LivingGlassTV \
  -destination 'platform=tvOS Simulator,name=Apple TV 4K (3rd generation)' build
```

## Regenerating the tvOS scene loops (~2–3 h unattended)

```bash
npm run build
(cd dist && python3 -m http.server 4174 &)
node scripts/capture-all.mjs          # 6 presets → ios/LivingGlassTV/Videos/*.mp4
cd ios && xcodegen generate           # so the videos join the tvOS bundle
```

Each loop: 70 s captured at 4K30 from the real engine (fixed-dt, cinematic
camera, fixed daylight), last 10 s crossfaded into the first 10 s → seamless
60 s HEVC loop ≈ 120 MB. All six ≈ 720 MB, embedded in the tvOS app (well
under the 4 GB limit; On-Demand Resources is a future optimization).

## Web-side seams the apps depend on (don't break these)

- `window.__NATIVE_IOS__` + `webkit.messageHandlers.native` — src/platform/native.ts
- `window.__AQUARIUM_READY__` after first rendered frame (Engine.advance)
- `#capture=<preset-slug>` boot path — src/capture/captureMode.ts + Engine.enableExternalDrive/advance
- Vite `base: './'` and zero runtime network (the scheme handler serves only bundled files)

## Release

**The ASC API key already exists** — created 2026-07-17 for the recipe book app;
ASC keys are account-wide, so it covers this app too. Verified 2026-07-23:

```bash
export ASC_KEY_ID=JBJW94LBNC
export ASC_ISSUER_ID=ff442907-b72c-4ffa-a2d6-e526a6569aa1
export ASC_KEY_PATH=$HOME/.appstoreconnect/private_keys/AuthKey_JBJW94LBNC.p8
```

⚠️ API keys can upload builds and metadata but **cannot create app records** —
ASC refuses `CREATE` on `apps` for key auth (confirmed 2026-07-23 with two
separate keys, so it is not a role problem; `fastlane create_app` only works via
an Apple ID + 2FA login, which is why it asks for a `username`).

Create the record by hand: ASC → My Apps → **+** → New App — platform *iOS*,
name **Living Glass Aquarium**, bundle `org.duski.livingglass`, SKU
`livingglass`, primary language English (U.S.).

```bash
cd ios
fastlane ios create_app     # only works with Apple ID login — see above
fastlane ios release        # web build → archive → upload binary+metadata+shots
fastlane tvos release       # archive tvOS (videos must exist) → upload to same record
```

Then in ASC: price Free, privacy questionnaire = **Data Not Collected** (the
binaries contain no networking code at all), attach builds, Submit — once per
platform. Review notes live in fastlane/metadata/review_information/notes.txt
(they carry the guideline-4.2 defense; read them before editing).

## Version bumps

`MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` in ios/project.yml → regenerate
→ release lanes. The iOS binary embeds whatever the web build is at archive
time, so shipping web improvements to the App Store = just re-running
`fastlane ios release` with a bumped version.

## Two things fastlane does not handle on a new app

Both are one-time-per-app, both learned the hard way on 2026-07-23:

1. **App Review Details must exist before `deliver` runs.** On a brand-new
   version the record doesn't exist, and fastlane raises a bare `No data`
   RuntimeError instead of reporting the empty API response. Create it first
   (contact name/email/phone + notes are in `fastlane/metadata/review_information`).
2. **A build still processing when `deliver` exits is not attached** to the
   version. The tvOS bundle is ~650MB, so it is always still processing. Attach
   it afterward — in the ASC UI, or via Spaceship `version.select_build`.
   Note the platform value on a *build* is `TV_OS` (not `APPLE_TVOS`).

Also: `deliver` uploads each screenshot **twice** — check for duplicates in ASC
after a run and delete the extras. Re-running `deliver` adds more rather than
replacing, so the metadata-only lanes pass `skip_screenshots: true`.

## Submission prerequisites ASC won't let you skip

Beyond metadata and a build, ASC blocks "Add for Review" until these are set.
Everything except pricing can be done through the API (see the session notes):

- **Screenshots for every supported display.** The app ships
  `TARGETED_DEVICE_FAMILY "1,2"`, so 13-inch iPad shots (2064×2752) are required
  alongside the 6.9" iPhone set — generate both with
  `node scripts/store-screens.mjs --device ipad` (dist served at :4174 via
  `npx vite preview --port 4174`; Python's http.server stalls mid-run).
- **Privacy policy URL** — https://aquarium.duski.org/privacy.html, set on the
  app info localization. tvOS reports this separately as "Apple TV Privacy Policy".
- **Age rating questionnaire** — all none/false for this app; it rates 4+.
- **Content rights** — `DOES_NOT_USE_THIRD_PARTY_CONTENT` (everything is procedural).
- **Price tier — Free.** UI only: Apple dropped the `prices` relationship in
  favor of price schedules and this fastlane version can't set it.
