import { PointerEvent } from 'react';
import { Point } from '../types';
import { TravelAvatar } from './TravelMap';

// A map with avatars pinned on it, each pin's tip exactly on its spot, and
// optionally the right answer marked with a flag.
export function PinMap({
  mapUrl,
  aspectRatio,
  pins = [],
  answer,
  large,
  onPinPointerDown,
}: {
  mapUrl: string;
  aspectRatio: number;
  pins?: MapPinMarker[];
  answer?: Point;
  large?: boolean;
  onPinPointerDown?: (key: string, e: PointerEvent) => void;
}) {
  return (
    <div
      className={`pin-map ${large ? 'large' : ''}`}
      style={{
        aspectRatio: String(aspectRatio),
        width: `min(100%, calc(${large ? 64 : 56}vh * ${aspectRatio}))`,
        backgroundImage: `url(${mapUrl})`,
      }}
      data-pin-map
    >
      {pins.map((pin) => (
        <div
          key={pin.key}
          className={`pin-map-pin ${onPinPointerDown ? 'draggable' : ''} ${pin.dim ? 'dim' : ''}`}
          style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}
          onPointerDown={onPinPointerDown && ((e) => onPinPointerDown(pin.key, e))}
        >
          <AvatarPin avatar={pin.avatar} label={pin.label} />
        </div>
      ))}
      {answer && (
        <div className="pin-map-answer" style={{ left: `${answer.x * 100}%`, top: `${answer.y * 100}%` }}>
          <span className="pin-map-answer-flag">🏁</span>
          <span className="pin-map-answer-dot" />
        </div>
      )}
    </div>
  );
}

// An avatar on a stick; its tip is the element's origin.
export function AvatarPin({ avatar, label }: { avatar: string; label?: string }) {
  return (
    <div className="avatar-pin">
      <div className="travel-avatar">
        <TravelAvatar avatar={avatar} />
        {label && <span className="avatar-pin-label">{label}</span>}
      </div>
      <span className="avatar-pin-stick" />
    </div>
  );
}

export interface MapPinMarker {
  key: string;
  avatar: string;
  // Fractions of the map's width and height.
  x: number;
  y: number;
  label?: string;
  dim?: boolean;
}
