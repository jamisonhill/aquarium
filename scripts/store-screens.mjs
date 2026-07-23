// store-screens.mjs — App Store screenshots straight from the engine at exact
// device pixel sizes. Rendering at the true CSS viewport (not a scaled-up phone
// shot) means each size engages the layout real devices get.
//
//   iPhone 6.9": 440×956 @3x  = 1320×2868
//   iPad 13":   1032×1376 @2x = 2064×2752  (required because the app ships
//                                           TARGETED_DEVICE_FAMILY "1,2")
//
//   node scripts/store-screens.mjs [--device iphone|ipad] [--out DIR]
// Requires dist served at :4174.

import { mkdirSync } from "node:fs";
import puppeteer from "puppeteer-core";

const outIdx = process.argv.indexOf("--out");
const OUT = outIdx >= 0 ? process.argv[outIdx + 1] : "ios/fastlane/screenshots/en-US";
mkdirSync(OUT, { recursive: true });

// Device presets. deliver infers the App Store display type from the image
// dimensions, so both sets can live in the same locale folder.
const DEVICES = {
  iphone: { width: 440, height: 956, scale: 3, prefix: "" },
  ipad: { width: 1032, height: 1376, scale: 2, prefix: "ipad_" },
};
const devIdx = process.argv.indexOf("--device");
const DEVICE_NAME = devIdx >= 0 ? process.argv[devIdx + 1] : "iphone";
const DEVICE = DEVICES[DEVICE_NAME];
if (!DEVICE) throw new Error(`unknown --device "${DEVICE_NAME}" (expected iphone or ipad)`);

const HIDE_UI = ".toolbar,.panel,.hud,.toast,.info-card,.open-panel{display:none !important}";

const SHOTS = [
  { file: "1_reef-hero.png", preset: "Reef Lagoon", hideUI: true, settle: 22 },
  { file: "2_amazon-ui.png", preset: "Amazon Community", hideUI: false, settle: 18 },
  { file: "3_blackwater-night.png", preset: "Blackwater Stream", night: true, hideUI: true, settle: 18 },
  { file: "4_builder.png", preset: "Betta Oasis", panel: true, hideUI: false, settle: 14 },
  { file: "5_tang-highway.png", preset: "Tang Highway", hideUI: true, settle: 18 },
];

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--use-angle=metal", "--hide-scrollbars"],
});

for (const shot of SHOTS) {
  const page = await browser.newPage();
  await page.setViewport({ width: DEVICE.width, height: DEVICE.height, deviceScaleFactor: DEVICE.scale });
  await page.goto("http://127.0.0.1:4174/", { waitUntil: "networkidle0" });
  await page.waitForFunction("window.__AQUARIUM_READY__ === true", { timeout: 30000 });

  // Open the builder if it isn't already (at phone widths it starts closed),
  // then pick the preset from the starter list.
  await page.evaluate(() => {
    if (!document.querySelector(".panel")) document.querySelector(".open-panel")?.click();
  });
  await new Promise((r) => setTimeout(r, 400));
  const picked = await page.evaluate((name) => {
    const btn = [...document.querySelectorAll("button")].find((b) => b.textContent.includes(name));
    if (btn) { btn.click(); return true; }
    return false;
  }, shot.preset);
  if (!picked) console.warn(`WARNING: preset "${shot.preset}" not found — default tank in shot`);

  if (shot.night) {
    await page.evaluate(() => {
      [...document.querySelectorAll(".toolbar button")]
        .find((b) => (b.getAttribute("data-tip") || "").includes("night"))?.click();
    });
  }
  if (!shot.panel) {
    // Close the builder unless the shot wants it.
    await page.evaluate(() => {
      document.querySelector(".panel .close")?.click();
    });
  }
  await new Promise((r) => setTimeout(r, shot.settle * 1000));
  if (shot.hideUI) await page.addStyleTag({ content: HIDE_UI });
  await new Promise((r) => setTimeout(r, 500));
  const file = `${DEVICE.prefix}${shot.file}`;
  await page.screenshot({ path: `${OUT}/${file}` });
  console.log("saved", file, `${DEVICE.width * DEVICE.scale}×${DEVICE.height * DEVICE.scale}`);
  await page.close();
}
await browser.close();
console.log("done →", OUT);
