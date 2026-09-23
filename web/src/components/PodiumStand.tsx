import { PointerEvent, RefObject, useState } from 'react';
import { avatarName, avatarSrc } from '../avatar';

// One podium for a ranked group: 1st in the middle, 2nd to its left, then
// 3rd and onwards to the right, each block slightly lower than the last.
// Wrapped in a horizontal scroller since 8 places don't fit on a phone.
export function PodiumStand({
  order,
  groupIndex,
  scrollRef,
  draggingKey,
  onAvatarPointerDown,
}: {
  order: (string | null)[];
  groupIndex: number;
  scrollRef?: RefObject<HTMLDivElement>;
  draggingKey?: string | null;
  onAvatarPointerDown?: (index: number, e: PointerEvent) => void;
}) {
  return (
    <div ref={scrollRef} className="podium-stand-scroll">
      <div className="podium-stand">
        {visualOrder(order.length).map((index) => (
          <div
            key={index}
            className="podium-stand-slot"
            data-podium-group={groupIndex}
            data-podium-index={index}
          >
            {order[index] ? (
              <div
                data-avatar={order[index]}
                className={`podium-stand-avatar ${onAvatarPointerDown ? 'draggable' : ''} ${
                  draggingKey === order[index] ? 'dragging' : ''
                }`}
                onPointerDown={onAvatarPointerDown && ((e) => onAvatarPointerDown(index, e))}
              >
                <PodiumAvatar avatar={order[index]!} />
              </div>
            ) : (
              <div className="podium-stand-avatar">
                <div className="podium-stand-empty" />
                <span>&nbsp;</span>
              </div>
            )}
            <div
              className={`podium-stand-block ${index === 0 ? 'first' : ''}`}
              style={{ height: BLOCK_MAX_HEIGHT - index * BLOCK_STEP }}
            >
              {index + 1}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PodiumAvatar({ avatar }: { avatar: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <>
      {broken ? (
        <div className="avatar-fallback">{avatarName(avatar)[0]}</div>
      ) : (
        <img src={avatarSrc(avatar)} alt={avatarName(avatar)} draggable={false} onError={() => setBroken(true)} />
      )}
      <span>{avatarName(avatar)}</span>
    </>
  );
}

const BLOCK_MAX_HEIGHT = 150;
const BLOCK_STEP = 14;

function visualOrder(count: number): number[] {
  const indices = Array.from({ length: count }, (_, i) => i);
  if (count < 2) return indices;
  return [1, 0, ...indices.slice(2)];
}
