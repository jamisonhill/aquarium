# Aquarium Build Checklist

## Phase 0 — Research
- [x] RESEARCH.md complete (engine, locomotion, flora, stocking, assets, perf, audio)

## Phase 1 — Architecture & Tooling
- [x] Vite + React + TypeScript + Zustand scaffold, static output
- [x] Three.js engine module decoupled from React
- [x] git init, .gitignore, commits per phase
- [x] LICENSES.md

## Phase 2 — Photorealism Core
- [x] PBR + IBL lighting (procedural RoomEnvironment), water tint per type
- [x] Animated caustics on substrate/fish/plants (multiplicative focused-light model)
- [x] Volumetric god-ray light shafts (billboarded shimmer beams)
- [x] Per-channel depth color absorption fog (Beer–Lambert)
- [x] Water surface (procedural waves, glints), glass tank + silicone frame + base
- [x] Substrate options (4), backgrounds (5)
- [x] Marine snow + air-stone bubbles (GPU-animated point sprites)
- [x] Camera: drag/zoom/pinch, cinematic drift, still, follow, idle drift
- [x] Quality tiers Low/Medium/High/Ultra + auto-detect + runtime downgrade

## Phase 3 — Living Fish
- [x] Procedural fish geometry + canvas-painted species textures (29 species)
- [x] Vertex-shader swim undulation (freq-coupled speed, head recoil, banking, gill pulse)
- [x] Boids schooling (2.0/0.5/0.5 weights, FOV blind spot) + 8 behavior archetypes
- [x] Idle behaviors: hover-sculling, darts, resting, foraging, cory air-gulps
- [x] Current field affects fish (drift + rheotaxis)
- [x] Stocking capacity (surface-area model) + gentle warnings (9 rule types)
- [x] One instanced draw call per species

## Phase 4 — Flora & Cleanup Crew
- [x] FW plants: stems, rosettes, carpet, moss, floating — current-driven sway + jet lean
- [x] SW: pulsing Xenia (self-driven), anemone, LPS flow, soft corals, static hard corals
- [x] Snails grazing the glass, shrimp, cleaner shrimp stations
- [x] Decor library incl. ship/castle playful toggles, reef rock, air stone

## Phase 5 — Visitor Customization
- [x] Water type swap (libraries, tint, substrate, lighting swap + stock clear)
- [x] Tank size slider 5–180 gal w/ named presets, physical scene resize, capacity
- [x] Searchable/filterable fish browser + species info cards + fun facts
- [x] Plant/coral browser, substrate/background/decor/lighting pickers
- [x] Live real-time scene updates (structure vs stock diffing)
- [x] Save/Load/Name tanks (localStorage), randomize, 6 starter presets

## Phase 6 — Extras
- [x] Day/night cycle + real-time sync + moonlight mode + nocturnal behavior swap
- [x] Feeding interaction (tap water, flakes float→sink→settle, fish race & compete)
- [x] Tap-a-fish: camera follow + info card + name your fish
- [x] Procedural ambient audio (water bed, hum, bubble blips, generative music pad)
- [x] Screensaver mode + ?kiosk=1, photo mode (PNG download)
- [x] Perf HUD dev toggle (fps/draw calls/tris/fish)
- [x] prefers-reduced-motion, keyboard nav + shortcuts, aria labels, focus styles
- [x] Responsive layout + mobile quality fallback
- [x] Shareable config URL (base64 in hash)

## Phase 7 — Verify, Polish, Deploy
- [x] Production build passes (220 KB gzipped)
- [x] Headless-browser test suite: zero console errors across build/feed/night/reef/resize
- [x] Visual iteration: particles, fog tuning, caustics program-cache fix, exposure
- [x] README + LICENSES.md + docs/ADDING-SPECIES.md + DEPLOY.md
- [x] Deploy: Dockerfile + nginx + GH Actions → ghcr.io → Watchtower on NAS
- [x] Live on NAS: http://192.168.0.9:3023/ (health: ok)
- [x] Auto-update loop verified (push → Watchtower swap)
