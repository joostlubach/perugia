import { PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';
import { MapArea, SketchPiece, SketchPlacement } from '../types';
import { useCountdown } from './Countdown';
import { FIGURES, pieceLabel, SketchFigure, UprightSketchFigure } from './SketchFigure';
import { SketchMap } from './SketchMap';
import { t } from '../texts';

// Player drags pieces from the tray onto the map, moves them around, and
// turns the selected one by its handle. Dropping a piece on the tray takes
// it off the map again.
export function SketchBoard({
  mapUrl,
  aspectRatio,
  zoom,
  pieces,
  startedAt,
  timeLimitSec,
  onSubmit,
}: {
  mapUrl: string;
  aspectRatio: number;
  zoom: MapArea;
  pieces: SketchPiece[];
  startedAt: number | null;
  timeLimitSec: number;
  onSubmit: (placements: SketchPlacement[]) => void;
}) {
  const [placements, setPlacements] = useState<SketchPlacement[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const trayRef = useRef<HTMLDivElement>(null);
  const placementsRef = useRef(placements);
  const submittedRef = useRef(false);
  const pointerRef = useRef({ x: 0, y: 0 });

  placementsRef.current = placements;

  const submit = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);
    setSelected(null);
    onSubmit(placementsRef.current);
  };
  useCountdown(startedAt, timeLimitSec, submit);

  const mapPoint = (clientX: number, clientY: number) => {
    const rect = mapRef.current!.getBoundingClientRect();
    return { x: (clientX - rect.left) / rect.width, y: (clientY - rect.top) / rect.height };
  };

  const update = (id: string, change: Partial<SketchPlacement>) =>
    setPlacements((prev) => prev.map((p) => (p.id === id ? { ...p, ...change } : p)));

  const startTrayDrag = (id: string, e: ReactPointerEvent) => {
    e.preventDefault();
    pointerRef.current = { x: e.clientX, y: e.clientY };
    setSelected(null);
    setDrag({ mode: 'tray', id, x: e.clientX, y: e.clientY });
  };

  const startMove = (id: string, e: ReactPointerEvent) => {
    e.preventDefault();
    const placement = placements.find((p) => p.id === id)!;
    const point = mapPoint(e.clientX, e.clientY);
    pointerRef.current = { x: e.clientX, y: e.clientY };
    setSelected(id);
    setDrag({ mode: 'move', id, offsetX: placement.x - point.x, offsetY: placement.y - point.y });
  };

  const startRotate = (id: string, e: ReactPointerEvent) => {
    e.preventDefault();
    const placement = placements.find((p) => p.id === id)!;
    pointerRef.current = { x: e.clientX, y: e.clientY };
    setDrag({
      mode: 'rotate',
      id,
      startAngle: pointerAngle(placement, e.clientX, e.clientY),
      startRotation: placement.rotation,
    });
  };

  // Degrees clockwise from straight up, of the pointer around the piece's center.
  const pointerAngle = (placement: SketchPlacement, clientX: number, clientY: number) => {
    const rect = mapRef.current!.getBoundingClientRect();
    const cx = rect.left + placement.x * rect.width;
    const cy = rect.top + placement.y * rect.height;
    return (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI + 90;
  };

  useEffect(() => {
    if (!drag) return;

    const onMove = (e: PointerEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY };
      if (drag.mode === 'tray') {
        setDrag((prev) => prev && { ...prev, x: e.clientX, y: e.clientY });
      } else if (drag.mode === 'move') {
        const point = mapPoint(e.clientX, e.clientY);
        update(drag.id, { x: point.x + drag.offsetX, y: point.y + drag.offsetY });
      } else {
        const placement = placementsRef.current.find((p) => p.id === drag.id)!;
        const turned = pointerAngle(placement, e.clientX, e.clientY) - drag.startAngle;
        update(drag.id, { rotation: Math.round((((drag.startRotation + turned) % 360) + 360) % 360) });
      }
    };

    const onUp = (e: PointerEvent) => {
      if (drag.mode === 'tray') {
        if (contains(mapRef.current, e.clientX, e.clientY)) {
          const point = mapPoint(e.clientX, e.clientY);
          const kind = pieces.find((p) => p.id === drag.id)!.kind;
          setPlacements((prev) => [...prev, { id: drag.id, x: point.x, y: point.y, rotation: FIGURES[kind].rotation }]);
          setSelected(drag.id);
        }
      } else if (drag.mode === 'move') {
        if (contains(trayRef.current, e.clientX, e.clientY)) {
          setPlacements((prev) => prev.filter((p) => p.id !== drag.id));
          setSelected(null);
        } else {
          setPlacements((prev) =>
            prev.map((p) => (p.id === drag.id ? { ...p, x: clamp(p.x), y: clamp(p.y) } : p)),
          );
        }
      }
      setDrag(null);
    };

    // Scroll the page while dragging near the top or bottom edge, so the
    // map can be reached from the tray on a short screen.
    let frame = requestAnimationFrame(function autoScroll() {
      const { y } = pointerRef.current;
      if (drag.mode !== 'rotate') {
        if (y < EDGE_ZONE) window.scrollBy(0, -SCROLL_SPEED);
        else if (y > window.innerHeight - EDGE_ZONE) window.scrollBy(0, SCROLL_SPEED);
      }
      frame = requestAnimationFrame(autoScroll);
    });

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.mode, drag?.id]);

  const placed = new Set(placements.map((p) => p.id));
  const tray = pieces.filter((p) => !placed.has(p.id));
  const ghost = drag?.mode === 'tray' ? pieces.find((p) => p.id === drag.id) : undefined;

  return (
    <div className="sketch-board">
      <SketchMap
        mapUrl={mapUrl}
        aspectRatio={aspectRatio}
        zoom={zoom}
        zoomIn
        pieces={pieces}
        placements={placements}
        mapRef={mapRef}
        selected={selected}
        draggingId={drag?.mode === 'move' ? drag.id : null}
        onPiecePointerDown={submitted ? undefined : startMove}
        onRotatePointerDown={submitted ? undefined : startRotate}
        onBackgroundPointerDown={() => setSelected(null)}
      />

      {!submitted && <p className="hint">{t('boards.sketch.hint')}</p>}

      <div className="sketch-tray" ref={trayRef}>
        {tray.length === 0 && <span className="hint">{t('boards.sketch.allPlaced')}</span>}
        {tray.map((piece) => (
          <div
            key={piece.id}
            className={`sketch-tray-piece ${piece.kind} ${submitted ? '' : 'draggable'} ${
              drag?.mode === 'tray' && drag.id === piece.id ? 'dragging' : ''
            }`}
            onPointerDown={submitted ? undefined : (e) => startTrayDrag(piece.id, e)}
          >
            <UprightSketchFigure {...piece} />
            <span>{pieceLabel(piece)}</span>
          </div>
        ))}
      </div>

      {!submitted && (
        <button className="btn btn-primary btn-lg" onClick={submit}>
          {t('boards.sketch.done')}
        </button>
      )}

      {drag?.mode === 'tray' && ghost && (
        <div
          className="sketch-drag-ghost"
          style={{
            left: drag.x,
            top: drag.y,
            width: FIGURES[ghost.kind].mapWidth * (mapRef.current?.getBoundingClientRect().width ?? 0),
            transform: `translate(-50%, -50%) rotate(${FIGURES[ghost.kind].rotation}deg)`,
          }}
        >
          <SketchFigure {...ghost} rotation={FIGURES[ghost.kind].rotation} />
        </div>
      )}
    </div>
  );
}

type DragState =
  | { mode: 'tray'; id: string; x: number; y: number }
  // Offset from the pointer to the piece's center, in map fractions.
  | { mode: 'move'; id: string; offsetX: number; offsetY: number }
  // Turns the piece by as much as the pointer has gone around it since `startAngle`.
  | { mode: 'rotate'; id: string; startAngle: number; startRotation: number };

const EDGE_ZONE = 60;
const SCROLL_SPEED = 8;

function contains(el: HTMLElement | null, x: number, y: number): boolean {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}
