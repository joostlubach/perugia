import { PointerEvent, useState } from 'react';
import { avatarName, avatarSrc } from '../avatar';
import { MapPin } from '../types';

// The map with its landmarks and stops, and the avatars placed at each stop.
// Each stop's card is a drop target (`data-stop-index`) for TravelMapBoard.
export function TravelMap({
  mapUrl,
  aspectRatio,
  landmarks,
  stops,
  groups,
  large,
  draggingKey,
  onAvatarPointerDown,
}: {
  mapUrl: string;
  aspectRatio: number;
  landmarks: MapPin[];
  stops: MapPin[];
  // Avatar keys per stop.
  groups?: string[][];
  large?: boolean;
  draggingKey?: string | null;
  onAvatarPointerDown?: (stop: number, key: string, e: PointerEvent) => void;
}) {
  return (
    <div
      className={`travel-map ${large ? 'large' : ''}`}
      style={{
        aspectRatio: String(aspectRatio),
        width: `min(100%, calc(${large ? 64 : 56}vh * ${aspectRatio}))`,
        backgroundImage: `url(${mapUrl})`,
      }}
      data-travel-map
    >
      {landmarks.map((pin) => (
        <div key={pin.label} className={`travel-pin landmark side-${pin.side ?? 'right'}`} style={pinStyle(pin)}>
          <span className="travel-pin-dot" />
          <span className="travel-pin-label">
            {pin.icon} {pin.label}
          </span>
        </div>
      ))}

      {stops.map((pin, s) => (
        <div
          key={pin.label}
          className={`travel-pin stop side-${pin.side ?? 'right'}`}
          style={pinStyle(pin)}
        >
          <span className="travel-pin-dot" data-stop-index={s} />
          <div className="travel-stop-card" data-stop-index={s}>
            <span className="travel-pin-label">
              {pin.icon} {pin.label}
            </span>
            {groups && groups[s].length > 0 && (
              <div className="travel-stop-avatars">
                {groups[s].map((key) => (
                  <div
                    key={key}
                    data-avatar={key}
                    className={`travel-avatar ${onAvatarPointerDown ? 'draggable' : ''} ${
                      draggingKey === key ? 'dragging' : ''
                    }`}
                    onPointerDown={onAvatarPointerDown && ((e) => onAvatarPointerDown(s, key, e))}
                  >
                    <TravelAvatar avatar={key} showName={large} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TravelAvatar({ avatar, showName }: { avatar: string; showName?: boolean }) {
  const [broken, setBroken] = useState(false);
  return (
    <>
      {broken ? (
        <div className="travel-avatar-face fallback">{avatarName(avatar)[0]}</div>
      ) : (
        <img
          className="travel-avatar-face"
          src={avatarSrc(avatar)}
          alt={avatarName(avatar)}
          title={avatarName(avatar)}
          draggable={false}
          onError={() => setBroken(true)}
        />
      )}
      {showName && <span>{avatarName(avatar)}</span>}
    </>
  );
}

function pinStyle(pin: MapPin) {
  return { left: `${pin.x * 100}%`, top: `${pin.y * 100}%` };
}
