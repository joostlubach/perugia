import { useEffect, useRef, useState } from 'react';
import { useCountdown } from './Countdown';
import { Shape } from './Shape';
import { usePhotoIndex } from '../hooks/usePhotoIndex';
import { t } from '../texts';

// Lightning round: the photos come one by one on a fixed clock; tap a floor
// for each while it shows. The first tap counts. Handed in after the last
// photo's tap, or when time's up.
export function PhotoFloorsBoard({
  floors,
  photoUrls,
  photoTimeSec,
  startedAt,
  timeLimitSec,
  onSubmit,
}: {
  floors: string[];
  photoUrls: string[];
  photoTimeSec: number;
  startedAt: number | null;
  timeLimitSec: number;
  onSubmit: (floors: number[]) => void;
}) {
  const index = usePhotoIndex(startedAt, photoTimeSec, photoUrls.length);
  const [picks, setPicks] = useState<number[]>(() => photoUrls.map(() => -1));
  const picksRef = useRef(picks);
  const submittedRef = useRef(false);
  picksRef.current = picks;

  useEffect(() => {
    for (const url of photoUrls) new Image().src = url;
  }, [photoUrls]);

  const submit = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    onSubmit(picksRef.current);
  };
  useCountdown(startedAt, timeLimitSec, submit);

  const pick = (floor: number) => {
    if (picks[index] !== -1) return;
    const next = picks.map((p, i) => (i === index ? floor : p));
    picksRef.current = next;
    setPicks(next);
    if (index === photoUrls.length - 1) submit();
  };

  const picked = picks[index];

  return (
    <div className="photo-floors-board">
      <div className="hint">{t('boards.photoFloors.progress', { number: index + 1, total: photoUrls.length })}</div>
      <div className="photo-floors-photo">
        <img key={index} src={photoUrls[index]} alt="" />
        <div key={`timer-${index}`} className="photo-floors-timer" style={{ animationDuration: `${photoTimeSec}s` }} />
      </div>
      <div className="photo-floors-options">
        {floors.map((floor, i) => (
          <button
            key={i}
            className={`shape-btn shape-${i} ${picked !== -1 && picked !== i ? 'dimmed' : ''}`}
            disabled={picked !== -1}
            onClick={() => pick(i)}
          >
            <Shape index={i} />
            <span style={{ flex: 1, textAlign: 'left' }}>{floor}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
