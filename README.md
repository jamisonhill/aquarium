# 🐠 Aquarium — a living virtual tank

A calming, interactive virtual aquarium that runs entirely in the browser.
Build your own tank — freshwater or reef — stock it with fish that school,
forage, hover and hide the way real species do, then lean back and watch.

**Everything is procedural.** Every fish, plant, coral, texture and sound is
generated in code at runtime. There are no downloaded assets, no tracking, no
backend — the site is plain static files.

## Running it

```bash
npm install
npm run dev        # local dev server
npm run build      # static production build → dist/
npm run preview    # serve the production build locally
```

Deployment is automatic: pushing to `main` builds a Docker image via GitHub
Actions, pushes it to ghcr.io, and Watchtower on the NAS pulls it within ~5
minutes (see `DEPLOY.md`).

## Using the aquarium

- **Drag** to look around, **scroll/pinch** to zoom.
- **Tap a fish** to follow it and read its species card — you can name it.
- Toolbar: feed 🫘 (then tap the water), day/night 🌙, cinematic camera 🎥,
  sound 🔊, photo 📸, screensaver 🖥️, fullscreen ⛶.
- Keyboard: `H` hide UI · `F` feed · `C` cinematic · `P` photo · `Esc` close.
- `?kiosk=1` in the URL starts in screensaver mode (for a TV or wall display).
- The **Saved** tab stores tanks in your browser and makes share links that
  encode the whole tank in the URL.

## How the realism works (a guided tour)

The interesting code is deliberately commented for learning. Start here:

| What you see | Where it lives | The trick |
|---|---|---|
| Water gets bluer with distance | `src/engine/shaders.ts` → `installUnderwaterFog` | Beer–Lambert absorption, per color channel — red light dies first, exactly like real water |
| Dancing light on the sand | `src/engine/shaders.ts` → `applyUnderwater` | An animated interference pattern projected down in world space, applied **multiplicatively** (caustics are focused light, so ridges brighten and gaps dim) |
| Sun shafts | `src/engine/Environment.ts` | Additive translucent beams, billboarded to the camera, shimmering with noise |
| Fish that *swim* instead of glide | `src/engine/FishFactory.ts` | A traveling sine wave runs nose→tail in the vertex shader; tail-beat frequency is coupled to speed (`U ≈ 0.7·L·f`, from fish-locomotion research) |
| Schools that move as one | `src/engine/FishSystem.ts` → `boids` | Reynolds boids: separation 2.0, alignment 0.5, cohesion 0.5, with a rear blind spot |
| Species personality | `src/engine/FishSystem.ts` → `pickMode` | Eight behavior archetypes: schooler, territorial, bottom-forager, hoverer, ambusher, nocturnal, surface, cleaner |
| Plants leaning in the current | `src/engine/Flora.ts` + `CurrentField.ts` | One shared flow field (filter jet + ambient drift) drives plant sway *and* fish drift, so the water feels like one body |
| Pulsing Xenia coral | `src/engine/Flora.ts` | Its rhythm is deliberately self-driven, decoupled from the current — that's how the real animal behaves |
| Stocking warnings | `src/data/compatibility.ts` | Capacity from footprint + surface area (not "1 inch per gallon"), schooling minimums, mouth-size predation, reef-safety |

One hard-won lesson preserved in the code: Three.js caches shader programs
keyed on `onBeforeCompile.toString()`. If you patch many materials with the
same function-but-different-injected-GLSL, they silently share one program.
`applyUnderwater` sets `customProgramCacheKey` per variant — don't remove it.

## Performance

Quality tiers (Low/Medium/High/Ultra + auto-detect with runtime downgrade)
scale pixel ratio, bloom, god-ray count, particle counts and the fish budget.
Fish render as **one instanced draw call per species** with all animation in
the vertex shader — a 60-fish school costs the same draw-call budget as one.

`debug.html` (dev server only) renders an isolated caustics test plane —
useful when tuning the water shaders.

## Adding a new species

See `docs/ADDING-SPECIES.md`. Short version: one entry in
`src/data/species.ts` — shape parameters, palette, behavior archetype and care
data. The geometry, texture, animation and UI all derive from it.

## A note on "photorealism"

The research phase (`RESEARCH.md`) found that license-clear, rigged,
photoreal fish models essentially don't exist. Following the documented
fallback plan, this build goes fully procedural — a curated set of 29
recognizable species with research-grade *motion* realism (undulation physics,
banking, schooling, sculling) and a physically-motivated water look (PBR,
IBL, absorption, caustics). The result is a stylized-naturalistic tank that
feels alive, ships at ~220 KB gzipped, and has zero licensing risk. Swapping
in glTF models later only touches `FishFactory.ts`.

## License

Code: MIT. Assets: there are none — everything is generated. See `LICENSES.md`.
