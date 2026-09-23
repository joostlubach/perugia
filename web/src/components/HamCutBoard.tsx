import { PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';
import { useCountdown } from './Countdown';
import { HamLine, Point } from '../types';
import { t } from '../texts';

// Two draggable control points define a line; the player is trying to find
// the line that splits the pictured object into two equal-area halves.
export function HamCutBoard({
  imageUrl,
  startedAt,
  timeLimitSec,
  onSubmit,
}: {
  imageUrl: string;
  startedAt: number | null;
  timeLimitSec: number;
  onSubmit: (line: HamLine) => void;
}) {
  const [p1, setP1] = useState<Point>({ x: 0.3, y: 0.25 });
  const [p2, setP2] = useState<Point>({ x: 0.7, y: 0.75 });
  const [dragging, setDragging] = useState<'p1' | 'p2' | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const p1Ref = useRef(p1);
  const p2Ref = useRef(p2);
  const submittedRef = useRef(false);
  p1Ref.current = p1;
  p2Ref.current = p2;

  const submit = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);
    onSubmit({ p1: p1Ref.current, p2: p2Ref.current });
  };
  useCountdown(startedAt, timeLimitSec, submit);

  const posFromEvent = (clientX: number, clientY: number): Point => {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const pt = posFromEvent(e.clientX, e.clientY);
      if (dragging === 'p1') setP1(pt);
      else setP2(pt);
    };
    const onUp = () => setDragging(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  const startDrag = (which: 'p1' | 'p2', e: ReactPointerEvent) => {
    if (submitted) return;
    e.preventDefault();
    e.stopPropagation();
    setDragging(which);
  };

  const clipped = clipLineToUnitSquare(p1, p2);

  return (
    <div className="ham-cut-wrap">
      <div ref={containerRef} className="ham-cut-canvas">
        <img src={imageUrl} alt="Ham to cut in half" className="ham-cut-image" draggable={false} />
        <svg className="ham-cut-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
          {clipped && (
            <line
              x1={clipped[0].x * 100}
              y1={clipped[0].y * 100}
              x2={clipped[1].x * 100}
              y2={clipped[1].y * 100}
              stroke="#cd212a"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        <div
          className="ham-cut-handle"
          style={{ left: `${p1.x * 100}%`, top: `${p1.y * 100}%` }}
          onPointerDown={(e) => startDrag('p1', e)}
        />
        <div
          className="ham-cut-handle"
          style={{ left: `${p2.x * 100}%`, top: `${p2.y * 100}%` }}
          onPointerDown={(e) => startDrag('p2', e)}
        />
      </div>

      {!submitted && (
        <>
          <button className="btn btn-primary btn-lg" onClick={submit}>
            {t('boards.hamCut.done')}
          </button>
        </>
      )}
    </div>
  );
}

// Clips the infinite line through p1/p2 to the [0,1]x[0,1] square, so it's
// drawn all the way across the canvas rather than just between the handles.
function clipLineToUnitSquare(p1: Point, p2: Point): [Point, Point] | null {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return null;

  const candidates: { t: number; pt: Point }[] = [];
  const consider = (t: number, x: number, y: number) => {
    if (x >= -1e-6 && x <= 1 + 1e-6 && y >= -1e-6 && y <= 1 + 1e-6) {
      candidates.push({ t, pt: { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) } });
    }
  };

  if (Math.abs(dx) > 1e-9) {
    let t = (0 - p1.x) / dx;
    consider(t, 0, p1.y + t * dy);
    t = (1 - p1.x) / dx;
    consider(t, 1, p1.y + t * dy);
  }
  if (Math.abs(dy) > 1e-9) {
    let t = (0 - p1.y) / dy;
    consider(t, p1.x + t * dx, 0);
    t = (1 - p1.y) / dy;
    consider(t, p1.x + t * dx, 1);
  }

  if (candidates.length < 2) return null;
  candidates.sort((a, b) => a.t - b.t);
  return [candidates[0].pt, candidates[candidates.length - 1].pt];
}
