// Starter tank presets — one click to a beautiful, correctly-stocked tank.

import type { TankConfig } from '../types';

const base = {
  dayNight: 'cycle' as const,
  fishNames: {},
};

export const PRESETS: TankConfig[] = [
  {
    ...base,
    name: 'Amazon Community',
    water: 'freshwater', gallons: 55, substrate: 'sand', background: 'natural', lighting: 'daylight',
    fish: { 'cardinal-tetra': 12, 'rummynose-tetra': 8, 'angelfish': 2, 'corydoras': 6, 'bristlenose-pleco': 1 },
    flora: { 'amazon-sword': 3, 'vallisneria': 5, 'cryptocoryne': 4, 'java-fern': 2 },
    decor: ['driftwood', 'river-rocks'],
  },
  {
    ...base,
    name: 'Nano Planted',
    water: 'freshwater', gallons: 8, substrate: 'blacksand', background: 'planted', lighting: 'daylight',
    fish: { 'neon-tetra': 8, 'cherry-shrimp': 10, 'nerite-snail': 2 },
    flora: { 'java-moss': 3, 'dwarf-hairgrass': 6, 'anubias': 2, 'cryptocoryne': 2 },
    decor: ['river-rocks'],
  },
  {
    ...base,
    name: 'Reef Lagoon',
    water: 'saltwater', gallons: 75, substrate: 'crushedcoral', background: 'reef', lighting: 'actinic',
    fish: { 'ocellaris-clown': 2, 'green-chromis': 7, 'firefish': 2, 'royal-gramma': 1, 'lawnmower-blenny': 1, 'cleaner-shrimp': 1, 'turbo-snail': 3 },
    flora: { 'pulsing-xenia': 2, 'hammer-coral': 2, 'zoanthids': 3, 'bubble-anemone': 1, 'kenya-tree': 2, 'acropora': 2, 'brain-coral': 1 },
    decor: ['reef-rock', 'airstone'],
  },
  {
    ...base,
    name: 'Betta Oasis',
    water: 'freshwater', gallons: 10, substrate: 'gravel', background: 'planted', lighting: 'warm',
    fish: { 'betta': 1, 'nerite-snail': 1 },
    flora: { 'anubias': 3, 'java-fern': 2, 'frogbit': 4, 'cryptocoryne': 3 },
    decor: ['driftwood'],
  },
  {
    ...base,
    name: 'Blackwater Stream',
    water: 'freshwater', gallons: 29, substrate: 'sand', background: 'black', lighting: 'blackwater',
    fish: { 'rummynose-tetra': 10, 'harlequin-rasbora': 8, 'kuhli-loach': 6 },
    flora: { 'java-fern': 3, 'cryptocoryne': 5, 'java-moss': 2, 'frogbit': 5 },
    decor: ['driftwood', 'slate-stack'],
  },
  {
    ...base,
    name: 'Tang Highway',
    water: 'saltwater', gallons: 150, substrate: 'sand', background: 'deepblue', lighting: 'actinic',
    fish: { 'blue-tang': 1, 'yellow-tang': 1, 'green-chromis': 9, 'sixline-wrasse': 1, 'banggai-cardinal': 3, 'turbo-snail': 4 },
    flora: { 'acropora': 3, 'montipora-plate': 2, 'toadstool': 2, 'zoanthids': 2 },
    decor: ['reef-rock', 'airstone'],
  },
];

export const DEFAULT_TANK: TankConfig = PRESETS[0];
