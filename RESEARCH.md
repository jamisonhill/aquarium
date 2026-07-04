# RESEARCH.md — Photorealistic Interactive Virtual Aquarium

> Research to drive engine, asset, behavior, and architecture decisions for a static-site, browser-based, photorealistic virtual aquarium deployed on a home NAS. Compiled from four parallel web-research passes (2025–2026 tooling landscape). Every non-obvious claim is cited inline. Treat vendor/blog percentages as directional; engine capabilities, API versions, and physics formulas are the load-bearing, well-corroborated claims.

## TL;DR — Decisions this research supports

- **Engine:** Three.js using the **WebGPU renderer with automatic WebGL2 fallback** (`import * as THREE from 'three/webgpu'`, available since r171). Ecosystem breadth wins for a custom shader-heavy photoreal look.
- **Photoreal look:** PBR (`MeshPhysicalMaterial` transmission) + HDRI/IBL (ready-made) → layer **custom** caustics, per-channel depth color absorption/fog, and marine-snow particles → add god-rays + bloom from the `pmndrs/postprocessing` ecosystem.
- **Fish at scale:** `InstancedMesh` (or `BatchedMesh` for multiple species) animated by **baked Vertex Animation Textures (VAT) or procedural vertex-shader undulation** — never per-fish skeletal animation at scale. Wrap in device-based quality tiers with adaptive DPR.
- **Fish motion physics:** sine-wave body undulation, `A ≈ 0.2·L`, `λ ≈ 0.7–1.1·L`, `U ≈ 0.7·L·f`; modulate **frequency, not amplitude**; validate Strouhal `St = fA/U` lands in **0.2–0.4**.
- **Schooling:** Reynolds boids — normalized separation/alignment/cohesion, weights ~**2.0 / 0.5 / 0.5**, separation radius < cohesion radius, limited FOV, weak cohesion, shared wander goal.
- **Plants/soft corals:** one shared **flow field** (jet cones + curl-noise) drives height-masked vertex sway; pulsing Xenia is self-driven; hard coral is rigid; fish face into the current (rheotaxis) from the same field.
- **Assets:** Free *photoreal rigged* fish are scarce. Base set = Khronos **BarramundiFish** (CC0, rigged) + **Quaternius** Animated Fish (CC0, rigged), retextured with CC0 PBR maps. Curate a small, polished species set. Textures/HDRIs from **Poly Haven** + **ambientCG** (CC0). Audio from **Freesound-CC0** + **Pixabay**.
- **Stocking model:** don't use "1 inch per gallon." Base capacity on **filtration + surface area**, per-species **bioload ∝ adult mass (~length³)**, plus behavioral gates (schooling minimums, territory, mouth-size predation).

---

# AREA 1 — Rendering Engine & Photorealistic Underwater Rendering

## 1.1 Engine comparison: Three.js vs Babylon.js vs PlayCanvas

| Factor | Three.js | Babylon.js | PlayCanvas |
|---|---|---|---|
| PBR materials | `MeshStandardMaterial` / `MeshPhysicalMaterial` out of the box (transmission, IOR, clearcoat, sheen) | Full PBR out of the box; often the most spec-accurate glTF/PBR viewer | Game-oriented PBR; strongest raw frame-rate, especially mobile |
| Built-in water / postFX | Water/Water2 examples + huge addon postprocessing ecosystem, but you assemble it | "Configured, not assembled" — more batteries-included | Editor-driven; less standalone effect library |
| WebGPU | Zero-config `three/webgpu` with automatic WebGL2 fallback (r171, Sept 2025) | WebGPU since 5.0 (2022), native WGSL shaders (2024) | WebGPU support, transparent |
| Ecosystem | ~300× the weekly downloads of the others, 5,000+ packages, 93k+ stars | ~200+ packages; strong first-party docs/tools | Smaller; team/editor-focused |
| Learning curve | Steeper — wire up architecture yourself | Gentler — more abstracted | Editor lowers the barrier for teams/artists |

