// The build-your-tank control panel: water type, tank size, fish, plants,
// decor, saved tanks and settings — everything updates the live scene.

import { useMemo, useState } from 'react';
import { useStore, PRESETS } from '../state/store';
import { speciesForWater } from '../data/species';
import { floraForWater } from '../data/flora';
import { decorForWater } from '../data/decor';
import { MIN_GALLONS, MAX_GALLONS, tankDims, presetNameFor, TANK_PRESETS } from '../data/tanks';
import { stockingWarnings, totalBioload } from '../data/compatibility';
import { encodeShareUrl } from '../state/share';
import type { SpeciesDef, FloraDef } from '../types';

type Tab = 'tank' | 'fish' | 'flora' | 'decor' | 'saved' | 'settings';

export function ControlPanel() {
  const [tab, setTab] = useState<Tab>('tank');
  const config = useStore((s) => s.config);
  const set = useStore((s) => s.set);

  const isSalt = config.water === 'saltwater';

  return (
    <aside className="panel" aria-label="Tank builder">
      <div className="panel-head">
        <h1>🐠 {config.name || 'My Aquarium'}</h1>
        <button className="close" aria-label="Close panel" onClick={() => set({ panelOpen: false })}>✕</button>
      </div>
      <nav className="tabs" aria-label="Panel sections">
        {(
          [
            ['tank', 'Tank'],
            ['fish', 'Fish'],
            ['flora', isSalt ? 'Corals' : 'Plants'],
            ['decor', 'Decor'],
            ['saved', 'Saved'],
            ['settings', 'Settings'],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {label}
          </button>
        ))}
      </nav>
      <div className="panel-body">
        {tab === 'tank' && <TankTab />}
        {tab === 'fish' && <FishTab />}
        {tab === 'flora' && <FloraTab />}
        {tab === 'decor' && <DecorTab />}
        {tab === 'saved' && <SavedTab />}
        {tab === 'settings' && <SettingsTab />}
      </div>
    </aside>
  );
}

