import { useState } from 'react';
import { audio } from '../audio';

export function MuteToggle() {
  const [muted, setMuted] = useState(audio.isMuted());
  return (
    <button
      className="mute-toggle"
      onClick={() => setMuted(audio.toggleMuted())}
      aria-label={muted ? 'Unmute' : 'Mute'}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
