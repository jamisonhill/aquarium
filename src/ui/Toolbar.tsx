// Bottom toolbar: the always-available quick actions.

import { useStore } from '../state/store';
import { getEngine } from '../engine/engineRef';
import { audioEngine } from '../audio/AudioEngine';

export function Toolbar() {
  const feedMode = useStore((s) => s.feedMode);
  const cameraMode = useStore((s) => s.cameraMode);
  const audioOn = useStore((s) => s.audioOn);
  const panelOpen = useStore((s) => s.panelOpen);
  const config = useStore((s) => s.config);
  const set = useStore((s) => s.set);
  const setConfig = useStore((s) => s.setConfig);
  const showToast = useStore((s) => s.showToast);

  const takePhoto = () => {
    const engine = getEngine();
    if (!engine) return;
    // Briefly hidden UI isn't needed — the canvas capture never includes DOM UI.
    const url = engine.screenshot();
    const a = document.createElement('a');
    a.href = url;
    a.download = `aquarium-${(config.name || 'tank').replace(/\s+/g, '-').toLowerCase()}.png`;
    a.click();
    showToast('Saved a snapshot 📸');
  };

  const toggleAudio = async () => {
    const next = !audioOn;
    set({ audioOn: next });
    // start() must happen inside this click handler (autoplay policy).
    await audioEngine.setEnabled(next);
    if (next) {
      audioEngine.setVolume(useStore.getState().audioVolume);
      audioEngine.setMusic(useStore.getState().musicOn);
    }
  };

  const isNight = config.dayNight === 'night';

  return (
    <div className="toolbar" role="toolbar" aria-label="Aquarium controls">
      <button
        data-tip="Feed the fish (F)"
        className={feedMode ? 'active' : ''}
        aria-pressed={feedMode}
        onClick={() => set({ feedMode: !feedMode })}
      >🫘</button>
      <button
        data-tip={isNight ? 'Switch to day' : 'Switch to night'}
        onClick={() => setConfig({ dayNight: isNight ? 'day' : 'night' })}
      >{isNight ? '☀️' : '🌙'}</button>
      <button
        data-tip="Cinematic camera (C)"
        className={cameraMode === 'cinematic' ? 'active' : ''}
        aria-pressed={cameraMode === 'cinematic'}
        onClick={() => set({ cameraMode: cameraMode === 'cinematic' ? 'orbit' : 'cinematic' })}
      >🎥</button>
      <button data-tip={audioOn ? 'Mute' : 'Sound on'} aria-pressed={audioOn} onClick={toggleAudio}>
        {audioOn ? '🔊' : '🔇'}
      </button>
      <button data-tip="Save a photo (P)" onClick={takePhoto}>📸</button>
      <div className="divider" aria-hidden />
      <button
        data-tip="Screensaver — hide everything (H)"
        onClick={() => set({ uiHidden: true, cameraMode: 'cinematic', panelOpen: false, selectedFishKey: null, followFishKey: null })}
      >🖥️</button>
      <button
        data-tip="Fullscreen"
        onClick={() => {
          if (document.fullscreenElement) void document.exitFullscreen();
          else void document.documentElement.requestFullscreen?.();
        }}
      >⛶</button>
      {!panelOpen && (
        <button data-tip="Build your tank" onClick={() => set({ panelOpen: true })}>🛠️</button>
      )}
    </div>
  );
}