// ─────────────────────── Tank tab ───────────────────────
function TankTab() {
  const config = useStore((s) => s.config);
  const setConfig = useStore((s) => s.setConfig);
  const setWater = useStore((s) => s.setWater);
  const applyPreset = useStore((s) => s.applyPreset);
  const randomize = useStore((s) => s.randomize);
  const isSalt = config.water === 'saltwater';

  return (
    <>
      <div className="section">
        <h2>Water type</h2>
        <div className="seg" role="radiogroup" aria-label="Water type">
          <button className={!isSalt ? 'active' : ''} onClick={() => setWater('freshwater')}>🌿 Freshwater</button>
          <button className={isSalt ? 'active' : ''} onClick={() => setWater('saltwater')}>🪸 Saltwater</button>
        </div>
        {Object.keys(config.fish).length > 0 && (
          <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '6px 2px 0' }}>
            Switching water type clears the stock — the two worlds don’t mix.
          </p>
        )}
      </div>

      <div className="section">
        <h2>Tank size — {presetNameFor(config.gallons)}</h2>
        <div className="slider-row">
          <input
            type="range" min={MIN_GALLONS} max={MAX_GALLONS} step={1}
            value={config.gallons}
            aria-label="Tank size in gallons"
            onChange={(e) => setConfig({ gallons: Number(e.target.value) })}
          />
          <span className="value">{Math.round(config.gallons)} gal</span>
        </div>
        <div className="seg" style={{ marginTop: 8 }}>
          {TANK_PRESETS.map((p) => (
            <button
              key={p.name}
              className={Math.abs(config.gallons - p.gallons) <= 3 ? 'active' : ''}
              title={p.blurb}
              onClick={() => setConfig({ gallons: p.gallons })}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <h2>Substrate</h2>
        <div className="seg">
          {(isSalt
            ? ([['sand', 'Sand'], ['crushedcoral', 'Crushed coral'], ['blacksand', 'Black sand']] as const)
            : ([['sand', 'Sand'], ['gravel', 'Gravel'], ['blacksand', 'Black sand']] as const)
          ).map(([id, label]) => (
            <button key={id} className={config.substrate === id ? 'active' : ''} onClick={() => setConfig({ substrate: id })}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <h2>Background</h2>
        <div className="seg">
          {([['natural', 'Natural'], ['planted', 'Planted'], ['reef', 'Reef'], ['deepblue', 'Deep blue'], ['black', 'Black']] as const).map(([id, label]) => (
            <button key={id} className={config.background === id ? 'active' : ''} onClick={() => setConfig({ background: id })}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <h2>Lighting mood</h2>
        <div className="seg">
          {([['daylight', '☀️ Daylight'], ['warm', '🌅 Warm'], ['actinic', '💙 Actinic'], ['blackwater', '🍂 Blackwater']] as const).map(([id, label]) => (
            <button key={id} className={config.lighting === id ? 'active' : ''} onClick={() => setConfig({ lighting: id })}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <h2>Day &amp; night</h2>
        <div className="seg">
          {([['day', 'Day'], ['night', 'Night'], ['cycle', 'Cycle'], ['realtime', 'My time']] as const).map(([id, label]) => (
            <button key={id} className={config.dayNight === id ? 'active' : ''} onClick={() => setConfig({ dayNight: id })}>
              {label}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '6px 2px 0' }}>
          “Cycle” runs a full day every 4 minutes. “My time” follows your clock — nocturnal fish wake at night.
        </p>
      </div>

      <div className="section">
        <h2>Starter tanks</h2>
        <div className="preset-list">
          {PRESETS.map((p) => (
            <button key={p.name} onClick={() => applyPreset(p)}>
              <div className="p-name">{p.name}</div>
              <div className="p-desc">
                {p.water === 'saltwater' ? 'Saltwater' : 'Freshwater'} · {p.gallons} gal ·{' '}
                {Object.values(p.fish).reduce((a, b) => a + b, 0)} fish
              </div>
            </button>
          ))}
        </div>
        <div className="row-actions" style={{ marginTop: 10 }}>
          <button className="btn primary" onClick={randomize}>🎲 Surprise me</button>
        </div>
      </div>
    </>
  );
}

// ─────────────────────── Fish tab ───────────────────────
const speciesChipStyle = (sp: SpeciesDef) => ({
  background: `linear-gradient(180deg, ${sp.palette.back}, ${sp.palette.base} 55%, ${sp.palette.belly})`,
});

function FishTab() {
  const config = useStore((s) => s.config);
  const setFishCount = useStore((s) => s.setFishCount);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'peaceful' | 'schooling' | 'bottom' | 'easy' | 'inverts'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const pool = speciesForWater(config.water);
  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pool.filter((sp) => {
      if (q && !`${sp.common} ${sp.scientific} ${sp.colorTags.join(' ')}`.toLowerCase().includes(q)) return false;
      switch (filter) {
        case 'peaceful': return sp.temperament === 'peaceful' && !sp.invert;
        case 'schooling': return sp.archetype === 'schooler';
        case 'bottom': return sp.zone === 'bottom' && !sp.invert;
        case 'easy': return sp.careLevel === 'easy';
        case 'inverts': return !!sp.invert;
        default: return true;
      }
    });
  }, [pool, search, filter]);

  const dims = tankDims(config.gallons);
  const load = totalBioload(config.fish);
  const pct = Math.min(160, Math.round((load / dims.capacity) * 100));
  const warnings = useMemo(() => stockingWarnings(config), [config]);

  return (
    <>
      <div className="capacity" aria-label={`Stocking level ${pct}%`}>
        <div className="bar">
          <div
            className={`fill ${pct > 125 ? 'over' : pct > 100 ? 'warn' : ''}`}
            style={{ width: `${Math.min(100, (pct / 160) * 100 * 1.6)}%` }}
          />
        </div>
        <div className="label">
          Stocking: <strong>{pct}%</strong> of what this {Math.round(config.gallons)}-gallon tank supports
          {pct <= 100 ? ' — healthy' : pct <= 125 ? ' — getting crowded' : ' — overstocked'}
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="section">
          <div className="warning-list">
            {warnings.map((w, i) => (
              <div key={i} className={`warning warning-${w.severity}`} role="note">{w.message}</div>
            ))}
          </div>
        </div>
      )}

      <div className="search-row">
        <input
          type="search" placeholder="Search fish… (name or color)"
          value={search} onChange={(e) => setSearch(e.target.value)}
          aria-label="Search fish"
        />
      </div>
      <div className="filter-chips" role="group" aria-label="Filter fish">
        {([['all', 'All'], ['schooling', 'Schooling'], ['peaceful', 'Peaceful'], ['bottom', 'Bottom'], ['easy', 'Easy care'], ['inverts', 'Inverts']] as const).map(([id, label]) => (
          <button key={id} className={filter === id ? 'active' : ''} onClick={() => setFilter(id)}>{label}</button>
        ))}
      </div>

      {list.map((sp) => {
        const count = config.fish[sp.id] ?? 0;
        return (
          <div key={sp.id}>
            <div className="species-row">
              <div className="species-chip" style={speciesChipStyle(sp)} aria-hidden />
              <div className="species-info">
                <div className="name">{sp.common}</div>
                <div className="meta">
                  {sp.adultSizeIn}″ · {sp.temperament} · {sp.zone} · {sp.minGroup > 1 ? `group of ${sp.minGroup}+` : 'fine solo'}
                </div>
              </div>
              <button
                className="info-btn" aria-label={`About ${sp.common}`}
                onClick={() => setExpanded(expanded === sp.id ? null : sp.id)}
              >ⓘ</button>
              <div className="stepper">
                <button aria-label={`Remove one ${sp.common}`} onClick={() => setFishCount(sp.id, count - 1)} disabled={count === 0}>−</button>
                <span className="count">{count}</span>
                <button aria-label={`Add one ${sp.common}`} onClick={() => setFishCount(sp.id, count + 1)}>+</button>
              </div>
            </div>
            {expanded === sp.id && <SpeciesDetails sp={sp} />}
          </div>
        );
      })}
      {list.length === 0 && <p style={{ color: 'var(--text-dim)', fontSize: 13.5 }}>No matches — try a different search.</p>}
    </>
  );
}

function SpeciesDetails({ sp }: { sp: SpeciesDef }) {
  return (
    <div style={{ padding: '4px 10px 12px 62px', fontSize: 13, lineHeight: 1.5, color: '#c4d4de' }}>
      <div style={{ fontStyle: 'italic', color: 'var(--text-dim)', marginBottom: 4 }}>{sp.scientific}</div>
      <div><strong>Habitat:</strong> {sp.habitat}</div>
      <div style={{ marginTop: 4, borderLeft: '2.5px solid var(--accent)', paddingLeft: 9 }}>{sp.funFact}</div>
      <div style={{ marginTop: 4, color: 'var(--text-dim)' }}>
        Care: {sp.careLevel} · needs {sp.minGallons}+ gal
        {sp.water === 'saltwater' && sp.reefSafe === false ? ' · not reef-safe' : ''}
      </div>
    </div>
  );
}

// ─────────────────────── Flora tab ───────────────────────
function FloraTab() {
  const config = useStore((s) => s.config);
  const setFloraCount = useStore((s) => s.setFloraCount);
  const [expanded, setExpanded] = useState<string | null>(null);
  const list = floraForWater(config.water);
  const isSalt = config.water === 'saltwater';

  return (
    <>
      <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 0 }}>
        {isSalt
          ? 'Corals attach to the rockwork — add Reef Rockscape in Decor for the best layout. Watch the Xenia pulse.'
          : 'Plants sway in the filter current. Java fern, anubias and moss attach to wood and stone.'}
      </p>
      {list.map((f) => {
        const count = config.flora[f.id] ?? 0;
        return (
          <div key={f.id}>
            <div className="species-row">
              <div
                className="species-chip"
                style={{ background: `linear-gradient(135deg, ${f.colors[0]}, ${f.colors[1 % f.colors.length]})` }}
                aria-hidden
              />
              <div className="species-info">
                <div className="name">{f.name}</div>
                <div className="meta">{f.kind === 'hardcoral' ? 'hard coral (rigid)' : f.kind} · {f.careLevel}</div>
              </div>
              <button className="info-btn" aria-label={`About ${f.name}`} onClick={() => setExpanded(expanded === f.id ? null : f.id)}>ⓘ</button>
              <div className="stepper">
                <button aria-label={`Remove one ${f.name}`} onClick={() => setFloraCount(f.id, count - 1)} disabled={count === 0}>−</button>
                <span className="count">{count}</span>
                <button aria-label={`Add one ${f.name}`} onClick={() => setFloraCount(f.id, count + 1)}>+</button>
              </div>
            </div>
            {expanded === f.id && (
              <div style={{ padding: '4px 10px 12px 62px', fontSize: 13, lineHeight: 1.5, color: '#c4d4de' }}>
                <div style={{ fontStyle: 'italic', color: 'var(--text-dim)', marginBottom: 4 }}>{(f as FloraDef).scientific}</div>
                {f.info}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

// ─────────────────────── Decor tab ───────────────────────
function DecorTab() {
  const config = useStore((s) => s.config);
  const toggleDecor = useStore((s) => s.toggleDecor);
  const list = decorForWater(config.water);
  const natural = list.filter((d) => !d.playful);
  const playful = list.filter((d) => d.playful);

  return (
    <>
      <div className="section">
        <h2>Hardscape</h2>
        <div className="decor-grid">
          {natural.map((d) => (
            <button
              key={d.id}
              className={config.decor.includes(d.id) ? 'active' : ''}
              onClick={() => toggleDecor(d.id)}
              title={d.info}
              aria-pressed={config.decor.includes(d.id)}
            >
              {d.name}
            </button>
          ))}
        </div>
      </div>
      <div className="section">
        <h2>Playful props</h2>
        <div className="decor-grid">
          {playful.map((d) => (
            <button
              key={d.id}
              className={config.decor.includes(d.id) ? 'active' : ''}
              onClick={() => toggleDecor(d.id)}
              title={d.info}
              aria-pressed={config.decor.includes(d.id)}
            >
              {d.name}
            </button>
          ))}
        </div>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>
        The air stone adds a bubble column; reef rock gives corals a place to grow and shy fish a place to hide.
      </p>
    </>
  );
}

// ─────────────────────── Saved tab ───────────────────────
function SavedTab() {
  const config = useStore((s) => s.config);
  const savedTanks = useStore((s) => s.savedTanks);
  const saveTank = useStore((s) => s.saveTank);
  const loadTank = useStore((s) => s.loadTank);
  const deleteTank = useStore((s) => s.deleteTank);
  const showToast = useStore((s) => s.showToast);
  const [name, setName] = useState(config.name || 'My Tank');

  const names = Object.keys(savedTanks);

  return (
    <>
      <div className="section">
        <h2>Save this tank</h2>
        <div className="name-input">
          <input
            value={name} onChange={(e) => setName(e.target.value)}
            aria-label="Tank name" maxLength={40}
          />
          <button className="btn primary" onClick={() => { saveTank(name.trim() || 'My Tank'); showToast(`Saved “${name.trim() || 'My Tank'}”.`); }}>
            Save
          </button>
        </div>
      </div>
      <div className="section">
        <h2>Your tanks</h2>
        {names.length === 0 && <p style={{ color: 'var(--text-dim)', fontSize: 13.5 }}>Nothing saved yet — build something and save it here. Tanks are stored in this browser.</p>}
        {names.map((n) => (
          <div className="saved-row" key={n}>
            <span className="s-name">{n}</span>
            <button className="btn" onClick={() => loadTank(n)}>Load</button>
            <button className="btn danger" aria-label={`Delete ${n}`} onClick={() => deleteTank(n)}>🗑</button>
          </div>
        ))}
      </div>
      <div className="section">
        <h2>Share</h2>
        <button
          className="btn"
          onClick={async () => {
            const url = encodeShareUrl(config);
            try {
              await navigator.clipboard.writeText(url);
              showToast('Share link copied — send it to a friend and they’ll see this exact tank.');
            } catch {
              window.prompt('Copy this link:', url);
            }
          }}
        >
          🔗 Copy share link
        </button>
      </div>
    </>
  );
}

// ─────────────────────── Settings tab ───────────────────────
function SettingsTab() {
  const quality = useStore((s) => s.quality);
  const audioOn = useStore((s) => s.audioOn);
  const audioVolume = useStore((s) => s.audioVolume);
  const musicOn = useStore((s) => s.musicOn);
  const showHud = useStore((s) => s.showHud);
  const reducedMotion = useStore((s) => s.reducedMotion);
  const set = useStore((s) => s.set);

  return (
    <>
      <div className="section">
        <h2>Graphics quality</h2>
        <div className="seg">
          {(['auto', 'low', 'medium', 'high', 'ultra'] as const).map((q) => (
            <button key={q} className={quality === q ? 'active' : ''} onClick={() => set({ quality: q })}>
              {q === 'auto' ? 'Auto' : q[0].toUpperCase() + q.slice(1)}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '6px 2px 0' }}>
          Auto picks a tier for your device and steps down if the frame rate drops.
        </p>
      </div>

      <div className="section">
        <h2>Sound</h2>
        <div className="seg">
          <button className={audioOn ? 'active' : ''} onClick={() => set({ audioOn: !audioOn })}>
            {audioOn ? '🔊 Ambience on' : '🔇 Muted'}
          </button>
          <button className={musicOn ? 'active' : ''} onClick={() => set({ musicOn: !musicOn })}>
            {musicOn ? '🎵 Music on' : '🎵 Music off'}
          </button>
        </div>
        <div className="slider-row" style={{ marginTop: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Volume</span>
          <input
            type="range" min={0} max={1} step={0.05} value={audioVolume}
            aria-label="Volume"
            onChange={(e) => set({ audioVolume: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="section">
        <h2>Comfort</h2>
        <div className="seg">
          <button className={reducedMotion ? 'active' : ''} onClick={() => set({ reducedMotion: !reducedMotion })}>
            {reducedMotion ? '🐢 Calm motion on' : 'Calm motion off'}
          </button>
          <button className={showHud ? 'active' : ''} onClick={() => set({ showHud: !showHud })}>
            {showHud ? '📈 Perf HUD on' : 'Perf HUD off'}
          </button>
        </div>
      </div>

      <div className="section">
        <h2>About</h2>
        <p style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.6 }}>
          Every fish, plant, texture and sound in this aquarium is generated procedurally in your
          browser — no downloads, no tracking, nothing to install. Built with Three.js.
          Keyboard: <kbd>H</kbd> hide UI · <kbd>F</kbd> feed · <kbd>C</kbd> cinematic camera · <kbd>P</kbd> photo.
        </p>
      </div>
    </>
  );
}
