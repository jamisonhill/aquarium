// Stocking & compatibility rules engine (RESEARCH.md §6.2–6.4).
// Produces gentle, plain-language warnings — the UI never blocks a choice,
// it just explains what a real aquarist would tell you.

import type { StockingWarning, TankConfig } from '../types';
import { speciesById } from './species';
import { floraById } from './flora';
import { tankDims } from './tanks';

export function totalBioload(fish: Record<string, number>): number {
  let sum = 0;
  for (const [id, count] of Object.entries(fish)) {
    const sp = speciesById.get(id);
    if (sp) sum += sp.bioload * count;
  }
  return sum;
}

export function stockingWarnings(config: TankConfig): StockingWarning[] {
  const warnings: StockingWarning[] = [];
  const dims = tankDims(config.gallons);
  const entries = Object.entries(config.fish).filter(([, n]) => n > 0);
  const species = entries.map(([id, n]) => ({ sp: speciesById.get(id)!, n })).filter((e) => e.sp);

  // 1. Bioload vs capacity — planted tanks earn a bonus (plants consume waste).
  const plantedBonus = Object.entries(config.flora).some(
    ([id, n]) => n > 0 && ['stem', 'rosette', 'carpet', 'moss', 'floating'].includes(floraById.get(id)?.kind ?? '')
  ) ? 1.15 : 1;
  const load = totalBioload(config.fish);
  const cap = dims.capacity * plantedBonus;
  if (load > cap * 1.25) {
    warnings.push({ severity: 'warning', message: `This is heavily overstocked (${Math.round((load / cap) * 100)}% of capacity). In a real tank, waste would build up faster than the filter and plants could process it.` });
  } else if (load > cap) {
    warnings.push({ severity: 'caution', message: `Slightly overstocked (${Math.round((load / cap) * 100)}% of capacity). A real aquarist would upgrade filtration or thin the stock a little.` });
  }

  for (const { sp, n } of species) {
    // 2. Schooling minimums — a lone schooler is a stressed schooler.
    if (sp.minGroup > 1 && n < sp.minGroup) {
      warnings.push({ severity: 'caution', message: `${sp.common} are shoaling fish — below ${sp.minGroup} they get stressed and hide. Try ${sp.minGroup} or more to see real schooling.` });
    }
    // 3. Tank size minimums.
    if (config.gallons < sp.minGallons) {
      warnings.push({ severity: 'caution', message: `A ${sp.common} really wants at least ${sp.minGallons} gallons (this tank is ${Math.round(config.gallons)}). Adults need the swimming room.` });
    }
    // 4. One-per-tank species (male bettas fight to the death).
    if (sp.maxPerTank && n > sp.maxPerTank) {
      warnings.push({ severity: 'warning', message: `More than ${sp.maxPerTank} ${sp.common}${sp.maxPerTank > 1 ? 's' : ''} in one tank leads to serious fighting${sp.id === 'betta' ? ' — male bettas will battle to the death' : ''}.` });
    }
    // 5. Predation: "if it fits in the mouth, it's food."
    if (sp.mouthIn) {
      for (const { sp: other } of species) {
        if (other.id !== sp.id && other.adultSizeIn <= sp.mouthIn) {
          warnings.push({ severity: 'warning', message: `A full-grown ${sp.common} will eventually eat ${other.common} — anything that fits in the mouth is food.` });
        }
      }
    }
    // 6. Aggressive fish with small peaceful tankmates.
    if (sp.temperament === 'aggressive') {
      for (const { sp: other } of species) {
        if (other.id !== sp.id && other.temperament === 'peaceful' && !other.invert && other.adultSizeIn < sp.adultSizeIn * 1.2) {
          warnings.push({ severity: 'caution', message: `${sp.common} may harass ${other.common} — watch for nipped fins in a real tank.` });
        }
      }
    }
    // 7. Fin-nippers with long-finned fish.
    if (sp.id === 'tiger-barb') {
      for (const { sp: other } of species) {
        if (other.shape.finLong) {
          warnings.push({ severity: 'caution', message: `Tiger barbs are famous fin-nippers — the flowing fins of a ${other.common} are irresistible to them.` });
        }
      }
    }
    // 8. Reef-safety: non-reef-safe fish with corals present.
    if (sp.water === 'saltwater' && sp.reefSafe === false) {
      const hasCoral = Object.entries(config.flora).some(([id, cnt]) => cnt > 0 && floraById.get(id));
      if (hasCoral) {
        warnings.push({ severity: 'caution', message: `${sp.common} is not fully reef-safe — it may nip at corals. Reef keepers call this "with caution."` });
      }
    }
    // 9. Shrimp as snacks for medium+ fish.
    if (sp.invert && sp.id.includes('shrimp')) {
      for (const { sp: other } of species) {
        if (!other.invert && other.adultSizeIn >= 3.5) {
          warnings.push({ severity: 'caution', message: `${other.common} may treat ${sp.common} as an expensive snack.` });
        }
      }
    }
  }

  // Deduplicate identical messages.
  const seen = new Set<string>();
  return warnings.filter((w) => (seen.has(w.message) ? false : (seen.add(w.message), true)));
}
