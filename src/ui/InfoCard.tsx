// Tap-a-fish info card: species facts + "name your fish" + follow control.

import { useState } from 'react';
import { useStore } from '../state/store';
import { speciesById } from '../data/species';

export function InfoCard() {
  const selectedFishKey = useStore((s) => s.selectedFishKey);
  const followFishKey = useStore((s) => s.followFishKey);
  const fishNames = useStore((s) => s.config.fishNames);
  const nameFish = useStore((s) => s.nameFish);
  const set = useStore((s) => s.set);
  const [draft, setDraft] = useState('');

  if (!selectedFishKey) return null;
  const speciesId = selectedFishKey.split(':')[0];
  const sp = speciesById.get(speciesId);
  if (!sp) return null;

  const petName = fishNames[selectedFishKey];
  const following = followFishKey === selectedFishKey;

  return (
    <div className="info-card" role="dialog" aria-label={`About this ${sp.common}`}>
      <button className="close" aria-label="Close" onClick={() => set({ selectedFishKey: null, followFishKey: null })}>✕</button>
      <h3>{petName ? `${petName} the ${sp.common}` : sp.common}</h3>
      <div className="sci">{sp.scientific}</div>
      <div className="chips">
        <span className="chip">{sp.adultSizeIn}″ adult</span>
        <span className="chip">{sp.temperament}</span>
        <span className="chip">{sp.zone}-dweller</span>
        <span className="chip">{sp.careLevel} care</span>
        {sp.minGroup > 1 && <span className="chip">schools of {sp.minGroup}+</span>}
      </div>
      <p><strong>Home waters:</strong> {sp.habitat}</p>
      <p className="fact">{sp.funFact}</p>
      <div className="name-input">
        <input
          placeholder={petName ? `Rename ${petName}…` : 'Name this fish…'}
          value={draft}
          maxLength={24}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && draft.trim()) { nameFish(selectedFishKey, draft.trim()); setDraft(''); }
          }}
          aria-label="Fish name"
        />
        <button
          className="btn primary"
          disabled={!draft.trim()}
          onClick={() => { nameFish(selectedFishKey, draft.trim()); setDraft(''); }}
        >Name</button>
      </div>
      <div className="row-actions" style={{ marginTop: 8 }}>
        <button
          className="btn"
          onClick={() => set({ followFishKey: following ? null : selectedFishKey, cameraMode: following ? 'orbit' : 'follow' })}
        >
          {following ? '👁 Stop following' : '👁 Follow'}
        </button>
      </div>
    </div>
  );
}
