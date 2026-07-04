// A tiny module-level handle so UI components can reach the engine without
// prop-drilling or putting a non-serializable class into the store.

import type { Engine } from './Engine';

let engine: Engine | null = null;

export function setEngine(e: Engine | null): void {
  engine = e;
}

export function getEngine(): Engine | null {
  return engine;
}
