# Resume: Virtual Aquarium

**Paused:** 2026-07-04, late night
**Reason:** Project complete and live; stepping away after post-launch species batch
**Phase:** All 7 phases complete + post-launch tweaks shipped

## State when paused

Everything works and is deployed. **Nothing is in flight** — the final push
(new species + pacing) was confirmed swapped onto the NAS by Watchtower
before pausing, and the live site returned 200 afterward.

## What was working (verified in headless browser, zero console errors)
- Live at https://aquarium.duski.org and http://192.168.0.9:3023 (health: ok)
- All 32 species render/behave; new: ember tetra, albino cory (red eyes),
  hillstream loach (clings to glass, graze/scoot)
- SPEED_SCALE = 0.5 in src/engine/FishSystem.ts — the single pace dial
- Cory air-gulp: bottom → rocket to surface (steep pitch) → dive back

## Key decisions this session
- Fish pace: real body-lengths/sec reads frantic on screen → global 0.5 scale
- Hillstream loach reuses the snail wall-crawler (isCrawler()) with per-species
  speed + graze/scoot modes; snail speed made dt-correct (was frame-dependent)
- eyeColor added to FishPalette for albino red eyes

## Likely next steps (nothing committed to)
- Watch the tank on a real GPU and re-judge pace (SPEED_SCALE is the dial)
- More species on request — docs/ADDING-SPECIES.md is the guide
- Possible future: WebGPU renderer, glTF model swap-in (touches FishFactory only)

## How to restart dev
```bash
cd ~/Ai/Personal/aquarium
npm run dev          # local dev at :5173
npm run build        # must pass before pushing
git push origin main # → live in ~5–10 min via Actions + Watchtower
```
Headless verification scripts from this session live in the (ephemeral)
session scratchpad; the pattern is documented in project memory. DEPLOY.md
covers all operations.
