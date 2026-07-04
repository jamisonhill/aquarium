// Shared GLSL building blocks + the global "underwater" material patch.
//
// How the photoreal underwater look is achieved (see RESEARCH.md Area 1):
//  1. Per-channel depth absorption — water absorbs red light much faster than
//     blue (Beer–Lambert law), so distant things shift blue-green. Three.js fog
//     is single-color, so we patch its shader chunk to attenuate each color
//     channel at a different rate.
//  2. Caustics — the dancing light ripples you see on sand. We evaluate an
//     animated interference pattern in world space (projected straight down,
//     like sunlight through the surface) and add it to the lighting of every
//     material that opts in.
//  3. Everything shares ONE clock and ONE water-color uniform, so the whole
//     scene reads as a single body of water.

import * as THREE from 'three';

// Uniform objects shared by every patched material. Updating `.value` here
// updates all materials at once (they hold references, not copies).
export const SharedUniforms = {
  uTime: { value: 0 },
  uCausticIntensity: { value: 0.9 },   // scaled by day/night + lighting mood
  uCausticScale: { value: 3.2 },       // pattern tiling — cells every few cm
  uSurfaceY: { value: 0.5 },           // water surface height (world)
  uWaterColor: { value: new THREE.Color('#1a4d66') }, // deep-water scatter color
  uSunTint: { value: new THREE.Color('#fff6e0') },    // caustic light color
};

// ── GLSL: cheap value noise + fbm (used by god rays, water surface) ──
export const glslNoise = /* glsl */ `
  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f); // smoothstep interpolation
    float a = hash21(i), b = hash21(i + vec2(1, 0));
    float c = hash21(i + vec2(0, 1)), d = hash21(i + vec2(1, 1));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * vnoise(p); p *= 2.03; a *= 0.5; }
    return v;
  }
`;

// ── GLSL: the classic iterative caustic interference pattern ──
// Three iterations of a warped-domain trick produce sharp, cellular ridges of
// light exactly like sun through rippling water. Evaluated in world XZ so the
// pattern is continuous across the substrate, rocks, plants and fish.
export const glslCaustic = /* glsl */ `
  float causticPattern(vec2 uv, float t) {
    vec2 p = mod(uv * 6.28318, 6.28318) - 250.0;
    vec2 i = p;
    float c = 1.0;
    float inten = 0.005;
    for (int n = 0; n < 3; n++) {
      float tt = t * (1.0 - (3.5 / float(n + 1)));
      i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
      c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));
    }
    c /= 3.0;
    c = 1.17 - pow(c, 1.4);
    return pow(abs(c), 7.0);
  }
`;

// ── Global fog patch: per-channel Beer–Lambert absorption ──
// Replaces Three's built-in exponential fog for ALL materials with fog enabled.
// `chan` sets relative absorption: red dies fastest, blue travels farthest —
// this single line is what makes distance feel like *water* instead of mist.
export function installUnderwaterFog(): void {
  THREE.ShaderChunk.fog_fragment = /* glsl */ `
    #ifdef USE_FOG
      vec3 chan = vec3(1.75, 1.0, 0.68);
      vec3 att = exp(-vFogDepth * fogDensity * chan * 0.5);
      gl_FragColor.rgb = mix(fogColor, gl_FragColor.rgb, att);
    #endif
  `;
  // Keep the default fog_pars/vertex chunks — they already give us vFogDepth.
}

export interface UnderwaterPatchOptions {
  caustics?: boolean;      // add projected caustic light
  causticStrength?: number;
  // Optional extra vertex-shader displacement injected at begin_vertex.
  // Receives `transformed` (local position) — used for plant sway etc.
  vertexHook?: string;
  vertexPars?: string;     // attribute/uniform/varying declarations for the hook
  extraUniforms?: Record<string, THREE.IUniform>;
}

// Patch a built-in material (Standard/Physical/Lambert) with our underwater
// shading. onBeforeCompile lets us splice GLSL into Three's generated shaders
// without rewriting the whole PBR pipeline.
export function applyUnderwater(material: THREE.Material, opts: UnderwaterPatchOptions = {}): void {
  const { caustics = true, causticStrength = 1, vertexHook = '', vertexPars = '', extraUniforms = {} } = opts;

  // CRITICAL: Three.js caches compiled programs keyed (by default) on
  // onBeforeCompile.toString(). Every call here produces a closure with
  // IDENTICAL source but different injected GLSL — without a custom cache key
  // they'd all silently share the first-compiled program (no caustics on some
  // materials, no swim/sway on others). Key on the actual injected code.
  const variantKey = `uw|${caustics ? 1 : 0}|${causticStrength}|${vertexPars}|${vertexHook}`;
  material.customProgramCacheKey = () => variantKey;

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, SharedUniforms, extraUniforms);

    // Vertex: pass world position to the fragment stage (for caustics),
    // and run any custom displacement (sway / swim) on `transformed`.
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vCausticWorld;\nuniform float uTime;\n${vertexPars}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${vertexHook}`)
      .replace(
        '#include <fog_vertex>',
        /* glsl */ `#include <fog_vertex>
        {
          vec4 cwp = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            cwp = instanceMatrix * cwp;
          #endif
          cwp = modelMatrix * cwp;
          vCausticWorld = cwp.xyz;
        }`
      );

    if (caustics) {
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>\nvarying vec3 vCausticWorld;\nuniform float uTime;\nuniform float uCausticIntensity;\nuniform float uCausticScale;\nuniform float uSurfaceY;\nuniform vec3 uSunTint;\n${glslCaustic}`
        )
        .replace(
          'vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;',
          /* glsl */ `
          vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
          {
            // Project the pattern straight down from the surface. Light hitting
            // steep surfaces gets less (n.y factor), and the pattern softens
            // with depth below the surface, like real focused light diverging.
            float depthBelow = clamp((uSurfaceY - vCausticWorld.y) * 1.4, 0.0, 1.0);
            float soften = mix(1.0, 0.45, depthBelow);
            float ca = causticPattern(vCausticWorld.xz * uCausticScale, uTime * 0.55);
            float upness = clamp(normal.y * 0.75 + 0.35, 0.0, 1.0);
            // Caustics are FOCUSED light: the same energy gathered into ridges.
            // Modulate multiplicatively (slightly darker between ridges, much
            // brighter on them) so the contrast survives tone mapping even on
            // bright sand — a purely additive term clips to invisibility.
            float k = clamp(soften * upness * uCausticIntensity * ${causticStrength.toFixed(2)}, 0.0, 1.3);
            outgoingLight *= 1.0 - 0.3 * k + ca * k * 2.8 * (0.5 + 0.5 * dot(uSunTint, vec3(0.33)));
          }`
        );
    } else if (vertexHook || vertexPars) {
      // Even without caustics the fragment shader must not reference missing varyings.
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vCausticWorld;'
      );
    }
  };
  // Changing onBeforeCompile requires a recompile if the material was used before.
  material.needsUpdate = true;
}
