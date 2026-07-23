// capture-scene.mjs — render one preset to a seamless 4K loop for the tvOS app.
//
//   node scripts/capture-scene.mjs <preset-slug> [--fps 30] [--secs 70] [--out captures]
//
// Pipeline: puppeteer loads the built app in #capture mode at 3840×2160,
// steps the engine frame-by-frame (fixed dt), screenshots each frame via CDP,
// and pipes PNGs straight into ffmpeg (no intermediate files) → high-bitrate
// HEVC intermediate. Then the last CROSSFADE seconds are dissolved into the
// first CROSSFADE seconds so the loop wraps seamlessly, encoded at delivery
// bitrate. Requires: dist/ built, Chrome, ffmpeg (hevc_videotoolbox).
//
// Serve dist yourself (python3 -m http.server 4174 in dist/) or pass --url.

import { spawn } from "node:child_process";
import { mkdirSync, existsSync, unlinkSync } from "node:fs";
import puppeteer from "puppeteer-core";

const args = process.argv.slice(2);
const slug = args[0];
if (!slug) {
  console.error("usage: capture-scene.mjs <preset-slug> [--fps 30] [--secs 70] [--out captures] [--url http://127.0.0.1:4174]");
  process.exit(1);
}
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : dflt;
};
const FPS = Number(opt("fps", "30"));
const SECS = Number(opt("secs", "70"));
const OUT_DIR = opt("out", "captures");
const URL_BASE = opt("url", "http://127.0.0.1:4174");
const CROSSFADE = 10; // seconds dissolved tail→head; loop length = SECS - CROSSFADE
const WARMUP_FRAMES = FPS * 8; // let fish spread + pipelines warm before recording

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const totalFrames = SECS * FPS;
mkdirSync(OUT_DIR, { recursive: true });
const rawPath = `${OUT_DIR}/${slug}-raw.mov`;
const loopPath = `${OUT_DIR}/${slug}.mp4`;

console.log(`[${slug}] capturing ${totalFrames} frames @ ${FPS}fps (${SECS}s) → ${loopPath}`);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--use-angle=metal", "--hide-scrollbars", "--window-size=3900,2200", "--force-device-scale-factor=1"],
  protocolTimeout: 600000,
});
const page = await browser.newPage();
await page.setViewport({ width: 3840, height: 2160, deviceScaleFactor: 1 });
page.on("console", (m) => { if (m.type() === "error") console.error("console.error:", m.text()); });
page.on("pageerror", (e) => console.error("pageerror:", e.message));

await page.goto(`${URL_BASE}/#capture=${slug}&fps=${FPS}&secs=${SECS}`, { waitUntil: "networkidle0" });
await page.waitForFunction("typeof window.__step === 'function'", { timeout: 30000 });
const info = await page.evaluate("window.__captureInfo");
console.log(`[${slug}] engine up:`, JSON.stringify(info));

const cdp = await page.createCDPSession();
const dt = 1 / FPS;

// Warm-up: advance without capturing so fish spread out from spawn.
for (let i = 0; i < WARMUP_FRAMES; i++) {
  await page.evaluate((d) => window.__step(d), dt);
}
console.log(`[${slug}] warm-up done (${WARMUP_FRAMES} frames)`);

// ffmpeg: PNG pipe → high-bitrate HEVC intermediate (quality headroom for the
// second encode; VideoToolbox is fast enough that bitrate beats re-render).
if (existsSync(rawPath)) unlinkSync(rawPath);
const ff = spawn("ffmpeg", [
  "-y", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "png", "-i", "-",
  "-c:v", "hevc_videotoolbox", "-allow_sw", "1", "-b:v", "60M", "-tag:v", "hvc1",
  "-pix_fmt", "nv12", rawPath,
], { stdio: ["pipe", "ignore", "inherit"] });
ff.stdin.on("error", () => {}); // EPIPE surfaces via the close handler instead
const ffDone = new Promise((res, rej) => {
  ff.on("close", (code) => (code === 0 ? res() : rej(new Error(`ffmpeg exited ${code}`))));
});

const t0 = Date.now();
for (let frame = 0; frame < totalFrames; frame++) {
  await page.evaluate((d) => window.__step(d), dt);
  const shot = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true });
  const buf = Buffer.from(shot.data, "base64");
  if (!ff.stdin.write(buf)) {
    await new Promise((res) => ff.stdin.once("drain", res));
  }
  if (frame % (FPS * 5) === 0 && frame > 0) {
    const rate = frame / ((Date.now() - t0) / 1000);
    const eta = Math.round((totalFrames - frame) / rate / 60);
    console.log(`[${slug}] ${frame}/${totalFrames} frames (${rate.toFixed(1)} fps capture, ~${eta}m left)`);
  }
}
ff.stdin.end();
await ffDone;
await browser.close();
console.log(`[${slug}] intermediate written (${((Date.now() - t0) / 60000).toFixed(1)} min)`);

// Seamless loop: body = [CROSSFADE..SECS-CROSSFADE], then the tail dissolves
// into the head. Result length = SECS - 2*CROSSFADE + CROSSFADE = SECS - CROSSFADE.
const body = `[0:v]trim=${CROSSFADE}:${SECS - CROSSFADE},setpts=PTS-STARTPTS[body]`;
const tail = `[0:v]trim=${SECS - CROSSFADE}:${SECS},setpts=PTS-STARTPTS[tail]`;
const head = `[0:v]trim=0:${CROSSFADE},setpts=PTS-STARTPTS[head]`;
const seam = `[tail][head]xfade=transition=fade:duration=${CROSSFADE}:offset=0[seam]`;
const join = `[body][seam]concat=n=2:v=1[v]`;

await new Promise((res, rej) => {
  const enc = spawn("ffmpeg", [
    "-y", "-i", rawPath,
    "-filter_complex", [body, tail, head, seam, join].join(";"),
    "-map", "[v]",
    "-c:v", "hevc_videotoolbox", "-allow_sw", "1", "-b:v", "16M", "-tag:v", "hvc1",
    "-pix_fmt", "nv12", loopPath,
  ], { stdio: ["ignore", "ignore", "inherit"] });
  enc.on("close", (code) => (code === 0 ? res() : rej(new Error(`loop encode exited ${code}`))));
});
unlinkSync(rawPath);
console.log(`[${slug}] DONE → ${loopPath}`);
