import { PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';
import { audio, audioContext } from '../audio';
import { useCountdown } from './Countdown';
import { t } from '../texts';

// Estimation by betting: the player drags bills and coins into a terracotta
// vase that shows the running total. There's no way to take money back out.
export function MoneyVaseBoard({
  denominations,
  startedAt,
  timeLimitSec,
  onSubmit,
}: {
  // In cents, largest first.
  denominations: number[];
  startedAt: number | null;
  timeLimitSec: number;
  onSubmit: (cents: number) => void;
}) {
  const [total, setTotal] = useState(0);
  const [drag, setDrag] = useState<{ cents: number; x: number; y: number } | null>(null);
  const [falling, setFalling] = useState<Falling[]>([]);
  const [wobble, setWobble] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const totalRef = useRef(0);
  const submittedRef = useRef(false);
  const vaseRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);

  const submit = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);
    onSubmit(totalRef.current);
  };
  useCountdown(startedAt, timeLimitSec, submit);
  useEffect(() => audio.preload('coin'), []);

  const drop = (cents: number, clientX: number, clientY: number) => {
    const vase = vaseRef.current;
    if (!vase || submittedRef.current) return;
    const rect = vase.getBoundingClientRect();
    const margin = 24;
    if (
      clientX < rect.left - margin ||
      clientX > rect.right + margin ||
      clientY < rect.top - margin ||
      clientY > rect.bottom + margin
    ) {
      return;
    }
    totalRef.current += cents;
    setTotal(totalRef.current);
    setWobble((w) => w + 1);
    playDropSound(cents);

    // Animate the money from where it was let go into the vase's mouth.
    const id = ++nextId.current;
    const mouthX = rect.left + rect.width / 2;
    const mouthY = rect.top + rect.height * 0.08;
    setFalling((prev) => [...prev, { id, cents, x: clientX - rect.left, y: clientY - rect.top, dx: mouthX - clientX, dy: mouthY - clientY }]);
    setTimeout(() => setFalling((prev) => prev.filter((f) => f.id !== id)), FALL_MS);
  };

  const startDrag = (cents: number, e: ReactPointerEvent) => {
    e.preventDefault();
    setDrag({ cents, x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => setDrag((prev) => prev && { ...prev, x: e.clientX, y: e.clientY });
    const onUp = (e: PointerEvent) => {
      drop(drag.cents, e.clientX, e.clientY);
      setDrag(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.cents, Boolean(drag)]);

  const bills = denominations.filter(isBill);
  const coins = denominations.filter((c) => !isBill(c));

  return (
    <div className="money-board">
      <div ref={vaseRef} className="money-vase-drop">
        <Vase total={total} wobbleKey={wobble} />
        {falling.map((f) => (
          <div
            key={f.id}
            className="money-falling"
            style={
              {
                left: f.x,
                top: f.y,
                '--dx': `${f.dx}px`,
                '--dy': `${f.dy}px`,
              } as React.CSSProperties
            }
          >
            <Money cents={f.cents} />
          </div>
        ))}
      </div>

      {!submitted && (
        <>
          <div className="hint">{t('boards.moneyVase.noRefunds')}</div>
          <div className="money-tray">
            <div className="money-row">
              {bills.map((cents) => (
                <div key={cents} className="money-source" onPointerDown={(e) => startDrag(cents, e)}>
                  <Money cents={cents} />
                </div>
              ))}
            </div>
            <div className="money-row">
              {coins.map((cents) => (
                <div key={cents} className="money-source" onPointerDown={(e) => startDrag(cents, e)}>
                  <Money cents={cents} />
                </div>
              ))}
            </div>
          </div>
          <div className="money-actions">
            <button className="btn btn-primary btn-lg" onClick={submit}>
              {t('boards.moneyVase.done')}
            </button>
          </div>
        </>
      )}

      {drag && (
        <div className="money-drag-ghost" style={{ left: drag.x, top: drag.y }}>
          <Money cents={drag.cents} />
        </div>
      )}
    </div>
  );
}

interface Falling {
  id: number;
  cents: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
}

const FALL_MS = 450;

// The terracotta vase with an amount on its belly. `total` null shows a "?".
export function Vase({ total, wobbleKey, large }: { total: number | null; wobbleKey?: number; large?: boolean }) {
  return (
    <div key={wobbleKey} className={`money-vase ${wobbleKey ? 'wobble' : ''} ${large ? 'large' : ''}`}>
      <svg viewBox="0 0 200 240" aria-hidden="true">
        <defs>
          <linearGradient id="terracotta" x1="0" x2="1">
            <stop offset="0" stopColor="#8f3a17" />
            <stop offset="0.35" stopColor="#d06a3a" />
            <stop offset="0.6" stopColor="#c45a2c" />
            <stop offset="1" stopColor="#7a3013" />
          </linearGradient>
        </defs>
        {/* Handles */}
        <path d="M62 44 C28 44 26 92 58 104" fill="none" stroke="#9c4420" strokeWidth="9" strokeLinecap="round" />
        <path d="M138 44 C172 44 174 92 142 104" fill="none" stroke="#9c4420" strokeWidth="9" strokeLinecap="round" />
        {/* Body */}
        <path
          d="M70 14 H130 L126 30 C126 44 132 52 142 62 C178 94 184 150 160 192 C150 210 138 222 124 228 H76 C62 222 50 210 40 192 C16 150 22 94 58 62 C68 52 74 44 74 30 Z"
          fill="url(#terracotta)"
          stroke="#5e240d"
          strokeWidth="3"
        />
        {/* Rim */}
        <rect x="62" y="8" width="76" height="12" rx="5" fill="#b24e22" stroke="#5e240d" strokeWidth="3" />
        {/* Black-figure bands with a meander */}
        <path d="M50 76 H150" stroke="#2a130a" strokeWidth="8" />
        <path
          d="M52 76 h8 v-3 h-5 M66 76 h8 v-3 h-5 M80 76 h8 v-3 h-5 M94 76 h8 v-3 h-5 M108 76 h8 v-3 h-5 M122 76 h8 v-3 h-5 M136 76 h8 v-3 h-5"
          stroke="#e8b27a"
          strokeWidth="1.6"
          fill="none"
        />
        <path d="M42 186 H158" stroke="#2a130a" strokeWidth="6" />
        <path d="M60 200 H140" stroke="#2a130a" strokeWidth="3" />
      </svg>
      <div className="money-vase-total">{total === null ? '?' : formatEuro(total)}</div>
    </div>
  );
}

// A euro bill or coin, drawn roughly to scale.
export function Money({ cents }: { cents: number }) {
  if (isBill(cents)) {
    return (
      <div className={`money-bill bill-${cents / 100}`}>
        <span className="money-bill-value">{cents / 100}</span>
        <span className="money-bill-euro">EURO</span>
      </div>
    );
  }
  const label = cents >= 100 ? `€${cents / 100}` : `${cents}c`;
  return (
    <div className={`money-coin coin-${cents}`}>
      <span>{label}</span>
    </div>
  );
}

function isBill(cents: number) {
  return cents >= 500;
}

export function formatEuro(cents: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

// Coins get the Mario coin sound; bills a synthesized crinkly paper rustle.
function playDropSound(cents: number) {
  if (audio.isMuted()) return;
  if (!isBill(cents)) {
    audio.playOverlapping('coin');
    return;
  }
  try {
    playRustle(audioContext());
  } catch {
    // No Web Audio -- stay silent.
  }
}

// A handful of short, randomly timed bursts of filtered noise, like paper
// being crumpled and flicked.
function playRustle(ctx: AudioContext) {
  const duration = 0.32;
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const crinkles = 5 + Math.floor(Math.random() * 4);
  for (let c = 0; c < crinkles; c++) {
    const at = Math.floor(Math.random() * length * 0.8);
    const size = Math.floor(ctx.sampleRate * (0.01 + Math.random() * 0.03));
    const loudness = 0.4 + Math.random() * 0.6;
    for (let i = 0; i < size && at + i < length; i++) {
      data[at + i] += (Math.random() * 2 - 1) * loudness * Math.pow(1 - i / size, 2);
    }
  }
  // A soft bed of hiss underneath, fading out.
  for (let i = 0; i < length; i++) data[i] += (Math.random() * 2 - 1) * 0.08 * (1 - i / length);

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 1800;
  const peak = ctx.createBiquadFilter();
  peak.type = 'peaking';
  peak.frequency.value = 5000;
  peak.gain.value = 6;
  const gain = ctx.createGain();
  gain.gain.value = 0.5;
  source.connect(highpass);
  highpass.connect(peak);
  peak.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}
