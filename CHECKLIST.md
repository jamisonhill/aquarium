# Aquarium Build Checklist

## Phase 0 — Research
- [x] RESEARCH.md complete (engine, locomotion, flora, stocking, assets, perf, audio)

## Phase 1 — Architecture & Tooling
- [ ] Vite + React + TypeScript + Zustand scaffold, static output
- [ ] Three.js engine module decoupled from React
- [ ] git init, .gitignore, first commit
- [ ] LICENSES.md

## Phase 2 — Photorealism Core
- [ ] PBR + IBL-style lighting, water tint per type
- [ ] Animated caustics on substrate/fish/plants
- [ ] Volumetric god-ray light shafts
- [ ] Per-channel depth color absorption fog (Beer–Lambert)
- [ ] Water surface (animated, seen from below), glass tank
- [ ] Substrate options, backgrounds
- [ ] Marine snow + air-stone bubbles (GPU particles)
- [ ] Camera: drag/zoom, cinematic drift, "just watch" mode
- [ ] Quality tiers Low/Med/High/Ultra + auto-detect

## Phase 3 — Living Fish
- [ ] Procedural fish geometry + species texturing
- [ ] Vertex-shader swim undulation (freq-coupled speed, banking, Strouhal-valid)
- [ ] Boids schooling + behavior archetypes (7 types)
- [ ] Idle behaviors: hover-sculling, darts, resting, foraging
- [ ] Current field affects fish (rheotaxis)
- [ ] Stocking capacity + gentle warnings (compatibility, predation, schooling minimums)
- [ ] Instancing so schools stay 60fps

## Phase 4 — Flora & Cleanup Crew
- [ ] FW plants: stems, carpet, moss, floating — current-driven sway
- [ ] SW: pulsing Xenia, anemones, LPS flow, static hard corals, reef rock
- [ ] Snails grazing glass, shrimp foraging
- [ ] Decor library incl. ship/castle toggles

## Phase 5 — Visitor Customization
- [ ] Water type swap (FW/SW libraries, tint, mood)
- [ ] Tank size slider w/ named presets, scene resize, capacity
- [ ] Searchable/filterable fish browser + info cards
- [ ] Plant/coral browser, substrate/background/decor/lighting pickers
- [ ] Live real-time scene updates
- [ ] Save/Load/Name tanks (localStorage), randomize, starter presets

## Phase 6 — Extras
- [ ] Day/night cycle + real-time sync + moonlight mode
- [ ] Feeding interaction (click surface, flakes sink, fish compete)
- [ ] Tap-a-fish: camera follow + info card + name your fish
- [ ] Procedural ambient audio (water bed + bubbler), volume, muted default
- [ ] Screensaver/kiosk mode, photo mode (download screenshot)
- [ ] Perf HUD dev toggle
- [ ] prefers-reduced-motion, keyboard nav, contrast
- [ ] Responsive + mobile quality fallback
- [ ] Shareable config URL

## Phase 7 — Verify, Polish, Deploy
- [ ] Production build passes, tested in browser
- [ ] All features verified working
- [ ] README + LICENSES.md + "add a species" guide
- [ ] Deploy via deploy-static-site-ghcr (Docker → ghcr.io → Watchtower)
- [ ] Confirm live on NAS, report URL
