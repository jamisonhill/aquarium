// Central app state (Zustand). React components subscribe to slices of this;
// the 3D engine subscribes once and rebuilds/retunes the scene when the tank
// config changes. Saved tanks + settings persist to localStorage automatically.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CameraMode, DayNightMode, QualityTier, TankConfig } from '../types';
import { DEFAULT_TANK, PRESETS } from '../data/presets';
import { decodeShareHash } from './share';
import { speciesForWater } from '../data/species';
import { floraForWater } from '../data/flora';
import { decorForWater } from '../data/decor';
import { tankDims } from '../data/tanks';

export interface AppState {
  config: TankConfig;
  savedTanks: Record<string, TankConfig>;

  // Settings (persisted)
  quality: QualityTier | 'auto';
  audioOn: boolean;
  audioVolume: number;
  musicOn: boolean;

  // Session UI state (not persisted)
  cameraMode: CameraMode;
  followFishKey: string | null;      // "speciesId:index" while camera-following
  selectedFishKey: string | null;    // shows the info card
  uiHidden: boolean;                 // pure "just watch" mode
  panelOpen: boolean;
  showHud: boolean;                  // dev perf HUD
  reducedMotion: boolean;
  feedMode: boolean;                 // next tap on the water drops food
  toast: string | null;

  // Actions
  setConfig: (patch: Partial<TankConfig>) => void;
  setWater: (water: 'freshwater' | 'saltwater') => void;
  setFishCount: (id: string, count: number) => void;
  setFloraCount: (id: string, count: number) => void;
  toggleDecor: (id: string) => void;
  nameFish: (key: string, name: string) => void;
  applyPreset: (preset: TankConfig) => void;
  randomize: () => void;
  saveTank: (name: string) => void;
  loadTank: (name: string) => void;
  deleteTank: (name: string) => void;
  set: (patch: Partial<AppState>) => void;
  showToast: (msg: string) => void;
}

// A share link (#t=...) overrides the persisted current tank on first load.
const sharedConfig = typeof window !== 'undefined' ? decodeShareHash() : null;

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      config: sharedConfig ?? DEFAULT_TANK,
      savedTanks: {},
      quality: 'auto',
      audioOn: false, // muted by default — browsers block autoplay anyway
      audioVolume: 0.6,
      musicOn: false,
      cameraMode: 'orbit',
      followFishKey: null,
      selectedFishKey: null,
      uiHidden: false,
      panelOpen: window.matchMedia?.('(min-width: 900px)').matches ?? true,
      showHud: false,
      reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
      feedMode: false,
      toast: null,

      setConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),

      // Switching water type swaps the whole library, so stock must be cleared —
      // a neon tetra cannot live in a reef. We drop fish/flora but keep size etc.
      setWater: (water) =>
        set((s) => {
          if (s.config.water === water) return s;
          return {
            config: {
              ...s.config, water, fish: {}, flora: {}, fishNames: {},
              decor: s.config.decor.filter((d) => decorForWater(water).some((x) => x.id === d)),
              substrate: water === 'saltwater' ? 'crushedcoral' : 'sand',
              background: water === 'saltwater' ? 'reef' : 'natural',
              lighting: water === 'saltwater' ? 'actinic' : 'daylight',
            },
          };
        }),

      setFishCount: (id, count) =>
        set((s) => {
          const fish = { ...s.config.fish };
          if (count <= 0) delete fish[id]; else fish[id] = Math.min(count, 60);
          return { config: { ...s.config, fish } };
        }),

      setFloraCount: (id, count) =>
        set((s) => {
          const flora = { ...s.config.flora };
          if (count <= 0) delete flora[id]; else flora[id] = Math.min(count, 24);
          return { config: { ...s.config, flora } };
        }),

      toggleDecor: (id) =>
        set((s) => ({
          config: {
            ...s.config,
            decor: s.config.decor.includes(id)
              ? s.config.decor.filter((d) => d !== id)
              : [...s.config.decor, id],
          },
        })),

      nameFish: (key, name) =>
        set((s) => ({
          config: { ...s.config, fishNames: { ...s.config.fishNames, [key]: name } },
        })),

      applyPreset: (preset) => set({ config: structuredClone(preset), followFishKey: null, selectedFishKey: null }),

      // "Surprise me": build a random but sensible tank within capacity.
      randomize: () => {
        const water = Math.random() < 0.55 ? 'freshwater' as const : 'saltwater' as const;
        const gallons = [10, 20, 29, 40, 55, 75, 120][Math.floor(Math.random() * 7)];
        const cap = tankDims(gallons).capacity;
        const pool = speciesForWater(water).filter((sp) => sp.minGallons <= gallons);
        const fish: Record<string, number> = {};
        let load = 0;
        // Fill ~80% of capacity: schools first, then characters, then cleanup crew.
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        for (const sp of shuffled) {
          if (load >= cap * 0.8) break;
          const groupSize = sp.minGroup > 1 ? sp.minGroup + Math.floor(Math.random() * 5) : (sp.maxPerTank ?? 1);
          const cost = sp.bioload * groupSize;
          if (load + cost <= cap * 0.85 && !(sp.mouthIn && Object.keys(fish).length > 0)) {
            fish[sp.id] = groupSize;
            load += cost;
          }
        }
        const floraPool = floraForWater(water).sort(() => Math.random() - 0.5).slice(0, 4 + Math.floor(Math.random() * 3));
        const flora: Record<string, number> = {};
        for (const f of floraPool) flora[f.id] = 1 + Math.floor(Math.random() * 4);
        const decor = decorForWater(water).filter((d) => !d.playful || Math.random() < 0.2)
          .filter(() => Math.random() < 0.6).map((d) => d.id);
        const substrates = water === 'saltwater' ? (['sand', 'crushedcoral'] as const) : (['sand', 'gravel', 'blacksand'] as const);
        set((s) => ({
          config: {
            ...s.config, water, gallons, fish, flora, decor, fishNames: {},
            substrate: substrates[Math.floor(Math.random() * substrates.length)],
            background: water === 'saltwater' ? 'reef' : (['natural', 'planted', 'deepblue'] as const)[Math.floor(Math.random() * 3)],
            lighting: water === 'saltwater' ? 'actinic' : 'daylight',
            name: 'Surprise Tank',
          },
        }));
        get().showToast('Here’s a surprise tank — remix it however you like.');
      },

      saveTank: (name) =>
        set((s) => ({
          savedTanks: { ...s.savedTanks, [name]: { ...structuredClone(s.config), name } },
          config: { ...s.config, name },
        })),

      loadTank: (name) => {
        const saved = get().savedTanks[name];
        if (saved) set({ config: structuredClone(saved), followFishKey: null, selectedFishKey: null });
      },

      deleteTank: (name) =>
        set((s) => {
          const savedTanks = { ...s.savedTanks };
          delete savedTanks[name];
          return { savedTanks };
        }),

      set: (patch) => set(patch),

      showToast: (msg) => {
        clearTimeout(toastTimer);
        set({ toast: msg });
        toastTimer = setTimeout(() => set({ toast: null }), 4200);
      },
    }),
    {
      name: 'aquarium-v1',
      // Only persist durable things — session UI state stays fresh each visit.
      partialize: (s) => ({
        config: s.config,
        savedTanks: s.savedTanks,
        quality: s.quality,
        audioOn: s.audioOn,
        audioVolume: s.audioVolume,
        musicOn: s.musicOn,
      }),
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as Partial<AppState>) };
        // A fresh share link always wins over the previously persisted tank.
        if (sharedConfig) merged.config = sharedConfig;
        return merged;
      },
    }
  )
);

export { PRESETS };
