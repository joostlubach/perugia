import { useState } from 'react';
import { LeaderboardEntry } from '../../types';
import { avatarSrc } from '../../avatar';
import { t } from '../../texts';

// Top-right controls at the reveal: pick a player to show just their answer,
// and, while one is shown, go back to everyone's.
export function PlayerPicker({
  players,
  selectedId,
  onSelect,
}: {
  players: LeaderboardEntry[];
  selectedId: string | null;
  onSelect: (playerId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const sorted = [...players].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="player-picker">
      {selectedId && (
        <button className="btn" onClick={() => onSelect(null)}>
          {t('host.reveal.showAll')}
        </button>
      )}
      <button className="btn" onClick={() => setOpen((o) => !o)}>
        {t('host.reveal.pickPlayer')}
      </button>
      {open && (
        <div className="player-picker-menu">
          {sorted.map((p) => (
            <button
              key={p.id}
              className={`player-picker-option ${p.id === selectedId ? 'selected' : ''}`}
              onClick={() => {
                onSelect(p.id);
                setOpen(false);
              }}
            >
              <img className="avatar-img" src={avatarSrc(p.avatar)} alt="" />
              <span>{p.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
