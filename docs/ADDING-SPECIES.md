# Adding a new fish species

Everything about a species — its body, skin, swimming style, behavior and
info card — comes from **one entry** in `src/data/species.ts`. No 3D modeling
required.

## 1. Copy a similar species

Pick the existing species closest in body plan (a tetra for small schoolers, a
cichlid for deep-bodied fish, the kuhli loach for eel shapes) and duplicate its
entry with a new `id`.

## 2. Shape the body (`shape`)

| Field | Meaning | Typical range |
|---|---|---|
| `height` | body height ÷ length | 0.24 slim danio … 0.85 angelfish |
| `width` | body width ÷ height | 0.2 laterally-flat … 0.75 catfish |
| `noseSharp` | snout point | 0 blunt (blenny) … 0.85 pleco |
| `tailFork` | caudal fork depth | 0 round (betta) … 0.75 chromis |
| `tailSize` | caudal fin ÷ body length | 0.2 typical, 0.45 betta |
| `dorsalHeight` / `analHeight` | fin heights ÷ body height | 0.3–0.6; 1.1 = firefish flag |
| `finLong` | flowing fins (betta, angelfish) | boolean |
| `eelLike` | elongated constant-thickness body | boolean |

## 3. Paint the skin (`palette`)

`base`/`belly`/`back` make the countershaded gradient (dark top, pale bottom —
almost every fish). Then pick a `pattern`:

- `hstripe` — horizontal stripe(s); `patternParams: [count]`; a second color
  paints the neon-tetra-style lower stripe
- `vbars` — vertical bars; `patternParams: [count, widthScale]`;
  `patternColor2` adds clownfish-style bar outlines
- `spots`, `mottle` — random spotting / camo
- `headpatch` — colored head (`[split]`), rear patch (`[split, 1]`) or rear
  fade (`[split, -1]`)
- `lateralline` — wedge that thickens toward the tail

`iridescence` (0–1) adds the metallic shimmer tetras and rainbowfish have.

## 4. Choose how it swims (`swim`)

- `mode`: 0 eel · 1 rear-half (most fish) · 2 rear-third (cichlids/tangs) ·
  3 tail-only (boxfish-style; also bettas & clownfish waddle)
- `cruise` is in body-lengths/second (1–2 for most; 0.5 for stately hoverers)
- Leave `freqBase`, `waveLen`, `amp` near the defaults — they follow published
  fish-locomotion ratios and the engine couples frequency to speed for you.

## 5. Give it a life (`archetype` + care data)

`schooler | solitary | bottom | hoverer | ambusher | nocturnal | surface |
cleaner` — this selects the whole behavior program. Then fill in the honest
husbandry numbers (`minGroup`, `minGallons`, `bioload` ≈ adult mass in
tetra-units, `temperament`, `mouthIn` if it eats tankmates, `reefSafe` for
saltwater) — the compatibility warnings derive from these. Finish with
`habitat` and a `funFact` worth reading.

## 6. Look at it

`npm run dev`, add the fish in the Fish tab, click it to check the info card,
and watch it move. Tune `shape`/`palette` until it reads as the species at a
glance. That's the whole pipeline.

Plants and corals work the same way in `src/data/flora.ts` — `kind` picks the
geometry generator and motion model in `src/engine/Flora.ts`.
