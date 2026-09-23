import { useEffect, useRef, useState } from 'react'
import { audio, SoundKey } from '../audio'
import { createAudioSequencer } from '../audioSequencer'
import { useCountdown } from './Countdown'

interface Token {
  id: number;
  rot: number;
}

// A "how many times does X happen" question: the player drags a labeled chip
// onto the canvas once per guessed occurrence. There's no counter shown --
// it's just a pile of chips, same as tallying by hand.
export function DragCanvas({
  dragLabel,
  dropSound,
  dropSoundSequence,
  doneSound,
  startedAt,
  timeLimitSec,
  onSubmit,
}: {
  dragLabel: string;
  // Simple one-shot sound played (possibly overlapping) on every drop.
  dropSound?: SoundKey;
  // Preloaded and split at `boundaries` (seconds), one slice played per
  // drop, cycling -- e.g. a "pedro pedro pedro pedro PE" chant played one
  // word per drag. Takes priority over dropSound when both are given.
  dropSoundSequence?: { url: string; boundaries: number[] };
  // Played when the player clicks "Done dragging" (not on timer expiry).
  doneSound?: SoundKey;
  startedAt: number | null;
  timeLimitSec: number;
  onSubmit: (count: number) => void;
}) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const countRef = useRef(0);
  const nextId = useRef(0);
  const submittedRef = useRef(false);
  const sequencerRef = useRef<ReturnType<typeof createAudioSequencer> | null>(null);

  useEffect(() => {
    if (!dropSoundSequence) return;
    // Created (and its file fetched/decoded) as soon as the question
    // appears, so it's ready by the time the player's first drag lands.
    sequencerRef.current = createAudioSequencer(dropSoundSequence.url, dropSoundSequence.boundaries);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropSoundSequence?.url, dropSoundSequence?.boundaries.join(',')]);

  const submit = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);
    onSubmit(countRef.current);
  };
  useCountdown(startedAt, timeLimitSec, submit);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) canvas.scrollTop = canvas.scrollHeight;
  }, [tokens.length]);

  const drop = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return;
    if (sequencerRef.current) sequencerRef.current.playNext();
    else if (dropSound) audio.playOverlapping(dropSound);
    countRef.current += 1;
    nextId.current += 1;
    setTokens((prev) => [...prev, { id: nextId.current, rot: Math.random() * 16 - 8 }]);
  };

  useEffect(() => {
    if (!dragPos) return;
    const onMove = (e: PointerEvent) => setDragPos({ x: e.clientX, y: e.clientY });
    const onUp = (e: PointerEvent) => {
      drop(e.clientX, e.clientY);
      setDragPos(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(dragPos)]);

  return (
    <div style={{ width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
      <div ref={canvasRef} className="drag-canvas">
        {tokens.length === 0 && <span className="hint">Drag {dragLabel} in here, once per guess</span>}
        {tokens.map((t) => (
          <span key={t.id} className="drag-token" style={{ transform: `rotate(${t.rot}deg)` }}>
            {dragLabel}
          </span>
        ))}
      </div>

      {!submitted && (
        <>
          <div
            className="drag-source"
            onPointerDown={(e) => {
              e.preventDefault();
              setDragPos({ x: e.clientX, y: e.clientY });
            }}
          >
            {dragLabel}
          </div>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => {
              if (doneSound) audio.play(doneSound);
              submit();
            }}
          >
            ✅ Done dragging
          </button>
        </>
      )}

      {dragPos && (
        <div className="drag-ghost" style={{ left: dragPos.x, top: dragPos.y }}>
          {dragLabel}
        </div>
      )}
    </div>
  );
}

// Timestamps (seconds) marking where each word starts/ends in pedrope.mp3
// ("pedro pedro pedro pedro PE", ~3.03s total). Currently just 5 equal
// slices -- tweak these by ear against the actual recording to line the
// boundaries up with where each word really falls.
const PEDRO_WORD_BOUNDARIES = [0, 0.4, 0.9, 1.5, 2.4, 3.033];

// Shared by the real player view and the local test harness so both stay in
// sync if this ever changes.
export function dragSoundPropsFor(dragLabel: string): {
  dropSoundSequence?: { url: string; boundaries: number[] };
  doneSound?: SoundKey;
} {
  if (dragLabel.toLowerCase() !== 'pedro') return {};
  return {
    dropSoundSequence: { url: '/audio/pedrope.mp3', boundaries: PEDRO_WORD_BOUNDARIES },
    doneSound: 'fidatidime',
  };
}
