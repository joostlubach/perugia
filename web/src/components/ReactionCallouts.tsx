import { useEffect, useRef, useState } from 'react';
import { avatarSrc } from '../avatar';
import { playReaction, reactionInfo } from '../reactions';
import { Reaction } from '../types';

const SHOW_MS = 3500;
// Reactions older than this when first seen (e.g. after reloading the TV
// page) are skipped rather than all played at once.
const STALE_MS = 6000;

// Pops up each new reaction on the big screen -- the player's avatar with a
// speech bubble -- and plays its sound.
export function ReactionCallouts({ reactions }: { reactions: Reaction[] }) {
  const [visible, setVisible] = useState<Reaction[]>([]);
  const seen = useRef(new Set<string>());

  useEffect(() => {
    const now = Date.now();
    for (const reaction of reactions) {
      if (seen.current.has(reaction.id)) continue;
      seen.current.add(reaction.id);
      if (now - reaction.at > STALE_MS) continue;
      playReaction(reaction.kind);
      setVisible((prev) => [...prev, reaction]);
      setTimeout(() => setVisible((prev) => prev.filter((r) => r.id !== reaction.id)), SHOW_MS);
    }
  }, [reactions]);

  return (
    <div className="reaction-callouts">
      {visible.map((reaction) => (
        <div key={reaction.id} className="reaction-callout">
          <img src={avatarSrc(reaction.avatar)} alt={reaction.name} />
          <div className="reaction-bubble">
            <span className="reaction-bubble-text">
              {reactionInfo(reaction.kind).emoji} {reactionInfo(reaction.kind).callout}
            </span>
            <span className="reaction-bubble-name">{reaction.name}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
