import { useState } from 'react';
import { api } from '../api';
import { REACTIONS } from '../reactions';
import { ReactionKind } from '../types';

const COOLDOWN_MS = 1200;

// Fixed to the bottom of the player's screen for the whole game.
export function ReactionBar({ playerId, playerToken, final }: { playerId: string; playerToken: string; final: boolean }) {
  const [coolingDown, setCoolingDown] = useState(false);

  const react = (kind: ReactionKind) => {
    if (coolingDown) return;
    setCoolingDown(true);
    setTimeout(() => setCoolingDown(false), COOLDOWN_MS);
    api.react(playerId, playerToken, kind).catch(() => {});
  };

  return (
    <div className="reaction-bar">
      {REACTIONS.filter((r) => final || !r.finalOnly).map((r) => (
        <button key={r.kind} className="reaction-btn" disabled={coolingDown} onClick={() => react(r.kind)}>
          <span className="reaction-emoji">{r.emoji}</span>
          {r.label}
        </button>
      ))}
    </div>
  );
}
