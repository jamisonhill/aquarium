// Dev performance HUD — toggled in Settings. Polls the engine's counters.

import { useEffect, useState } from 'react';
import { getEngine } from '../engine/engineRef';

export function Hud() {
  const [stats, setStats] = useState({ fps: 0, drawCalls: 0, triangles: 0, fishCount: 0 });

  useEffect(() => {
    const id = setInterval(() => {
      const e = getEngine();
      if (e) setStats({ ...e.stats });
    }, 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="hud" aria-hidden>
      {stats.fps} fps<br />
      {stats.drawCalls} draw calls<br />
      {(stats.triangles / 1000).toFixed(1)}k tris<br />
      {stats.fishCount} fish
    </div>
  );
}
