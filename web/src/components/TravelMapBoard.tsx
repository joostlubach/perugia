import { PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';
import { MapPin } from '../types';
import { Countdown } from './Countdown';
import { TravelAvatar, TravelMap } from './TravelMap';

// Player drags each person from the tray onto the map stop where they were,
// and can move them between stops or back to the tray until locking in.
export function TravelMapBoard({
  mapUrl,
  aspectRatio,
  landmarks,
  stops,
  people,
  startedAt,
  timeLimitSec,
  onSubmit,
}: {
  mapUrl: string;
  aspectRatio: number;
  landmarks: MapPin[];
  stops: MapPin[];
  people: string[];
  startedAt: number | null;
  timeLimitSec: number;
  onSubmit: (groups: string[][]) => void;
}) {
  const [pool] = useState(() => shuffle(people));
  const [groups, setGroups] = useState<string[][]>(() => stops.map(() => []));
  const [drag, setDrag] = useState<DragState | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const groupsRef = useRef(groups);
  const submittedRef = useRef(false);
  const pointerRef = useRef({ x: 0, y: 0 });

  groupsRef.current = groups;

  const submit = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);
    onSubmit(groupsRef.current);
  };

  const drop = (state: DragState, clientX: number, clientY: number) => {
    const target = document.elementFromPoint(clientX, clientY);
    let stop: number | null = null;
    const stopEl = target?.closest<HTMLElement>('[data-stop-index]');
    if (stopEl) stop = Number(stopEl.dataset.stopIndex);
    else if (target?.closest('[data-travel-map]')) stop = nearestStop(clientX, clientY);
    else if (!target?.closest('[data-travel-tray]')) return;

    if (stop === state.stop) return;
    setGroups((prev) =>
      prev.map((group, s) => {
        const without = group.filter((key) => key !== state.key);
        return s === stop ? [...without, state.key] : without;
      }),
    );
  };

  const startDrag = (key: string, stop: number | null, e: ReactPointerEvent) => {
    e.preventDefault();
    pointerRef.current = { x: e.clientX, y: e.clientY };
    setDrag({ key, stop, x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY };
      setDrag((prev) => prev && { ...prev, x: e.clientX, y: e.clientY });
    };
    const onUp = (e: PointerEvent) => {
      drop(drag, e.clientX, e.clientY);
      setDrag(null);
    };

    // Scroll the page while dragging near the top or bottom edge, so the
    // map can be reached from the tray on a short screen.
    let frame = requestAnimationFrame(function autoScroll() {
      const { y } = pointerRef.current;
      if (y < EDGE_ZONE) window.scrollBy(0, -SCROLL_SPEED);
      else if (y > window.innerHeight - EDGE_ZONE) window.scrollBy(0, SCROLL_SPEED);
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
  }, [drag?.key, drag?.stop]);

  const placed = new Set(groups.flat());
  const tray = pool.filter((key) => !placed.has(key));

  return (
    <div className="travel-board">
      <TravelMap
        mapUrl={mapUrl}
        aspectRatio={aspectRatio}
        landmarks={landmarks}
        stops={stops}
        groups={groups}
        draggingKey={drag?.key}
        onAvatarPointerDown={submitted ? undefined : (stop, key, e) => startDrag(key, stop, e)}
      />

      <div className="travel-tray" data-travel-tray>
        {tray.length === 0 && <span className="hint">Everyone's on the map</span>}
        {tray.map((key) => (
          <div
            key={key}
            className={`travel-avatar ${submitted ? '' : 'draggable'} ${drag?.key === key ? 'dragging' : ''}`}
            onPointerDown={submitted ? undefined : (e) => startDrag(key, null, e)}
          >
            <TravelAvatar avatar={key} showName />
          </div>
        ))}
      </div>

      {!submitted && (
        <div className="travel-actions">
          {startedAt && <Countdown startedAt={startedAt} timeLimitSec={timeLimitSec} onExpire={submit} />}
          <button className="btn btn-primary btn-lg" onClick={submit}>
            🗺️ Lock it in
          </button>
        </div>
      )}

      {drag && (
        <div className="travel-avatar travel-drag-ghost" style={{ left: drag.x, top: drag.y }}>
          <TravelAvatar avatar={drag.key} showName />
        </div>
      )}
    </div>
  );
}

interface DragState {
  key: string;
  // Stop it was picked up from, or null when taken from the tray.
  stop: number | null;
  x: number;
  y: number;
}

const EDGE_ZONE = 60;
const SCROLL_SPEED = 8;
// Dropping anywhere on the map snaps to the closest stop within this range.
const SNAP_DISTANCE = 70;

function nearestStop(x: number, y: number): number | null {
  let best: number | null = null;
  let bestDistance = SNAP_DISTANCE;
  document.querySelectorAll<HTMLElement>('.travel-pin-dot[data-stop-index]').forEach((dot) => {
    const rect = dot.getBoundingClientRect();
    const distance = Math.hypot(rect.left + rect.width / 2 - x, rect.top + rect.height / 2 - y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = Number(dot.dataset.stopIndex);
    }
  });
  return best;
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
