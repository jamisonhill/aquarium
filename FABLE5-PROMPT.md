# Master Prompt for Fable 5 — Build a Photorealistic Interactive Virtual Aquarium

> Paste everything below the line into Fable 5 as a single prompt. It is written to be handed off whole.

---

## Role & Mission

You are building a **complete, production-ready, photorealistic interactive virtual aquarium website** that will be deployed to and served from my home Synology NAS (path root `/NAShome`, served as a Dockerized static site via Portainer + Watchtower). The goal: **anyone who wants to enjoy watching a living aquarium — without owning a fish tank — can open the site and watch realistic fish and plants move, breathe, school, feed, and behave the way they do in real life.** It should feel calming, alive, and as close to photoreal as is achievable in a browser.

Build it end-to-end: research, architecture, assets, code, features, polish, and NAS deployment. Do not stop at a prototype.

---

## CRITICAL — Run to Completion Without Pausing

**Invoke the `/goal` skill at the very start** and use it to drive this entire project autonomously through to completion. Set the goal to: *"Ship a fully working, photorealistic, feature-complete interactive aquarium website deployed and running on the home NAS."*

Rules for the run:
- Do **not** pause to ask me for confirmation between tasks. Make reasonable engineering decisions and keep moving.
- Only stop to ask me a question if you hit a **true hard blocker** you cannot resolve yourself (e.g., a NAS credential or a decision that would waste hours to guess wrong). Batch any such questions.
- Work through every phase below in order. After each phase, self-verify it works before advancing.
- Treat "done" as: the site builds, runs, looks photorealistic, all interactive features function, and it is deployed and reachable on the NAS.
- Keep a running checklist and check items off as you complete them so nothing is dropped.

---

## Phase 0 — Deep Research (use the `/deep-research` skill)

Before writing code, run **`/deep-research`** on each of the following. Synthesize findings into a short `RESEARCH.md` in the repo, then let those findings drive your technical choices. Run these as focused research passes:

1. **Browser-based photorealistic real-time water rendering** — best current techniques for WebGL/WebGPU: physically based rendering (PBR), real-time caustics, volumetric "god rays" / light shafts, refraction and depth-based color absorption, screen-space reflections, particulate/"marine snow," and surface distortion. Compare **Three.js vs Babylon.js vs PlayCanvas** for this specific use case and pick one. Note WebGPU availability and fallback to WebGL2.
2. **Realistic fish locomotion & behavior** — procedural swimming (spine/bone undulation, tail-beat driving forward thrust), **boids/flocking** for schooling species, and per-species behavior archetypes: schooling, solitary/territorial, bottom-dwelling/scavenging, mid-water hovering, ambush/lurking, nocturnal, surface-dwelling, cleaner behavior. Gather concrete parameters (speed ranges, turn rates, personal-space, school cohesion) so movement looks real, not robotic.
3. **Live aquatic plant & coral motion** — how freshwater plants sway under filter current vs. how soft corals/anemones pulse and drift in saltwater; vertex-shader-based sway, current fields, and light response. Gather realistic species lists for both.
4. **Aquarium stocking & compatibility rules** — real-world stocking guidance (bioload, surface area, gallons), tank-size categories (nano ~5g, small ~20g, medium ~40g, large ~75g, XL ~120g+), and **species compatibility** (which fish school, which are aggressive, predator/prey pairs, freshwater vs. saltwater exclusivity, reef-safe vs. not). This feeds a realistic selection + gentle-warning system.
5. **Asset sourcing / generation** — where to get **license-clear photorealistic fish & plant 3D models** (glTF/GLB) with rigs suitable for real-time (e.g., permissively licensed Sketchfab/Poly Haven-style sources, CC0 texture libraries for substrate/rock/wood/coral, HDRIs for lighting). If suitable rigged models aren't freely available for a species, document a fallback plan (procedural/low-poly-with-photoreal-texture, or a curated smaller species list of high quality). Capture exact license terms.
6. **Performance at scale** — rendering many animated meshes smoothly at 60fps: GPU **instancing**, skeletal-animation-in-shader / vertex animation textures, level-of-detail (LOD), frustum culling, texture atlasing, and quality tiers for weaker hardware. Confirm what a NAS-served static site + typical client GPU can handle.
7. **Ambient underwater audio** — sourcing license-clear looping bubbler/filter hum, gentle water ambience, and optional soft music; Web Audio API spatialization basics.

