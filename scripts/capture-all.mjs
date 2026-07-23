// capture-all.mjs — render every preset to its 4K tvOS loop, sequentially
// (each capture saturates the GPU; parallel runs would just fight).
//
//   node scripts/capture-all.mjs [--out ios/LivingGlassTV/Videos]
//
// ~20-30 min per scene on this machine → run it and walk away. Serve dist
// first: (cd dist && python3 -m http.server 4174 &)

import { spawnSync } from "node:child_process";

const SLUGS = [
  "reef-lagoon",
  "amazon-community",
  "blackwater-stream",
  "tang-highway",
  "betta-oasis",
  "nano-planted",
];

const outIdx = process.argv.indexOf("--out");
const OUT = outIdx >= 0 ? process.argv[outIdx + 1] : "ios/LivingGlassTV/Videos";

const t0 = Date.now();
for (const [i, slug] of SLUGS.entries()) {
  console.log(`\n=== [${i + 1}/${SLUGS.length}] ${slug} ===`);
  const res = spawnSync(
    "node",
    ["scripts/capture-scene.mjs", slug, "--secs", "70", "--fps", "30", "--out", OUT],
    { stdio: "inherit" },
  );
  if (res.status !== 0) {
    console.error(`${slug} FAILED (exit ${res.status}) — continuing with the rest`);
  }
}
console.log(`\nAll done in ${((Date.now() - t0) / 3600000).toFixed(1)} h. Loops in ${OUT}/`);
console.log("Next: cd ios && xcodegen generate  (so the videos join the tvOS bundle)");
