import { useRef, useState } from 'react';
import { useCountdown } from './Countdown';
import { t } from '../texts';

// A checklist of options where any number (including zero) can be correct.
// Player toggles as many as they like, then locks in the whole set at once.
export function MultiSelectBoard({
  options,
  startedAt,
  timeLimitSec,
  onSubmit,
}: {
  options: string[];
  startedAt: number | null;
  timeLimitSec: number;
  onSubmit: (selected: number[]) => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const selectedRef = useRef(selected);
  const submittedRef = useRef(false);
  selectedRef.current = selected;

  const toggle = (i: number) => {
    if (submitted) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const submit = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);
    onSubmit([...selectedRef.current]);
  };
  useCountdown(startedAt, timeLimitSec, submit);

  return (
    <div className="multi-select-board">
      <div className="multi-select-list">
        {options.map((text, i) => (
          <button
            key={i}
            className={`multi-select-option ${selected.has(i) ? 'selected' : ''}`}
            disabled={submitted}
            onClick={() => toggle(i)}
          >
            <span>{selected.has(i) ? '✅' : '⬜'}</span>
            {text}
          </button>
        ))}
      </div>

      {!submitted && (
        <>
          <button className="btn btn-primary btn-lg" onClick={submit}>
            {t('boards.multiSelect.done')}
          </button>
        </>
      )}
    </div>
  );
}