Record the license of every asset/source you plan to use. **Prefer CC0 / permissive.** Do not ship anything with unclear licensing.

---

## Phase 1 — Architecture & Tooling

Pick and set up the stack based on research. Sensible default (override if research says better):

- **Rendering engine:** Three.js (WebGL2, WebGPU when available) — or Babylon.js if research favors its built-in PBR/water. Justify the pick in `RESEARCH.md`.
- **Build tooling:** Vite. Framework: React + TypeScript for UI/state; render loop in a dedicated engine module. Keep the 3D engine decoupled from React (imperative canvas, React only for the control UI/HUD).
- **State/persistence:** Zustand (or similar) for app state; **localStorage/IndexedDB** to save and reload the visitor's tank configurations — no backend required.
- **Output:** A **fully static site** (this matters for NAS). No server runtime needed at request time.
- **Deployment:** Use the **`deploy-static-site-ghcr` skill** — containerize with Docker, push image to ghcr.io via GitHub Actions, and let Watchtower on the NAS (Portainer) auto-update the running container. If the NAS specifics are needed, use the **`NAS-Home` skill** to load server context. Confirm the site is reachable on the NAS at the end.
- **Code quality:** TypeScript throughout, ES modules, clear comments (I'm learning — explain non-obvious rendering/shader/behavior code), basic error handling with comments on failure modes, and a README covering how to run, build, add a new fish/plant, and redeploy.

Repository hygiene: init git, meaningful commits per phase, `.gitignore`, and a `LICENSES.md` crediting every asset.

---

## Phase 2 — The Aquarium Scene (Photorealism Core)

Build the underwater renderer first — this is the make-or-break of "photoreal":

- **Water & light:** PBR pipeline, HDRI-based lighting, animated **caustics** projected onto substrate and fish, **volumetric god-ray** light shafts from the surface, depth-based color absorption/fog (things get bluer/dimmer with distance), soft refraction at the glass and surface, and a subtly rippling water surface.
- **The tank:** Realistic glass with subtle reflection/refraction and edge highlights, chosen substrate (sand/gravel/black sand), a realistic background (natural, planted-tank, reef, or black), and a rear glass with faint reflections. Optional visible equipment: heater, air stone streaming bubbles, filter outflow that drives the current field.
- **Particulate & bubbles:** Gentle drifting "marine snow," rising bubble columns from the air stone, and occasional bubble streams — all GPU particles.
- **Camera:** Slow, calming default drift/orbit; user can drag to look around and scroll to zoom; a "cinematic" auto-camera mode; and a still "just watch" mode. Never nausea-inducing.

Ship a quality-settings menu (Low/Medium/High/Ultra + auto-detect) that scales particle counts, shadow/caustics resolution, god-ray samples, and max fish so it runs smoothly on modest hardware while looking stunning on good hardware.

---

## Phase 3 — Living Fish

- Load rigged glTF fish; drive **procedural swim animation** (tail-beat frequency scales with speed, body undulation, banking into turns, pectoral-fin fluttering while hovering).
- Implement **behavior archetypes** from research and assign them per species: schooling (boids: cohesion/alignment/separation), solitary/territorial (patrols a zone, mild chase-away), bottom-dweller (hugs substrate, forages), mid-water hoverer, ambusher (rests, darts), nocturnal (more active in night mode), surface-dweller. Add subtle idle behaviors: gill movement, pausing, investigating decor, occasional darts, resting on the bottom for catfish/plecos.
- **Current field** from the filter gently pushes fish and plants; fish orient into or drift with flow realistically.
- Respect **stocking realism**: tank size caps total bioload; the UI gently warns (not blocks) on overstocking or incompatible/predator-prey combos, with a plain-language explanation.
- Use **GPU instancing / LOD** so a big schooling tank stays at 60fps.

## Phase 4 — Living Plants, Corals & Cleanup Crew

- Freshwater: swaying stem plants, carpeting plants, mosses, floating plants — vertex-shader sway driven by the current field and light.
- Saltwater: **soft corals & anemones that pulse/sway**, plus reef rock; hard corals as static-but-textured photoreal decor.
- **Cleanup crew / inverts:** snails grazing the glass, shrimp foraging, crabs (saltwater), a cleaner fish — small touches that sell "alive."
- Decor library: driftwood, rocks, reef structures, optional playful props (sunken ship, castle) toggled by the user.

---

## Phase 5 — Full Visitor Customization (core requirement)

Give the visitor a clean, elegant control panel to **build their own tank**:

1. **Water type:** Freshwater vs. Saltwater — swaps the entire available species/plant/decor library, water tint, and lighting mood.
2. **Tank size:** Selectable (nano → XL, ideally a continuous slider with named presets); physically resizes the scene, camera framing, substrate, and stocking capacity.
3. **Fish selection:** Fully selectable, searchable/filterable library (by type, size, temperament, color, care level). Add N of a species; see a live count and remaining capacity. Show a **species info card** (photo, common/scientific name, adult size, temperament, natural habitat, fun fact) — educational and part of the joy.
4. **Plant/coral selection:** Fully selectable library, place freely or auto-arrange.
5. **Substrate, background, decor, lighting mood:** all selectable.
6. Everything updates the **live scene in real time**. **Save/Load/Name multiple tanks** to localStorage; a "randomize/surprise me" button; sensible starter presets (e.g., "Amazon Community," "Nano Planted," "Reef Lagoon," "Goldfish Classic").

Design the UI to be beautiful and unobtrusive — it can hide entirely into a pure full-screen "watch" experience.

---

## Phase 6 — Extra Features (include these — they elevate it)

- **Day/night cycle:** Smooth lighting transition; optional sync to real local time; moonlight/actinic blue night mode where nocturnal species get active and others rest. Sunrise/sunset warm light through the god rays.
- **Feeding interaction:** Click/tap the surface to drop food flakes/pellets; fish detect and swim to eat, competing realistically; food sinks for bottom-feeders. Satisfying and calming.
- **Tap-a-fish:** Click any fish to gently follow it with the camera and show its info card; optional "name your fish."
- **Ambient audio:** Toggleable looping water/bubbler ambience and optional soft music, with volume control (muted by default; respects autoplay policies).
- **Ambient / screensaver mode:** Full-screen, UI-hidden, slow cinematic camera — ideal for leaving on a TV or second monitor. Add a lightweight "kiosk"/idle mode.
- **Photo mode:** Hide UI, frame a shot, and download a screenshot/wallpaper.
- **Performance HUD (dev-toggle):** FPS/mesh counts for tuning.
- **Accessibility & comfort:** Respect `prefers-reduced-motion` (calmer camera, gentler effects), keyboard navigation for the control panel, sufficient contrast on UI, and captions/labels. (Consider consulting the accessibility guidance while building.)
- **Responsive:** Works on desktop, tablet, and phone, and gracefully lowers quality on mobile GPUs.
- **Shareable config:** Encode a tank setup into a URL so a visitor can share their build.

---

## Phase 7 — Verify, Polish, Deploy

- Test across Chrome/Firefox/Safari and desktop/mobile; verify 60fps on the default quality tier and graceful degradation.
- Verify every interactive feature works: build a tank, save/load, feed, day/night, audio, photo mode, screensaver.
- Confirm freshwater and saltwater libraries are both fully populated with license-clear assets and correct behaviors/compatibility.
- Write the README + `LICENSES.md` + a short "how to add a new species" guide.
- **Deploy to the NAS** via the `deploy-static-site-ghcr` skill; confirm the container is running under Portainer and the site loads on the NAS. Report the final URL/port and how to reach it.

---

## Definition of Done

The aquarium looks convincingly photoreal, fish and plants move like they're alive, a visitor can fully customize water type / tank size / fish / plants / decor with real-time results, all extra features work, and the site is **live on the NAS**. Deliver it complete — keep working through the `/goal` run until every checklist item is done.

---

### Notes on judgment calls
- If truly photoreal rigged models for a species aren't license-clear, curate a **smaller set of gorgeous, well-behaved species** rather than shipping ugly placeholders — quality over quantity.
- Prefer WebGPU where available for the best water/caustics, with a solid WebGL2 fallback.
- Keep it **static** so the NAS just serves files — no request-time backend.
- Comment the shader, boids, and behavior code clearly; I'm learning and want to understand how the realism is achieved.
