import { PointerEvent } from 'react';
import { PodiumAvatar } from './PodiumStand';

// The avatars of a group that haven't been put on the podium yet. Also a
// drop target, to take someone back off the podium.
export function PodiumTray({
  avatars,
  groupIndex,
  draggingKey,
  onAvatarPointerDown,
}: {
  avatars: string[];
  groupIndex: number;
  draggingKey?: string | null;
  onAvatarPointerDown?: (key: string, e: PointerEvent) => void;
}) {
  return (
    <div className="podium-tray" data-podium-group={groupIndex} data-podium-tray>
      {avatars.length === 0 && <span className="hint">Everyone's on the podium</span>}
      {avatars.map((key) => (
        <div
          key={key}
          data-avatar={key}
          className={`podium-stand-avatar ${onAvatarPointerDown ? 'draggable' : ''} ${
            draggingKey === key ? 'dragging' : ''
          }`}
          onPointerDown={onAvatarPointerDown && ((e) => onAvatarPointerDown(key, e))}
        >
          <PodiumAvatar avatar={key} />
        </div>
      ))}
    </div>
  );
}
