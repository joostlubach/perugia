import { PointerEvent as ReactPointerEvent, useRef, useState } from 'react';
import { Countdown } from './Countdown';
import { Point } from '../types';

// Freehand red-pen drawing over a photo. Strokes are kept in normalized [0,1]
// image coordinates so they score the same regardless of screen size.
export function TraceMarksBoard({
  imageUrl,
  aspectRatio,
  startedAt,
  timeLimitSec,
  onSubmit,
}: {
  imageUrl: string;
  aspectRatio: number;
  startedAt: number | null;
  timeLimitSec: number;
  onSubmit: (strokes: Point[][]) => void;
}) {
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [submitted, setSubmitted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const strokesRef = useRef(strokes);
  const submittedRef = useRef(false);
  strokesRef.current = strokes;

  const submit = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);
    onSubmit(strokesRef.current);
  };

  const posFromEvent = (e: ReactPointerEvent): Point => {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    if (submitted) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    setStrokes((prev) => [...prev, [posFromEvent(e)]]);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!drawingRef.current) return;
    const pt = posFromEvent(e);
    setStrokes((prev) => {
      const current = prev[prev.length - 1];
      const last = current[current.length - 1];
      if (Math.hypot(pt.x - last.x, pt.y - last.y) < MIN_POINT_DISTANCE) return prev;
      return [...prev.slice(0, -1), [...current, pt]];
    });
  };

  const onPointerUp = () => {
    drawingRef.current = false;
  };

  return (
    <div className="trace-wrap">
      <div
        ref={containerRef}
        className="trace-canvas"
        style={{ aspectRatio: String(aspectRatio), width: `min(100%, 360px, calc(48vh * ${aspectRatio}))` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <img src={imageUrl} alt="" className="trace-image" draggable={false} />
        <svg className="trace-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
          {strokes.map((stroke, i) => (
            <polyline
              key={i}
              points={stroke.map((p) => `${p.x * 100},${p.y * 100}`).join(' ')}
              fill="none"
              stroke="#e0102a"
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </div>

      {!submitted && (
        <>
          <div className="trace-actions">
            <button className="btn" disabled={strokes.length === 0} onClick={() => setStrokes((s) => s.slice(0, -1))}>
              ↩️ Undo
            </button>
            <button className="btn" disabled={strokes.length === 0} onClick={() => setStrokes([])}>
              🗑️ Clear
            </button>
          </div>
          <button className="btn btn-primary btn-lg" onClick={submit}>
            🖍️ Done drawing
          </button>
          {startedAt && <Countdown startedAt={startedAt} timeLimitSec={timeLimitSec} onExpire={submit} />}
        </>
      )}
    </div>
  );
}

// Keeps the stroke payload small without visibly affecting the line.
const MIN_POINT_DISTANCE = 0.004;
