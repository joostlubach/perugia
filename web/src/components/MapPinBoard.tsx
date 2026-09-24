import { PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';
import { Point } from '../types';
import { useCountdown } from './Countdown';
import { AvatarPin, PinMap } from './PinMap';
import { t } from '../texts';

// Player drags their own avatar onto the map, and can move it around until
// locking in. Picked up from the tray, the pin's tip sits a bit above the
// finger so the spot it's aiming at stays visible.
export function MapPinBoard({
  mapUrl,
  aspectRatio,
  avatar,
  startedAt,
  timeLimitSec,
  onSubmit,
}: {
  mapUrl: string;
  aspectRatio: number;
  avatar: string;
  startedAt: number | null;
  timeLimitSec: number;
  onSubmit: (pin: Point) => void;
}) {
  const [pin, setPin] = useState<Point | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const pinRef = useRef<Point | null>(null);
  const submittedRef = useRef(false);

  pinRef.current = pin;

  const submit = () => {
    if (submittedRef.current || !pinRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);
    onSubmit(pinRef.current);
  };
  useCountdown(startedAt, timeLimitSec, submit);

  const drop = (tip: Point) => {
    const rect = mapRect();
    if (!rect) return;
    const x = (tip.x - rect.left) / rect.width;
    const y = (tip.y - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    setPin({ x, y });
  };

  // `offset` is from the finger to the pin's tip, kept for the whole drag.
  const startDrag = (e: ReactPointerEvent, offset: Point) => {
    e.preventDefault();
    setDrag({ x: e.clientX + offset.x, y: e.clientY + offset.y, offset });
  };

  const pickUpPin = (e: ReactPointerEvent) => {
    const rect = mapRect();
    if (!rect || !pinRef.current) return;
    const tipX = rect.left + pinRef.current.x * rect.width;
    const tipY = rect.top + pinRef.current.y * rect.height;
    startDrag(e, { x: tipX - e.clientX, y: tipY - e.clientY });
  };

  useEffect(() => {
    if (!drag) return;
    const { offset } = drag;
    const onMove = (e: PointerEvent) => setDrag({ x: e.clientX + offset.x, y: e.clientY + offset.y, offset });
    const onUp = (e: PointerEvent) => {
      drop({ x: e.clientX + offset.x, y: e.clientY + offset.y });
      setDrag(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(drag)]);

  return (
    <div className="travel-board">
      <PinMap
        mapUrl={mapUrl}
        aspectRatio={aspectRatio}
        pins={pin && !drag ? [{ key: 'me', avatar, ...pin }] : []}
        onPinPointerDown={submitted ? undefined : (_, e) => pickUpPin(e)}
      />

      {!submitted && (
        <>
          <div className="travel-tray">
            {pin || drag ? (
              <span className="hint">{t('boards.mapPin.moveHint')}</span>
            ) : (
              <div className="pin-source" onPointerDown={(e) => startDrag(e, { x: 0, y: -AIM_OFFSET })}>
                <AvatarPin avatar={avatar} />
              </div>
            )}
          </div>
          <div className="travel-actions">
            <button className="btn btn-primary btn-lg" disabled={!pin} onClick={submit}>
              {t('boards.mapPin.done')}
            </button>
          </div>
        </>
      )}

      {drag && (
        <div className="pin-drag-ghost" style={{ left: drag.x, top: drag.y }}>
          <AvatarPin avatar={avatar} />
        </div>
      )}
    </div>
  );
}

interface DragState {
  // Where the pin's tip is, in client coordinates.
  x: number;
  y: number;
  offset: Point;
}

const AIM_OFFSET = 40;

function mapRect(): DOMRect | null {
  return document.querySelector('[data-pin-map]')?.getBoundingClientRect() ?? null;
}