Sources: [utsubo comparison](https://www.utsubo.com/blog/threejs-vs-babylonjs-vs-playcanvas-comparison), [MoldStud](https://moldstud.com/articles/p-threejs-vs-other-3d-libraries-why-threejs-is-your-best-choice-for-next-project), [Jessy Leite GLB test](https://jessyleite.dev/posts/glb-viewer-rendering-engines/), [Babylon WebGPU docs](https://doc.babylonjs.com/setup/support/webGPU), [VR.org WebGPU baseline](https://vr.org/articles/webgpu-baseline-2026-three-js-webxr-default).

**Recommendation: Three.js (WebGPU renderer + automatic WebGL2 fallback).** The aquarium is heavy on custom shaders (caustics, god-rays, depth fog, marine snow); Three.js's dominant ecosystem (`pmndrs/postprocessing`, drei `MeshTransmissionMaterial`, published water/underwater kits) means most effects exist as drop-in code ([utsubo](https://www.utsubo.com/blog/threejs-vs-babylonjs-vs-playcanvas-comparison), [drei MeshTransmissionMaterial](https://drei.docs.pmnd.rs/shaders/mesh-transmission-material)). WebGPU is now low-risk in Three.js ([forum](https://discourse.threejs.org/t/r3f-webgpu-webgl2-fallback-tree-shaking/87188)). Choose **Babylon.js** instead for a gentler batteries-included curve ([LogRocket](https://blog.logrocket.com/three-js-vs-babylon-js/)); **PlayCanvas** only if a visual editor or absolute mobile frame-rate is the priority.

## 1.2 WebGPU vs WebGL2 (2025–2026)

- **Support:** WebGPU shipped Chrome/Edge first, then Safari 26 (mid-2025) and Firefox 141 (July 2025), reaching effective cross-browser "baseline" by early 2026 (~95% coverage cited; treat as directional) ([web.dev](https://web.dev/blog/webgpu-supported-major-browsers), [MDN WebGPU](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API), [byteiota](https://byteiota.com/webgpu-2026-70-browser-support-15x-performance-gains/)).
- **Why WebGPU:** better modern-GPU utilization, compute shaders (GPU-side fish animation/particles), lower CPU overhead via render bundles (Babylon cites up to ~10× in some cases) ([Wikipedia](https://en.wikipedia.org/wiki/WebGPU), [Babylon docs](https://doc.babylonjs.com/setup/support/webGPU)).
- **Rule:** feature-detect `navigator.gpu`; WebGPU when present, always ship WebGL2 fallback. Automatic in Three.js's WebGPU renderer.

## 1.3 Techniques for a photorealistic underwater look

Legend — **Ready-made** = Three.js addon/example or well-known lib; **Custom** = your own shader.

| Technique | What it does | Availability |
|---|---|---|
| PBR materials | Physically correct coral, glass, wet rock, fish | Ready-made — `MeshStandardMaterial`/`MeshPhysicalMaterial` core |
| HDRI / IBL lighting | Env map drives ambient light + reflections (strongly recommended) | Ready-made — "always specify an environment map" for `MeshPhysicalMaterial` ([docs](https://threejs.org/docs/pages/MeshPhysicalMaterial.html)) |
| Refraction / transmission | Glass walls, water surface, translucent jellyfish | Ready-made — `transmission`/`thickness`/`ior`; drei `MeshTransmissionMaterial` ([Codrops glass](https://tympanus.net/codrops/2021/10/27/creating-the-effect-of-transparent-glass-and-plastic-in-three-js/)) |
| Real-time caustics | Shifting refracted light on sand/floor | Mostly custom — GLSL projecting light through animated surface ([Renou caustics](https://medium.com/@martinRenou/real-time-rendering-of-water-caustics-59cda1d74aa)); cheaper: scrolling caustics texture projected on floor |
| Volumetric god-rays | Sunbeams through the water column | (a) fake additive cone meshes, or (b) screen-space raymarched via [`three-good-godrays`](https://github.com/Ameobea/three-good-godrays) |
| Depth color absorption & fog | Red absorbed first; scene shifts blue-green with distance (Beer–Lambert) | Custom — per-channel exponential attenuation; built-in `FogExp2` handles falloff but not per-channel absorption |
| Screen-space reflections | Reflections off surface/glass | Ready-made-ish — `SSRPass` addon, heavier separate pass (env-map reflections are the cheaper default) |
| Marine snow / particulates | Drifting suspended particles selling depth | Custom — instanced/point-sprite slow drift + depth fog |
| Bloom | Soft glow on highlights/god-ray tips | Ready-made — `UnrealBloomPass` |

Assemble via `EffectComposer` or the higher-performance `pmndrs/postprocessing` library: RenderPass → god-rays → bloom → underwater color/fog final pass ([postprocessing npm](https://www.npmjs.com/package/postprocessing)). Reference implementations combining caustics/god-rays/depth-fog/Snell's window: [Tidewater ocean kit](https://ilikekillnerds.com/2026/05/21/i-built-tidewater-threejs-ocean-kit/), [Three.js Water Pro](https://threejsroadmap.com/assets/threejs-water-pro).

---

# AREA 2 — Performance for Many Animated Meshes at 60fps

## 2.1 Core techniques

- **GPU instancing (`InstancedMesh`)** — thousands of copies in a **single draw call** with per-instance transforms. 1,000 fish as meshes = 1,000 draw calls; as `InstancedMesh` = 1 ([docs](https://threejs.org/docs/pages/InstancedMesh.html)). Biggest single win for schools.
- **`BatchedMesh` (r156+)** — instancing with **different geometry** per instance sharing one material; use for multiple distinct fish models ([Wael Yasmina](https://waelyasmina.net/articles/batchedmesh-for-high-performance-rendering-in-three-js/)).
- **Animating the crowd** — `SkinnedMesh` skeletal animation does **not** combine cleanly with instancing; CPU-bottlenecks at ~100–1,000 skinned meshes ([thread](https://discourse.threejs.org/t/optimization-of-large-amounts-100-1000-of-skinned-meshes-cpu-bottlenecks/58196)). Scalable options:
  - **Vertex Animation Textures (VAT)** — bake the swim cycle into a texture, drive vertices in the vertex shader; one draw call for the whole crowd.
  - **Procedural vertex-shader deformation** — sine bend + per-instance phase/scale/rotation offset gives natural non-synchronized swimming from one base mesh. Cheapest, very effective.
- **LOD** — swap high-poly for low-poly with distance.
- **Frustum culling** — on by default; add octree/BVH spatial partitioning for large scenes.
- **Texture atlasing** — pack textures so objects share a material → fewer draw calls.
- **Draw-call reduction** — highest-leverage optimization; instancing + merging + atlasing can cut 90%+.
- **Quality tiers / adaptive DPR** — detect capability; scale render resolution, particle counts, postFX passes, shadow quality; drop DPR/effects when frame time exceeds the ~16.7ms budget ([utsubo 100 tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips)).
- **Mobile** — fill-rate/bandwidth limited; reduce SSR, raymarched god-rays, and transmission first (`MeshPhysicalMaterial` transmission is expensive per pixel — gate behind quality tier).

## 2.2 Budgets and practical fish counts

- **Draw-call budget:** target **< 100 on desktop, < 50 on mobile**; above ~500 even powerful GPUs struggle.
- **Fish counts:** with instancing + GPU vertex/VAT animation + LOD, plan for **several thousand animated fish on desktop** and **hundreds to ~1–2k on mid-range mobile** at 60fps with low-poly models. Non-instanced skinned meshes bottleneck at ~100–1,000. Validate against the 16.7ms budget by profiling, not a fixed figure.

---

# AREA 3 — Realistic Fish Locomotion & Behavior

## 3.1 Procedural body undulation

Propagate a traveling sine wave down the spine, amplitude growing toward the tail:

```
offset(s, t) = A(s) · sin(2π·(s/λ − f·t) + φ)
```

`s` = arc-length (0 nose → 1 tail), `A(s)` = tail-growing amplitude envelope, `λ` = wavelength, `f` = tail-beat frequency, `φ` = per-fish phase ([CS.UBC — Animation of Fish Swimming](https://www.cs.ubc.ca/sites/default/files/tr/2001/TR-2001-19_0.pdf)).

**Biological parameters** ([Nature Comms 2023 / PMC10492801](https://pmc.ncbi.nlm.nih.gov/articles/PMC10492801/), [arXiv 2301.10466](https://arxiv.org/pdf/2301.10466)):

- **Speed `U ≈ 0.7·L·f`** (factor 0.4–1). Master coupling: raise `f`, fish visibly speeds up.
- **Wavelength `λ ≈ L`** (0.74·L eels/anguilliform → 1.14·L tuna/thunniform).
- **Tail amplitude `A ≈ 0.2·L`** — roughly constant across sizes.
- **Frequency:** small fish ~2 Hz cruise → ~20 Hz burst; larger `f ∝ 1/L`.
- **Rule:** change speed by modulating **frequency, not amplitude** ([Bainbridge/JEB](https://journals.biologists.com/jeb/article/35/1/109/13233/The-Speed-of-Swimming-of-Fish-as-Related-to-Size)).
- **Strouhal check:** natural swimming keeps `St = f·A/U` in **0.2–0.4** (peak ~0.25–0.35). Following the rules above yields `St ≈ 0.29` automatically ([arXiv 1102.0223](https://arxiv.org/pdf/1102.0223)). Use as a validation target.

**Undulation modes by body shape** ([Wikipedia — Fish locomotion](https://en.wikipedia.org/wiki/Fish_locomotion)):

| Mode | Example | What undulates | Feel |
|---|---|---|---|
| Anguilliform | eels, kuhli loach | whole body, even amplitude | slinky, λ≈0.6L |
| Subcarangiform | trout, tetras, danios | rear half | classic fish swim |
| Carangiform | jacks, many cichlids | rear third + tail | fast, stiffer |
| Thunniform | tuna, mackerel | tail + peduncle only | high-speed, near-rigid |
| Ostraciiform | boxfish | tail only, rigid body | wagging tail |

## 3.2 Banking, turning, hovering

- **Banking:** roll body into turns like an aircraft; bank ∝ turn rate × speed ([Reynolds — Steering Behaviors](https://www.red3d.com/cwr/steer/gdc99/)).
- **Pectoral fins = steering wheel** for turns, balance, fine maneuvers.
- **Hovering:** a stationary fish is intrinsically unstable and must continuously scull its pectoral fins — never freeze a "still" fish; show gentle continuous pectoral motion + small gill/tail corrections ([Purdue — Pectoral Fin Attitude Control](https://engineering.purdue.edu/~xdeng/ICRA11.pdf)).

## 3.3 Boids / flocking (Reynolds)

Three steering forces ([Reynolds GDC99](https://www.red3d.com/cwr/steer/gdc99/)):

1. **Separation** — steer from too-close neighbors; sum `(self − neighbor)` with 1/r weighting.
2. **Alignment** — steer toward average neighbor heading.
3. **Cohesion** — steer toward neighbor center of mass.

**Combine well:** normalize each of the three, then multiply by weights before summing. Add goal-seek, wander (idle drift), obstacle avoidance. Neighborhood = **distance radius AND angular FOV** (fish can't see directly behind).

**Typical parameters** (tune to scale): separation radius < alignment/cohesion radius; weights ~**separation 2.0, alignment 0.5, cohesion 0.5** (separation dominates) ([BIO Web of Conferences](https://www.bio-conferences.org/articles/bioconf/pdf/2024/11/bioconf_icmmbt2023_01016.pdf), [Unity Boids](https://github.com/BrianLDev/Boids-Unity)). Cohesion deliberately weak. Natural look: limited FOV, cap max speed/steering, weak cohesion, slow wander + shared loose goal point so the school drifts as a body, mild per-fish speed variation. Spatial hashing/octree keeps it real-time.

## 3.4 Per-species behavior archetypes

Give each fish a **home/anchor point + preferred depth band + behavior weight set**.

| Archetype | Examples | Activity | Zone | Grouping | Motion notes |
|---|---|---|---|---|---|
| Schooling | neon/cardinal tetra, rasbora, danio | near-constant; darts when startled | mid | tight 6+ | full boids, high alignment |
| Solitary/territorial | betta, many cichlids | slow cruise; bursts to defend | mid–top | 1 / 1 male | no boids; patrol + display; territory anchor |
| Bottom forager | corydoras, plecos, loaches | corys active in groups; plecos graze | bottom | corys 6+; plecos solo | substrate-hugging, snout-down, rest on décor |
| Mid-water hoverer | angelfish, gouramis | slow, graceful, long hovers | mid | pairs/loose | pectoral sculling to hold station |
| Surface-dweller | hatchetfish | nervous, jumpy | top | shoal | hang under surface film, skittish darts |
| Nocturnal/lurker | kuhli loach, catfish | hidden by day, active at night | bottom/hiding | active in 6+ | day: tuck in décor; night: roam |
| Cleaner | cleaner shrimp/wrasse | fidgety at fixed spot | station | at stations | anchored, twitchy grooming; fish pause to be cleaned |

---

# AREA 4 — Plants, Soft Corals & Anemones

## 4.1 Vertex-shader sway for aquatic plants

Displace vertices in the vertex shader with sine/cosine driven by world position + time, masked by height so the base stays rooted ([Linden Reid — Waving Grass](https://lindenreidblog.com/2018/01/07/waving-grass-shader-in-unity/)):

- **Time-scrolled sample:** `samplePos += time · windSpeed` so waves travel across the planted area coherently.
- **Displacement:** `pos.x += cos(waveSpeed·windSample)·waveAmp; pos.z += sin(...)·waveAmp`.
- **Height mask (critical):** multiply displacement by `pow(vertex.y, heightFactor)`, zero below a cutoff — roots anchored, tips move most.
- **Coherent field:** normalize by world position so separate meshes read as one flow.
- **Organic flow:** drive "wind" with **3D Perlin/simplex noise** in world space instead of pure sine ([Dynamic Kelp](https://seasaltcrackers.wordpress.com/2021/09/24/dynamic-kelp-in-unity/)).

**Differentiate by plant type:** tall stems/kelp = strong height falloff, big tip amplitude, low freq, leaves trail the stalk; carpets = small amp, higher freq ripple; mosses = tiny amp, high-freq jitter, no directional bend; floating plants = bob at surface, drift horizontally with current (not rooted bending).

## 4.2 Soft corals & anemones vs rigid hard corals

Physical basis: soft corals have **no CaCO₃ skeleton** (flexible, mobile polyps); hard corals have a **rigid skeleton** (static) ([Pacific East — Soft Coral 101](https://pacificeastaquaculture.com/blogs/aquaculture/soft-coral-101)).

- **Pulsing soft corals (Xenia):** polyps rhythmically open/close feathery tentacles — animate as an **independent rhythmic open/close cycle per polyp** with offset phases, **decoupled from the current** (this motion is self-driven) ([ReefBay — Xenia](https://reefbay.com/guides/complete-xenia-coral-care-guide-the-pulsing-soft-coral)).
- **Non-pulsing soft corals & anemones:** flexible tentacles **drift passively with the flow field** — same vertex-sway as plants but softer, rounder, slower, strong tip mask. Anemones: per-tentacle phase offsets + noise so they don't move in lockstep.
- **Hard corals:** rigid/static; only tiny feeding polyps flutter — skeleton must not deform.

## 4.3 Current field (single source of truth)

Two real-tank flow archetypes: **powerhead/filter return** = focused directional jet decaying with distance; **circulation/wave pump** = broad gentle flow ([Fish Tank World](https://www.fishtankworld.com/aquarium-circulation-pump/)).

**Model cheaply:** a **vector velocity field** = a few directional **jet cones** (return nozzles) blended with a low-magnitude **global curl-noise** field for ambient drift.

**Drives everything from one field:**
- **Plants/soft corals:** feed local flow vector into the vertex-shader wind term — plants nearest the outlet lean hardest, dead-spot mosses barely move.
- **Fish (rheotaxis):** fish tend to face into the current — bias heading upstream, stronger in high-flow zones; weak swimmers seek low-velocity regions (toward décor/shadow). One shared field for plants + fish makes the scene read as a single coherent body of water.

---

# AREA 5 — License-Clear Assets

**Headline reality:** free *photoreal rigged* fish in glTF/GLB are genuinely scarce. Abundant free fish are either low-poly-and-rigged (Quaternius, poly.pizza) or photoreal-but-static (Sketchfab scans). Plan to curate a small species set and do some rigging/texturing yourself.

## 5.1 License primer
- **CC0** — public domain, no attribution, best case.
- **CC-BY** — free + commercial but **must credit author (and often the platform)**; attribution follows the asset to end users.
- **CC-BY-NC / -ND / -SA** — avoid (NC blocks commercial, ND blocks modification/rigging, SA forces relicensing).
- **"Royalty-free" (TurboSquid/CGTrader)** — NOT CC0; typically **may not redistribute the raw file**. A static site serves the GLB to the browser (downloadable via network tab), likely violating "no open-format redistribution." **Risky for web delivery.**

## 5.2 3D model sources

| Source | License | Format | Fish? | Plants? | Rigged? |
|---|---|---|---|---|---|
| **Khronos glTF-Sample-Assets** | CC0 | GLB+glTF | Yes (BarramundiFish) | No | **Yes, rigged+animated** |
| **Quaternius** | CC0 | FBX/OBJ/Blend→GLB | Yes (7 species) | Yes (nature packs) | **Yes, animated** |
| **poly.pizza** | mostly CC0, some CC-BY | GLB+FBX | Yes | Yes | Some |
| **Sketchfab** | per-asset (CC0/CC-BY/other) | GLB/glTF export | Many | Yes | Some rigged, many static |
| **Poly Haven** | CC0 | GLB | **No fauna** | Trees/plants only | N/A |
| **Kenney** | CC0 | GLB/OBJ/FBX | Limited | Limited | Rarely |
| **Fab (Epic)** | CC-BY free tier + paid | FBX/glTF/USDZ | Varies | Yes (Megascans) | Varies |
| **TurboSquid/CGTrader free** | royalty-free / seller CC | Varies | Yes | Yes | Some — **redistribution caveat** |

- **Khronos [BarramundiFish](https://github.com/KhronosGroup/glTF-Sample-Assets/blob/main/Models/BarramundiFish/README.md)** — CC0, rigged+animated `.glb`. The single cleanest photoreal-ish rigged fish. One species — perfect reference/base.
- **[Quaternius Animated Fish](https://quaternius.com/packs/animatedfish.html)** — CC0, 7 rigged species + 150+ nature/plant models. Low-poly; ideal base to retexture with PBR. Convert FBX→GLB in Blender.
- **[poly.pizza](https://poly.pizza/search/CC0)** — Google Poly successor; serves GLB directly, per-model license (mostly CC0; CC-BY still needs credit).
- **[Sketchfab](https://sketchfab.com/tags/cc0)** — filter Downloadable + CC0/CC-BY; CC-BY requires crediting author **and Sketchfab**; watch **Editorial** licenses; photoreal fish are usually **static scans** (good for decor/coral, need rigging to swim).
- **[Poly Haven](https://polyhaven.com/models)** — all CC0 GLB but **no fauna**; use for props/substrate scans + textures/HDRIs.
- **[Fab](https://www.fab.com/)** — free CC-BY tier; 1,500+ free Megascans (plants/rock); verify each item's license tab (Megascans EULA historically restricts standalone redistribution — use CC-BY-tagged items).

## 5.3 Fallback strategies (recommended)
1. **Retexture CC0 low-poly rigged fish** (Quaternius + BarramundiFish) with photoreal PBR maps → rigged + photoreal without licensing risk.
2. **Curate a small, high-quality set (6–12 fish)**; rig each once; instance + vary scale/tint for schooling.
3. **Rig your own** — static photoscan → simple 3–5 bone spine → sine-wave swim in code.
4. **Procedural motion + photoreal materials** — plants skip rigging (vertex-shader sway on textured cards); bubbles/caustics/particles are code, not models.
5. **Blender pipeline** — convert FBX/OBJ CC0 → GLB with Draco compression; bake textures to keep draw calls low.

## 5.4 Textures & HDRIs (all effectively CC0)

| Source | License | Notes |
|---|---|---|
| **[Poly Haven](https://polyhaven.com/textures)** | CC0 | PBR sets + HDRIs; sand/gravel, rock, driftwood/bark, glass, HDRI env maps for IBL |
| **[ambientCG](https://ambientcg.com/list)** | CC0 | 2000+ materials + HDRIs; sand, gravel, rock, **tileable water normal maps** for animated ripple |
| **cc0textures.com** | CC0 | Now same project as ambientCG |
| **Poliigon (free)** | Poliigon license (NOT CC0) | Commercial OK but **no redistribution of raw files** — avoid for a static site; prefer CC0 |

No CC0 library has deep **coral** texture sets — use ambientCG rock + color grading, Sketchfab CC0 coral scans, or CC-BY Megascans coral surfaces. Attribution: Poly Haven + ambientCG require none (CC0).

## 5.5 Ambient audio

| Source | License | Attribution | Notes |
|---|---|---|---|
| **[Freesound](https://freesound.org/)** | per-sound (filter to CC0) | depends | CC0 filter = no obligations |
| **[Pixabay audio](https://pixabay.com/sound-effects/search/underwater/)** | Pixabay Content License | none | Safe commercial; functionally attribution-free |
| **[OpenGameArt](https://opengameart.org/content/cc0-sound-effects)** | per-asset (use CC0 collections) | depends | Avoid GPL-only audio |
| **Zapsplat** | free Standard | **credit "ZapSplat" required** | Attribution-free needs paid tier |

Concrete CC0 finds: [Underwater Loop AMB (366159)](https://freesound.org/s/366159/), [Underwater Ambience (482167)](https://freesound.org/people/Tim_Verberne/sounds/482167/), [Underwater Ambience (504641)](https://freesound.org/people/Fission9/sounds/504641/). For bubbler/air-stone/filter hum, search Freesound with the CC0 filter. Keep a `CREDITS.md` for any CC-BY/Zapsplat sounds.

### Web Audio API implementation notes
- **Autoplay policy (#1 gotcha):** an `AudioContext` created outside a user gesture starts `"suspended"`; call `audioContext.resume()` from inside a click/tap. Gate audio behind a "Tap to enter" / mute toggle ([MDN best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)).
- **Seamless looping:** decode to `AudioBuffer`, play via `AudioBufferSourceNode` with `source.loop = true` (gap-free, unlike `<audio loop>`). Buffer source is one-shot — create a new one per (re)start; `loopStart`/`loopEnd` control the region.
- **Volume:** route through a `GainNode`; chain `source → gain → panner → destination`; ramp with `linearRampToValueAtTime` to avoid clicks.
- **Spatialization:** `PannerNode` (set `positionX/Y/Z` to the air stone / fish; update `AudioListener` to the camera; HRTF model for convincing 3D). `StereoPannerNode` is lighter for simple placement.
- **Pattern:** one always-on CC0 underwater bed (looped, low gain) + spatialized bubbler `PannerNode` at the air stone + optional filter hum; master gain on a mute toggle; suspend context on tab-blur, resume on focus.

---

# AREA 6 — Aquarium Domain Knowledge (stocking, sizes, compatibility)

## 6.1 Tank size categories

| Category | Volume (gal) | Volume (L) | Role |
|---|---|---|---|
| Nano | ~1–15 (often <10) | ~4–57 | Desktop, shrimp, betta, nano reef |
| Small | ~10–20 | ~38–76 | First community tank |
| Medium | ~20–40 | ~76–150 | Beginner "sweet spot", most flexible |
| Large | ~50–125 | ~190–475 | Cichlids, big schools, reef displays |
| XL | 120–250+ | ~450–950+ | Show tanks, large/aggressive fish, tangs |

Standard US sizes (L×W×H in, ~L): 5g 16×8×10 (~19); 10g 20×10×12 (~38); 20g long 30×12×12 (~76); 20g high 24×12×16 (~76); 29g 30×12×18 (~110); 40g breeder 36×18×16 (~151); 55g 48×13×21 (~208); 75g 48×18×21 (~284); 90g 48×18×24 (~340); 120g 48×24×24 (~454); 125g 72×18×22 (~473). Sources: [AquariumStoreDepot](https://aquariumstoredepot.com/blogs/news/aquarium-sizes), [Tankarium](https://www.tankarium.com/aquarium-dimensions-sizes-and-weights/).

**Sim tip:** equal-volume tanks differ by shape — wide/shallow (40 breeder, 20 long) has more surface area → more fish + swimming room than tall/narrow. Encode **footprint + surface area**, not just volume ([App-Aquatic](https://app-aquatic.com/guide-one-inch-per-gallon-myth.html)).

## 6.2 Stocking model (why "1 inch/gallon" fails)

The classic "1 inch per gallon" rule is unreliable ([FishTankMastery](https://fishtankmastery.com/overstocking-aquarium-myth-1-inch-gallon-rule/)): bioload scales with **mass/metabolism, not length** (a fish 6× longer ≈ ~200× the waste); body shape matters; **filtration is the real limiter**; surface area governs oxygen; behavior/territory is invisible to length.

**Encode this practical model:**
1. Base capacity from **filtration capacity + surface area**, not raw gallons.
2. Per-species **bioload weight ∝ adult mass** (≈ length³ × body-shape factor).
3. Modifiers: planted tanks +capacity; goldfish/large cichlids/plecos cost extra; messy eaters raise it.
4. **Behavioral gates** (schooling minimums, territory radius, adult vs juvenile) that can veto a stocking even when bioload math passes.
5. Reserve headroom — overstocking degrades water quality even at "legal" volume.

## 6.3 Freshwater vs saltwater (sim-relevant)

| Dimension | Freshwater | Saltwater/Reef |
|---|---|---|
| Water look | Clear; optional **tannin amber "blackwater"** slider | Prized **crystal blue-white**; blue-shift under actinic LED |
| Sessile life | Rooted/attached **plants** | **Corals** + anemones (strong light + flow) |
| Inhabitants | tetras, rasboras, barbs, danios, livebearers, gouramis, cichlids, corys, shrimp, snails | clownfish, tangs, gobies, blennies, cardinalfish, wrasses; cleaner shrimp, snails, hermits |
| Difficulty | Lower cost, forgiving | Higher cost/complexity, less forgiving |

**Sim tip:** freshwater = clear↔amber tint slider + green plant masses; reef = blue-shifted light, coral glow, clear water default.

## 6.4 Compatibility

**Schooling minimums** (bigger is better): neon/cardinal tetra 6 (8–12 ideal); harlequin rasbora 6–8; zebra danio 6–8+; corydoras 6+ (10–12 shows schooling); rummynose 6+ (10+ ideal); rainbowfish 6+; chromis odd 5–7. A lone schooler should trigger a stress/aggression penalty ([API schooling](https://apifishcare.com/post/the-ins-and-outs-of-schooling-fish), [AquariumStoreDepot](https://aquariumstoredepot.com/blogs/news/schooling-fish)).

**Aggression/territory:** most cichlids territorial (Oscar, Jack Dempsey, red devil); male bettas fight to the death; **larger tanks dilute aggression** — tank size is the biggest lever ([Tankarium](https://www.tankarium.com/semi-aggressive-fresh-water-fish/), [Exotastic](https://exotastic.earth/territorial-fish-aggression/)).

**Predator–prey ("if it fits in the mouth, it's food"):** compare **mouth size vs tankmate body size**, not just temperament. Angelfish eat neon tetras; large cichlids eat any small fish; puffers eat shrimp/snails.

**Community vs species-only:** community = peaceful species across different zones (top/mid/bottom), each in its own school of 6; species-only/biotope for aggressive/specialized fish — flag species that can't join a community.

**Saltwater reef-safe vs not:** reef-safe = clownfish, most gobies, blennies, cardinalfish, many wrasses, tangs (with caveats); "with caution" = many dwarf angelfish (may nip); **not reef-safe** = most butterflyfish, large angelfish, many puffers/triggers. Offer a FOWLR mode to allow non-reef-safe fish ([ReefTankAdvisor](https://reeftankadvisor.com/reef-safe-fish/), [ExtremeCorals](https://www.extremecorals.com/blog/reef-safe-fish.html)).

## 6.5 Curated species lists

### Freshwater (~18 species)

| Species | Adult size | Temperament | Zone | Min group |
|---|---|---|---|---|
| Betta (male) | 2.5–3 in | Aggressive to own kind | mid/top, showy | 1 (solo) |
| Neon tetra | 1.5 in | Peaceful | mid, schooling | 6+ |
| Cardinal tetra | 2 in | Peaceful | mid, schooling | 6+ |
| Rummynose tetra | 2 in | Peaceful | mid, tight school | 6+ |
| Harlequin rasbora | 2 in | Peaceful | mid, schooling | 6+ |
| Guppy | 1.5–2.4 in | Peaceful, active | mid/top, livebearer | 3+ |
| Endler's livebearer | 1 in | Peaceful | mid/top | 3+ |
| Platy | 2–3 in | Peaceful | mid | 3+ |
| Tiger barb | 2–3 in | Semi-aggressive nipper | mid, active shoal | 6+ |
| Zebra danio | 2 in | Peaceful, very active | top/mid, fast shoal | 6+ |
| Dwarf gourami | 3.5 in | Peaceful (males spar) | top/mid, labyrinth | 1–2 |
| Pearl gourami | 4–5 in | Peaceful | top/mid | 1–2 |
| Angelfish | 6 in tall | Semi-aggressive; eats small fish | mid, tall | pair or 5+ |
| German blue ram | 2–3 in | Peaceful dwarf cichlid | bottom/mid | pair |
| Boesemani rainbowfish | 4 in | Peaceful | mid, shimmering shoal | 6+ |
| Corydoras | 2–3 in | Peaceful | bottom, shoaling scavenger | 6+ |
| Bristlenose pleco | 4–5 in | Peaceful | bottom, algae grazer | 1 |
| Kuhli loach | 3–4 in | Peaceful, shy | bottom, nocturnal, eel-like | 5+ |
| Cherry/Amano shrimp | 1–2 in | Peaceful invert | bottom | 6+ (colony) |

### Freshwater plants
Amazon sword (background, mod light, root tabs); Java fern (on wood/rock, low light, don't bury rhizome); Anubias nana (hardscape, low light, very hardy); Vallisneria (background, low light, runners); Cryptocoryne (midground, low–mod, melts then regrows); Java moss (carpet/on wood, low light); Christmas/flame moss (accents); dwarf hairgrass / Monte Carlo (carpet, high light + CO2); Marsilea / dwarf sagittaria (easier carpets). Sources: [Hygger](https://www.hygger-online.com/favorite-live-aquarium-plants-for-beginners/), [Canton Aquatics](https://www.cantonaquatics.com/pages/amazon-swords-a-comprehensive-guide-for-aquarium-hobbyists).

### Saltwater/Reef (~14 fish)

| Species | Adult size | Temperament | Zone | Min group | Reef-safe |
|---|---|---|---|---|---|
| Ocellaris clownfish | 3–4 in | Peaceful, hardy | mid, hosts anemone | pair | Yes |
| Percula clownfish | 3 in | Peaceful | mid, near host | pair | Yes |
| Banggai cardinalfish | 3 in | Peaceful | mid, hovers | 1 or group | Yes |
| Pajama cardinalfish | 3 in | Peaceful, slow | mid, hovers | small group | Yes |
| Firefish goby | 3 in | Peaceful, shy | low/mid, darts to rock | 1 or pair | Yes |
| Yellow watchman goby | 4 in | Peaceful | bottom, pairs w/ pistol shrimp | 1 or pair | Yes |
| Royal gramma | 3 in | Peaceful (cave territory) | mid | 1 | Yes |
| Yellow tang | 7–8 in | Semi-aggr to tangs | mid, active grazer | 1 (big tank) | Yes |
| Blue/hippo tang | 10–12 in | Peaceful-ish, large | mid/open | 1 | Yes |
| Lawnmower blenny | 5 in | Peaceful, quirky | bottom, algae grazer | 1 | Yes |
| Tailspot blenny | 2–4 in | Peaceful | perches on rock | 1 | Yes |
| Six-line wrasse | 3 in | Semi-aggressive | mid, fast | 1 | Yes (feisty) |
| Green chromis | 3–4 in | Peaceful, schooling | mid/open | odd 5–7 | Yes |
| Flame/coral-beauty angel | 3–4 in | Semi-aggressive | mid, near rock | 1 | With caution |

### Saltwater inverts & corals
Cleaner shrimp (cleaning stations, easy); peppermint shrimp (eats aiptasia); trochus/turbo/cerith snails (algae, easy); nassarius snails (sand-sifters); hermit crabs (scavenger); emerald mithrax crab (bubble algae). Corals by difficulty tier: **easy soft** = green star polyps, zoanthids, mushrooms, Kenya tree/leather; **moderate** = bubble-tip anemone (clownfish host, strong light), LPS (hammer/torch/frogspawn, flowing tentacles); **advanced** = SPS (Acropora/Montipora, high light/flow, pristine chemistry). Use light/flow/stability as **difficulty gates**. Sources: [Petco CUC](https://www.petco.com/content/content-hub/home/articlePages/home-habitat/cleanup-crews.html), [AquariumBreeder](https://aquariumbreeder.com/invertebrates-best-reef-safe-clean-up-crew/), [Pacific East soft coral](https://pacificeastaquaculture.com/blogs/aquaculture/soft-coral-101).

---

# Consolidated Recommendation

1. **Stack:** Three.js (`three/webgpu` + WebGL2 fallback) + Vite + React/TS (engine decoupled from React) + Zustand + localStorage. Fully static output for the NAS.
2. **Look:** PBR + HDRI/IBL + `MeshPhysicalMaterial` transmission → custom caustics + per-channel depth fog + marine snow → `pmndrs/postprocessing` god-rays + bloom.
3. **Fish:** `InstancedMesh`/`BatchedMesh` + procedural vertex-shader undulation (or VAT); physics via `A≈0.2L`, `λ≈0.7–1.1L`, `U≈0.7Lf`, modulate f; Strouhal 0.2–0.4. Boids for schoolers (2.0/0.5/0.5). Behavior archetypes + anchor points.
4. **Plants/corals:** shared jet+curl-noise flow field → height-masked vertex sway; self-driven pulsing Xenia; rigid hard coral; fish rheotaxis from same field.
5. **Assets:** BarramundiFish + Quaternius (CC0, rigged) retextured with Poly Haven/ambientCG CC0 PBR maps; small curated species set; HDRI IBL; CC0 water normal maps; Freesound-CC0 + Pixabay audio. **Avoid TurboSquid royalty-free and Poliigon raw files** for web delivery; maintain `CREDITS.md` for CC-BY.
6. **Domain model:** footprint/surface-area + bioload(mass) stocking; schooling minimums, territory, mouth-size predation, reef-safe gating; clear↔amber (FW) and blue-shift (reef) water looks.

*Caveats: support-percentage and fish-count figures are directional (validate by profiling). Species measurements reflect broad hobby consensus; pin to per-species care-sheets before shipping educational info cards.*
