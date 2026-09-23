import { useState } from 'react';
import { api } from '../api';
import { playReaction, REACTIONS } from '../reactions';
import { ReactionKind } from '../types';

const COOLDOWN_MS = 1200;

// Fixed to the bottom of the player's screen for the whole game.
export function ReactionBar({ playerId, playerToken }: { playerId: string; playerToken: string }) {
  const [coolingDown, setCoolingDown] = useState(false);

  const react = (kind: ReactionKind) => {
    if (coolingDown) return;
    setCoolingDown(true);
    setTimeout(() => setCoolingDown(false), COOLDOWN_MS);
    playReaction(kind);
    api.react(playerId, playerToken, kind).catch(() => {});
  };

  return (
    <div className="reaction-bar">
      {REACTIONS.map((r) => (
        <button key={r.kind} className="reaction-btn" disabled={coolingDown} onClick={() => react(r.kind)}>
          <span className="reaction-emoji">{r.emoji}</span>
          {r.label}
        </button>
      ))}
    </div>
  );
}
