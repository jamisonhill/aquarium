// Plant and coral catalog (RESEARCH.md §4 and §6.5).
// All geometry is generated procedurally; `kind` selects the generator and the
// motion model (current-driven sway vs. self-driven pulsing vs. rigid).

import type { FloraDef } from '../types';

export const FLORA: FloraDef[] = [
  // ── Freshwater plants ──
  {
    id: 'amazon-sword', name: 'Amazon Sword', scientific: 'Echinodorus grisebachii',
    water: 'freshwater', kind: 'rosette', heightM: 0.3,
    colors: ['#2e6b2e', '#3f8a38', '#357a30'], careLevel: 'easy',
    info: 'The classic background centerpiece — broad blades that arc and sway in the filter current.',
  },
  {
    id: 'vallisneria', name: 'Vallisneria', scientific: 'Vallisneria spiralis',
    water: 'freshwater', kind: 'stem', heightM: 0.42,
    colors: ['#4a9a3a', '#5cb04a', '#3a8a30'], careLevel: 'easy',
    info: 'Tall grass-like ribbons that reach the surface and trail along it, moving like kelp.',
  },
  {
    id: 'java-fern', name: 'Java Fern', scientific: 'Microsorum pteropus',
    water: 'freshwater', kind: 'rosette', heightM: 0.2,
    colors: ['#2a5c2a', '#356e30', '#244f24'], careLevel: 'easy',
    info: 'Leathery dark leaves grown attached to wood or rock — never buried. Nearly indestructible.',
  },
  {
    id: 'anubias', name: 'Anubias Nana', scientific: 'Anubias barteri var. nana',
    water: 'freshwater', kind: 'rosette', heightM: 0.1,
    colors: ['#1e4a1e', '#2a5c26', '#183f18'], careLevel: 'easy',
    info: 'Thick, glossy round leaves on hardscape. Slow-growing and stoic — it barely sways.',
  },
  {
    id: 'cryptocoryne', name: 'Cryptocoryne', scientific: 'Cryptocoryne wendtii',
    water: 'freshwater', kind: 'rosette', heightM: 0.14,
    colors: ['#5a4a2a', '#6e5230', '#4a6a30'], careLevel: 'easy',
    info: 'Bronze-green ruffled leaves for the midground. Famous for melting when moved, then regrowing.',
  },
  {
    id: 'java-moss', name: 'Java Moss', scientific: 'Taxiphyllum barbieri',
    water: 'freshwater', kind: 'moss', heightM: 0.04,
    colors: ['#3a7a2a', '#4a9036', '#2e6822'], careLevel: 'easy',
    info: 'A soft green cushion over wood and stone; shrimp graze it all day.',
  },
  {
    id: 'dwarf-hairgrass', name: 'Dwarf Hairgrass', scientific: 'Eleocharis parvula',
    water: 'freshwater', kind: 'carpet', heightM: 0.05,
    colors: ['#5ab040', '#6ec850', '#4a9a34'], careLevel: 'moderate',
    info: 'A lawn of fine grass blades that ripples in waves when the current passes over it.',
  },
  {
    id: 'frogbit', name: 'Amazon Frogbit', scientific: 'Limnobium laevigatum',
    water: 'freshwater', kind: 'floating', heightM: 0.08,
    colors: ['#4a9a3a', '#5cb44a'], careLevel: 'easy',
    info: 'Floating rosettes with long dangling roots — dapples the light below and shelters shy fish.',
  },

  // ── Saltwater corals & anemones ──
  {
    id: 'pulsing-xenia', name: 'Pulsing Xenia', scientific: 'Xenia elongata',
    water: 'saltwater', kind: 'xenia', heightM: 0.09,
    colors: ['#c8b8d8', '#b8a8cc', '#d8cce4'], careLevel: 'easy',
    info: 'Colonies of feathery hands that open and close in a slow, hypnotic rhythm all their own.',
  },
  {
    id: 'kenya-tree', name: 'Kenya Tree Coral', scientific: 'Capnella imbricata',
    water: 'saltwater', kind: 'softcoral', heightM: 0.14,
    colors: ['#c8a888', '#b89878', '#d8b898'], careLevel: 'easy',
    info: 'A soft, branching tree that leans and rocks with every push of the flow.',
  },
  {
    id: 'toadstool', name: 'Toadstool Leather', scientific: 'Sarcophyton sp.',
    water: 'saltwater', kind: 'softcoral', heightM: 0.1,
    colors: ['#c8b878', '#d8c888', '#b8a868'], careLevel: 'easy',
    info: 'A mushroom-shaped leather coral whose cap of tiny polyps shivers in the current.',
  },
  {
    id: 'zoanthids', name: 'Zoanthid Garden', scientific: 'Zoanthus sp.',
    water: 'saltwater', kind: 'zoa', heightM: 0.025,
    colors: ['#e85a2a', '#3ab8a8', '#e8c82a', '#c84ae0'], careLevel: 'easy',
    info: 'A mat of small neon disks, each ringed with tentacles — a coral flower bed.',
  },
  {
    id: 'hammer-coral', name: 'Hammer Coral', scientific: 'Euphyllia ancora',
    water: 'saltwater', kind: 'lps', heightM: 0.08,
    colors: ['#4ac8a8', '#5ad8b8', '#3ab090'], careLevel: 'moderate',
    info: 'Fleshy hammer-tipped tentacles that flow like long grass in wind — the definition of reef motion.',
  },
  {
    id: 'bubble-anemone', name: 'Bubble-Tip Anemone', scientific: 'Entacmaea quadricolor',
    water: 'saltwater', kind: 'anemone', heightM: 0.09,
    colors: ['#48b088', '#e0685a', '#58c098'], careLevel: 'moderate',
    info: 'The classic clownfish host. Its bulbed tentacles drift and curl with the flow.',
  },
  {
    id: 'acropora', name: 'Acropora Colony', scientific: 'Acropora sp.',
    water: 'saltwater', kind: 'hardcoral', heightM: 0.12,
    colors: ['#8a5ac8', '#5a8ac8', '#c85a8a'], careLevel: 'advanced',
    info: 'The reef-builder itself — a rigid branching stony coral. It doesn’t sway; the fish sway around it.',
  },
  {
    id: 'brain-coral', name: 'Brain Coral', scientific: 'Trachyphyllia geoffroyi',
    water: 'saltwater', kind: 'hardcoral', heightM: 0.05,
    colors: ['#c8683a', '#3a9a7a', '#c8a83a'], careLevel: 'moderate',
    info: 'A folded, fleshy dome glowing in reds and greens. Rigid skeleton, gently inflating tissue.',
  },
  {
    id: 'montipora-plate', name: 'Montipora Plate', scientific: 'Montipora capricornis',
    water: 'saltwater', kind: 'hardcoral', heightM: 0.06,
    colors: ['#e07a3a', '#d86a8a'], careLevel: 'advanced',
    info: 'Whorled plates like a stone rose, growing in overlapping shelves.',
  },
];

export const floraById = new Map(FLORA.map((f) => [f.id, f]));
export const floraForWater = (water: 'freshwater' | 'saltwater') =>
  FLORA.filter((f) => f.water === water);
