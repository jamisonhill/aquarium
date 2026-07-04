// App shell: canvas underneath, UI floating above, global keyboard shortcuts,
// screensaver/kiosk handling, toast notifications.

import { useEffect, useRef, useState } from 'react';
import { AquariumCanvas } from './ui/AquariumCanvas';
import { ControlPanel } from './ui/ControlPanel';
import { Toolbar } from './ui/Toolbar';
import { InfoCard } from './ui/InfoCard';
import { Hud } from './ui/Hud';
import { useStore } from './state/store';
import { getEngine } from './engine/engineRef';
import { audioEngine } from './audio/AudioEngine';

export default function App() {
  const uiHidden = useStore((s) => s.uiHidden);
  const panelOpen = useStore((s) => s.panelOpen);
  const showHud = useStore((s) => s.showHud);
  const feedMode = useStore((s) => s.feedMode);
  const toast = useStore((s) => s.toast);
  const audioVolume = useStore((s) => s.audioVolume);
  const musicOn = useStore((s) => s.musicOn);
  const set = useStore((s) => s.set);
  const [revealVisible, setRevealVisible] = useState(false);
  const revealTimer = useRef<ReturnType<typeof setTimeout>>();

  // Kiosk mode: ?kiosk=1 starts full-screen-quiet with a cinematic camera —
  // perfect for a TV or wall display.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('kiosk')) {
      set({ uiHidden: true, cameraMode: 'cinematic', panelOpen: false });
    }
  }, [set]);

  // Volume/music settings → audio engine (audio starts from the toolbar tap).
  useEffect(() => { audioEngine.setVolume(audioVolume); }, [audioVolume]);
  useEffect(() => { audioEngine.setMusic(musicOn); }, [musicOn]);

  // Global keyboard shortcuts (skipped while typing in an input).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      const s = useStore.getState();
      switch (e.key.toLowerCase()) {
        case 'h':
          set({ uiHidden: !s.uiHidden, ...(s.uiHidden ? {} : { panelOpen: false }) });
          break;
        case 'f':
          set({ feedMode: !s.feedMode });
          break;
        case 'c':
          set({ cameraMode: s.cameraMode === 'cinematic' ? 'orbit' : 'cinematic' });
          break;
        case 'p': {
          const engine = getEngine();
          if (engine) {
            const a = document.createElement('a');
            a.href = engine.screenshot();
            a.download = 'aquarium.png';
            a.click();
          }
          break;
        }
        case 'escape':
          if (s.selectedFishKey) set({ selectedFishKey: null, followFishKey: null });
          else if (s.uiHidden) set({ uiHidden: false });
          else set({ panelOpen: false });
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [set]);

  // While the UI is hidden, moving the pointer briefly reveals an exit button.
  useEffect(() => {
    if (!uiHidden) return;
    const onMove = () => {
      setRevealVisible(true);
      clearTimeout(revealTimer.current);
      revealTimer.current = setTimeout(() => setRevealVisible(false), 2500);
    };
    window.addEventListener('pointermove', onMove);
    return () => {
      window.removeEventListener('pointermove', onMove);
      clearTimeout(revealTimer.current);
    };
  }, [uiHidden]);

  return (
    <>
      <AquariumCanvas />
      {!uiHidden && (
        <>
          <Toolbar />
          {panelOpen ? <ControlPanel /> : (
            <button className="open-panel" aria-label="Open tank builder" onClick={() => set({ panelOpen: true })}>🛠️</button>
          )}
          <InfoCard />
          {feedMode && <div className="feed-hint">Tap the water to drop food · press F to stop</div>}
        </>
      )}
      {uiHidden && (
        <button
          className={`reveal ${revealVisible ? 'visible' : ''}`}
          onClick={() => set({ uiHidden: false })}
        >
          Show controls (H)
        </button>
      )}
      {showHud && <Hud />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
