import { PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';
import { avatarName, avatarSrc } from '../avatar';
import { Countdown } from './Countdown';
import { PlateAnswer } from '../types';

interface Marks {
  primo: boolean;
  secondo: boolean;
}

type Course = 'primo' | 'secondo';

// A vertical dinner table: a head seat, then two columns of seats running
// down either side. Player drags "Primo"/"Secondo" chips onto a seat's
// plate -- dropping the same course again clears it, so mistakes are easy
// to undo. A seat can end up with neither, either, or both marks.
export function PlateBoard({
  head,
  left,
  right,
  startedAt,
  timeLimitSec,
  onSubmit,
}: {
  head: string;
  left: string[];
  right: string[];
  startedAt: number | null;
  timeLimitSec: number;
  onSubmit: (answer: PlateAnswer) => void;
}) {
  const seats = [head, ...left, ...right];
  const [marks, setMarks] = useState<Record<string, Marks>>(() =>
    Object.fromEntries(seats.map((s) => [s, { primo: false, secondo: false }])),
  );
  const [drag, setDrag] = useState<{ course: Course; x: number; y: number } | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const marksRef = useRef(marks);
  const submittedRef = useRef(false);
  marksRef.current = marks;

  const submit = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);
    const current = marksRef.current;
    onSubmit({
      primo: seats.filter((s) => current[s].primo),
      secondo: seats.filter((s) => current[s].secondo),
    });
  };

  const drop = (course: Course, clientX: number, clientY: number) => {
    const target = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>('[data-seat]');
    const seat = target?.dataset.seat;
    if (!seat) return;
    setMarks((prev) => ({ ...prev, [seat]: { ...prev[seat], [course]: !prev[seat][course] } }));
  };

  const startDrag = (course: Course, e: ReactPointerEvent) => {
    e.preventDefault();
    setDrag({ course, x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => setDrag((prev) => prev && { ...prev, x: e.clientX, y: e.clientY });
    const onUp = (e: PointerEvent) => {
      drop(drag.course, e.clientX, e.clientY);
      setDrag(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.course]);

  return (
    <div className="plate-board">
      <Seat seatKey={head} marks={marks[head]} side="head" />
      <div className="dinner-table-body">
        <div className="dinner-side">
          {left.map((s) => (
            <Seat key={s} seatKey={s} marks={marks[s]} side="left" />
          ))}
        </div>
        <div className="dinner-table-rect" />
        <div className="dinner-side">
          {right.map((s) => (
            <Seat key={s} seatKey={s} marks={marks[s]} side="right" />
          ))}
        </div>
      </div>

      {!submitted && (
        <>
          <div className="course-source-row">
            <div className="course-source primo" onPointerDown={(e) => startDrag('primo', e)}>
              🍝 Primo
            </div>
            <div className="course-source secondo" onPointerDown={(e) => startDrag('secondo', e)}>
              🥩 Secondo
            </div>
          </div>
          <button className="btn btn-primary btn-lg" onClick={submit}>
            ✅ Done
          </button>
          {startedAt && <Countdown startedAt={startedAt} timeLimitSec={timeLimitSec} onExpire={submit} />}
        </>
      )}

      {drag && (
        <div className="course-ghost" style={{ left: drag.x, top: drag.y }}>
          {drag.course === 'primo' ? '🍝' : '🥩'}
        </div>
      )}
    </div>
  );
}

export function Seat({ seatKey, marks, side }: { seatKey: string; marks: Marks; side: 'left' | 'right' | 'head' }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className={`dinner-seat dinner-seat-${side}`} data-seat={seatKey}>
      <div className="dinner-seat-label">
        {broken ? (
          <div className="dinner-seat-fallback">{avatarName(seatKey)[0]}</div>
        ) : (
          <img src={avatarSrc(seatKey)} alt="" draggable={false} onError={() => setBroken(true)} />
        )}
        <span>{avatarName(seatKey)}</span>
      </div>
      <div className="dinner-plate">
        {marks.primo && <span className="plate-mark primo">🍝</span>}
        {marks.secondo && <span className="plate-mark secondo">🥩</span>}
      </div>
    </div>
  );
}
