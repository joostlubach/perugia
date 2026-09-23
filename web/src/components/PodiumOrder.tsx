import { PointerEvent as ReactPointerEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useCountdown } from './Countdown';
import { PodiumAvatar, PodiumStand } from './PodiumStand';
import { PodiumTray } from './PodiumTray';

// Player drags avatars from each group's tray onto its podium, and can
// rearrange them there (swapping with whoever is in the way) until they
// match the finishing order.
export function PodiumOrder({
  groups,
  groupLabels,
  startedAt,
  timeLimitSec,
  onSubmit,
}: {
  groups: string[][];
  groupLabels: string[];
  startedAt: number | null;
  timeLimitSec: number;
  onSubmit: (order: string[][]) => void;
}) {
  const [pool] = useState(() => groups.map(shuffle));
  const [slots, setSlots] = useState<(string | null)[][]>(() => groups.map((g) => g.map(() => null)));
  const [drag, setDrag] = useState<DragState | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const slotsRef = useRef(slots);
  const submittedRef = useRef(false);
  const scrollRefs = useRef(groups.map(() => ({ current: null as HTMLDivElement | null })));
  const pointerRef = useRef({ x: 0, y: 0 });
  const displacedRef = useRef<{ key: string; droppedKey: string; from: DOMRect } | null>(null);

  slotsRef.current = slots;

  // Slide the avatar that got pushed off the drop target to wherever it
  // ended up (the dragged avatar's old place, or back into the tray).
  useLayoutEffect(() => {
    const displaced = displacedRef.current;
    displacedRef.current = null;
    if (!displaced) return;
    const el = document.querySelector<HTMLElement>(`.podium-order [data-avatar="${displaced.key}"]`);
    if (!el) return;
    const to = el.getBoundingClientRect();
    el.animate(
      [
        { transform: `translate(${displaced.from.left - to.left}px, ${displaced.from.top - to.top}px)`, zIndex: 1 },
        { transform: 'translate(0, 0)', zIndex: 1 },
      ],
      { duration: SWAP_DURATION_MS, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
    );
    // Keep the dropped avatar on top while the displaced one slides underneath it.
    document
      .querySelector<HTMLElement>(`.podium-order [data-avatar="${displaced.droppedKey}"]`)
      ?.animate([{ zIndex: 2 }, { zIndex: 2 }], { duration: SWAP_DURATION_MS });
  }, [slots]);

  const submit = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);
    onSubmit(slotsRef.current.map((group) => group.map((key) => key ?? '')));
  };
  useCountdown(startedAt, timeLimitSec, submit);

  const drop = (state: DragState, clientX: number, clientY: number) => {
    const target = document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLElement>('[data-podium-index], [data-podium-tray]');
    if (!target || Number(target.dataset.podiumGroup) !== state.group) return;

    const current = slotsRef.current[state.group];
    const next = [...current];

    if (target.dataset.podiumIndex === undefined) {
      if (state.slot === null) return;
      next[state.slot] = null;
    } else {
      const index = Number(target.dataset.podiumIndex);
      if (index === state.slot) return;
      const occupant = current[index];
      next[index] = state.key;
      if (state.slot !== null) next[state.slot] = occupant;

      const occupantEl = target.querySelector<HTMLElement>('[data-avatar]');
      if (occupant && occupantEl) {
        displacedRef.current = { key: occupant, droppedKey: state.key, from: occupantEl.getBoundingClientRect() };
      }
    }

    setSlots((prev) => prev.map((group, g) => (g === state.group ? next : group)));
  };

  const startDrag = (group: number, key: string, slot: number | null, e: ReactPointerEvent) => {
    e.preventDefault();
    pointerRef.current = { x: e.clientX, y: e.clientY };
    setDrag({ group, key, slot, x: e.clientX, y: e.clientY });
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

    // Scroll the podium while the dragged avatar hovers near either edge,
    // so the far places can be reached on a narrow screen.
    let frame = requestAnimationFrame(function autoScroll() {
      const scroller = scrollRefs.current[drag.group].current;
      if (scroller) {
        const rect = scroller.getBoundingClientRect();
        const { x, y } = pointerRef.current;
        if (y >= rect.top && y <= rect.bottom) {
          if (x < rect.left + EDGE_ZONE) scroller.scrollLeft -= SCROLL_SPEED;
          else if (x > rect.right - EDGE_ZONE) scroller.scrollLeft += SCROLL_SPEED;
        }
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
  }, [drag?.group, drag?.slot, drag?.key]);

  return (
    <div className="podium-order">
      {slots.map((group, g) => (
        <div key={g} className="podium-order-group">
          <div className="hint">{groupLabels[g]}</div>
          <PodiumStand
            order={group}
            groupIndex={g}
            scrollRef={scrollRefs.current[g]}
            draggingKey={drag?.key}
            onAvatarPointerDown={submitted ? undefined : (index, e) => startDrag(g, group[index]!, index, e)}
          />
          <PodiumTray
            avatars={pool[g].filter((key) => !group.includes(key))}
            groupIndex={g}
            draggingKey={drag?.key}
            onAvatarPointerDown={submitted ? undefined : (key, e) => startDrag(g, key, null, e)}
          />
        </div>
      ))}

      {!submitted && (
        <>
          <button className="btn btn-primary btn-lg" onClick={submit}>
            🏁 Lock it in
          </button>
        </>
      )}

      {drag && (
        <div className="podium-stand-avatar podium-drag-ghost" style={{ left: drag.x, top: drag.y }}>
          <PodiumAvatar avatar={drag.key} />
        </div>
      )}
    </div>
  );
}

interface DragState {
  group: number;
  key: string;
  // Podium place it was picked up from, or null when taken from the tray.
  slot: number | null;
  x: number;
  y: number;
}

const EDGE_ZONE = 48;
const SWAP_DURATION_MS = 350;
const SCROLL_SPEED = 8;

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
