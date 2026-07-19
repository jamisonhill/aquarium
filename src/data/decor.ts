// Decor library — all procedurally generated hardscape and props.

import type { DecorDef } from '../types';

export const DECOR: DecorDef[] = [
  { id: 'driftwood', name: 'Driftwood Branch', water: 'freshwater', kind: 'driftwood',
    info: 'A weathered branch reaching across the tank — plecos rasp at it, plants root on it.' },
  { id: 'spider-wood', name: 'Spider Wood', water: 'freshwater', kind: 'spiderwood',
    info: 'A tangle of thin, twisting roots fanning upward — the aquascaper’s favorite. Shrimp and fry vanish into the thicket.' },
  { id: 'driftwood-stump', name: 'Root Stump', water: 'freshwater', kind: 'stump',
    info: 'A gnarled sunken stump with roots splaying into the sand — a solid centerpiece with a shady hollow beneath.' },
  { id: 'hollow-log', name: 'Hollow Log', water: 'both', kind: 'log',
    info: 'An open-ended log resting in the substrate. Fish cruise straight through it and loaches claim the shade inside.' },
  { id: 'log-arch', name: 'Arched Log Tunnel', water: 'both', kind: 'log',
    info: 'A hollow log bowed into an archway — a driftwood bridge the whole tank likes to swim under and through.' },
  { id: 'river-rocks', name: 'River Stones', water: 'both', kind: 'rock',
    info: 'Smooth rounded stones in a natural cluster.' },
  { id: 'slate-stack', name: 'Slate Ledges', water: 'freshwater', kind: 'slate',
    info: 'Flat stacked stone forming caves and ledges — territory for cichlids, shelter for loaches.' },
  { id: 'reef-rock', name: 'Reef Rockscape', water: 'saltwater', kind: 'reefrock',
    info: 'Porous aragonite rock full of holes and arches — the skeleton of a reef tank.' },
  { id: 'airstone', name: 'Air Stone', water: 'both', kind: 'airstone',
    info: 'A steady column of bubbles rising to the surface. Purely for the joy of it.' },
  { id: 'sunken-ship', name: 'Sunken Ship', water: 'both', kind: 'ship', playful: true,
    info: 'A little wrecked galleon listing in the sand. The fish do not question it.' },
  { id: 'castle', name: 'Castle Ruin', water: 'both', kind: 'castle', playful: true,
    info: 'A classic aquarium castle with swim-through windows.' },
];

export const decorById = new Map(DECOR.map((d) => [d.id, d]));
export const decorForWater = (water: 'freshwater' | 'saltwater') =>
  DECOR.filter((d) => d.water === 'both' || d.water === water);
