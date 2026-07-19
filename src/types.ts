// Shared type definitions for the whole app.
// The data layer (src/data/*) produces these; the engine and UI both consume them.

export type WaterType = 'freshwater' | 'saltwater';

export type Temperament = 'peaceful' | 'semi-aggressive' | 'aggressive';
export type CareLevel = 'easy' | 'moderate' | 'advanced';
export type Zone = 'top' | 'mid' | 'bottom';

// Behavior archetypes from RESEARCH.md §3.4 — each maps to a movement strategy
// in the fish simulation (boids, patrols, substrate-hugging, etc.).
export type Archetype =
  | 'schooler'   // tight boids school (tetras, rasboras, chromis)
  | 'solitary'   // territorial patrol + display (betta, angelfish)
  | 'bottom'     // hugs substrate, forages, rests (corydoras, pleco)
  | 'hoverer'    // slow mid-water station-holding (gourami, cardinalfish)
  | 'ambusher'   // rests hidden, occasional darts
  | 'nocturnal'  // hides by day, roams at night (kuhli loach)
  | 'surface'    // hangs under the surface film, skittish
  | 'cleaner';   // anchored to a station, twitchy grooming

// How the body undulates while swimming (RESEARCH.md §3.1) — controls where
// along the spine the swimming wave has amplitude.
// 0 = anguilliform (whole body, eel), 1 = subcarangiform (rear half, tetra),
// 2 = carangiform (rear third, cichlid), 3 = ostraciiform (tail-wag only).
export type SwimMode = 0 | 1 | 2 | 3;

// Parameters the procedural mesh builder uses to shape a species' body.
export interface FishShape {
  height: number;       // body height as a fraction of length (0.2 slim … 0.9 discus-like)
  width: number;        // body width as a fraction of height
  noseSharp: number;    // 0 blunt … 1 pointed snout
  tailFork: number;     // 0 rounded caudal fin … 1 deeply forked
  tailSize: number;     // caudal fin length as fraction of body length
  dorsalHeight: number; // dorsal fin height as fraction of body height
  analHeight: number;   // anal fin height
  finLong: boolean;     // flowing long fins (betta, angelfish)
  eyeSize: number;      // relative eye radius
  barbels?: boolean;    // whisker hints for catfish (rendered as tiny cones)
  eelLike?: boolean;    // very elongated body (kuhli loach)
}

// Parameters the canvas texture generator uses to paint a species.
export interface FishPalette {
  base: string;          // main flank color (css color)
  belly: string;         // ventral color, blended toward the bottom
  back: string;          // dorsal color, blended toward the top
  fin: string;           // fin tint
  finOpacity: number;    // how translucent fins are (0..1)
  pattern:
    | 'none'
    | 'hstripe'      // horizontal stripe (neon tetra)
    | 'vbars'        // vertical bars (angelfish, clownfish)
    | 'spots'
    | 'headpatch'    // colored head (rummynose)
    | 'lateralline'
    | 'mottle';      // camo mottling (pleco)
  patternColor: string;
  patternColor2?: string;
  iridescence: number;   // 0..1 — adds metallic sheen in the material
  patternParams?: number[]; // pattern-specific tuning (e.g. bar count)
  eyeColor?: string;     // iris color override (albino fish have red eyes)
}

export interface SwimParams {
  cruise: number;     // cruise speed in body-lengths per second
  burst: number;      // burst multiplier over cruise
  freqBase: number;   // tail-beat Hz at cruise speed (U ≈ 0.7·L·f)
  waveLen: number;    // undulation wavelength in body lengths (0.6 eel … 1.1 tuna)
  amp: number;        // tail amplitude as fraction of length (≈0.2 typical)
  mode: SwimMode;
  turnRate: number;   // max radians/sec of heading change
}

export interface SpeciesDef {
  id: string;
  common: string;
  scientific: string;
  water: WaterType;
  adultSizeIn: number;      // real-world adult length in inches (info card + predation math)
  lengthM: number;          // in-scene body length in meters
  temperament: Temperament;
  careLevel: CareLevel;
  zone: Zone;
  archetype: Archetype;
  minGroup: number;         // schooling minimum (1 = fine alone)
  maxPerTank?: number;      // e.g. 1 male betta
  bioload: number;          // stocking-capacity units this fish consumes
  minGallons: number;       // gentle warning below this tank size
  mouthIn?: number;         // can eat tankmates shorter than this (inches)
  reefSafe?: boolean;       // saltwater only
  invert?: boolean;         // shrimp/snail — rendered by the critter system
  habitat: string;
  funFact: string;
  colorTags: string[];
  shape: FishShape;
  palette: FishPalette;
  swim: SwimParams;
}

export type FloraKind =
  | 'stem'       // swaying stem plants (vallisneria, sword)
  | 'rosette'    // low leafy rosettes (crypts, anubias)
  | 'carpet'     // short foreground carpet
  | 'moss'       // clumpy moss on wood/rock
  | 'floating'   // surface plants with dangling roots
  | 'softcoral'  // leather/kenya tree — sways with flow
  | 'xenia'      // pulsing polyps (self-driven rhythm)
  | 'lps'        // flowing tentacles (hammer/torch)
  | 'anemone'    // bubble-tip anemone
  | 'zoa'        // zoanthid mat — tiny disks that ripple
  | 'hardcoral'; // rigid, static (acropora, brain)

export interface FloraDef {
  id: string;
  name: string;
  scientific: string;
  water: WaterType;
  kind: FloraKind;
  heightM: number;      // typical in-scene height
  colors: string[];     // painted into procedural geometry
  careLevel: CareLevel;
  info: string;
}

export interface DecorDef {
  id: string;
  name: string;
  water: WaterType | 'both';
  kind: 'driftwood' | 'spiderwood' | 'stump' | 'log' | 'rock' | 'slate' | 'reefrock' | 'ship' | 'castle' | 'airstone';
  playful?: boolean;    // toggled separately in the UI ("playful props")
  info: string;
}

export type SubstrateId = 'sand' | 'gravel' | 'blacksand' | 'crushedcoral';
export type BackgroundId = 'natural' | 'planted' | 'reef' | 'black' | 'deepblue';
export type LightingMood = 'daylight' | 'warm' | 'actinic' | 'blackwater';
export type DayNightMode = 'day' | 'night' | 'cycle' | 'realtime';
export type CameraMode = 'orbit' | 'cinematic' | 'still' | 'follow';
export type QualityTier = 'low' | 'medium' | 'high' | 'ultra';

// A complete, persistable description of one tank build.
// This is exactly what gets saved to localStorage and encoded in share URLs.
export interface TankConfig {
  name: string;
  water: WaterType;
  gallons: number;                     // continuous 5..180
  substrate: SubstrateId;
  background: BackgroundId;
  lighting: LightingMood;
  dayNight: DayNightMode;
  fish: Record<string, number>;        // speciesId -> count
  flora: Record<string, number>;       // floraId -> count
  decor: string[];                     // enabled decor ids
  fishNames: Record<string, string>;   // "speciesId:index" -> pet name
}

export interface StockingWarning {
  severity: 'info' | 'caution' | 'warning';
  message: string;
}
