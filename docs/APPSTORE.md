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

⚠️ That key can upload builds and metadata, but its role does **not** permit
creating app records (ASC returns "The resource 'apps' does not allow 'CREATE'").
So either create the record by hand in ASC → My Apps → **+** (platform iOS, name
"Living Glass Aquarium", bundle `org.duski.livingglass`, SKU `livingglass`,
primary language English (U.S.)), or raise the key's role to Admin in ASC →
Users and Access → Integrations and then run `create_app`.

```bash
cd ios
fastlane ios create_app     # once — needs an Admin-role key (see above)
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
