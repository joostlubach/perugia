import { useEffect, useRef, useState } from 'react'
import { audio, SoundKey } from '../audio'
import { createAudioSequencer, preloadAudio } from '../audioSequencer'
import { useCountdown } from './Countdown'
import { t } from '../texts';

interface Token {
  id: number;
  rot: number;
}

// A "how many times does X happen" question: the player drags a labeled chip
// onto the canvas once per guessed occurrence, or a ×4 chip to add four at
// once. There's no counter shown -- it's just a pile of chips, same as
// tallying by hand.
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
  const dragAmount = useRef(1);
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

  const drop = (clientX: number, clientY: number, amount: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return;
    // A bulk drop replaces the queued chant rather than piling on top of it.
    if (amount > 1) sequencerRef.current?.stop();
    const added: Token[] = [];
    for (let i = 0; i < amount; i++) {
      // The sequencer queues slices back to back, so ×4 chants four words in a row.
      if (sequencerRef.current) sequencerRef.current.playNext();
      nextId.current += 1;
      added.push({ id: nextId.current, rot: Math.random() * 16 - 8 });
    }
    if (!sequencerRef.current && dropSound) audio.playOverlapping(dropSound);
    countRef.current += amount;
    setTokens((prev) => [...prev, ...added]);
  };

  const startDrag = (e: React.PointerEvent, amount: number) => {
    e.preventDefault();
    dragAmount.current = amount;
    setDragPos({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    if (!dragPos) return;
    const onMove = (e: PointerEvent) => setDragPos({ x: e.clientX, y: e.clientY });
    const onUp = (e: PointerEvent) => {
      drop(e.clientX, e.clientY, dragAmount.current);
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
        {tokens.length === 0 && <span className="hint">{t('boards.dragCount.hint', { label: dragLabel })}</span>}
        {tokens.map((t) => (
          <span key={t.id} className="drag-token" style={{ transform: `rotate(${t.rot}deg)` }}>
            {dragLabel}
          </span>
        ))}
      </div>

      {!submitted && (
        <>
          <div className="drag-sources">
            <div className="drag-source" onPointerDown={(e) => startDrag(e, 1)}>
              {dragLabel}
            </div>
            <div className="drag-source" onPointerDown={(e) => startDrag(e, BULK_AMOUNT)}>
              {dragLabel} ×{BULK_AMOUNT}
            </div>
          </div>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => {
              sequencerRef.current?.stop();
              if (doneSound) audio.play(doneSound);
              submit();
            }}
          >
            {t('boards.dragCount.done')}
          </button>
        </>
      )}

      {dragPos && (
        <div className="drag-ghost" style={{ left: dragPos.x, top: dragPos.y }}>
          {dragLabel}
          {dragAmount.current > 1 && ` ×${dragAmount.current}`}
        </div>
      )}
    </div>
  );
}

const BULK_AMOUNT = 4;

// Timestamps (seconds) marking where each word starts/ends in pedrope.mp3
// ("pedro pedro pedro pedro PE", ~3.03s total). Four slices: the fourth
// "pedro" and the "PE" share one, so every fourth drop finishes the chant.
// Tweak these by ear to line them up with where each word really falls.
const PEDRO_WORD_BOUNDARIES = [0, 0.4, 0.9, 1.5, 3.033];
const PEDRO_CHANT_URL = '/audio/pedrope.mp3';

// Called when the player app opens, long before the Pedro question comes up.
export function preloadDragSounds() {
  preloadAudio(PEDRO_CHANT_URL);
}

// Shared by the real player view and the local test harness so both stay in
// sync if this ever changes.
export function dragSoundPropsFor(dragLabel: string): {
  dropSoundSequence?: { url: string; boundaries: number[] };
  doneSound?: SoundKey;
} {
  if (dragLabel.toLowerCase() !== 'pedro') return {};
  return {
    dropSoundSequence: { url: PEDRO_CHANT_URL, boundaries: PEDRO_WORD_BOUNDARIES },
    doneSound: 'fidatidime',
  };
}
