import { FormEvent, useEffect, useState } from 'react';
import { t } from '../../texts';

// The Go To box: jump to a question by its 1-based number, resume at the first
// unanswered one, start a new room (a runthrough while Alt is held), or skip to
// the finale or the results.
export function HostJumpBox({
  totalQuestions,
  inProgress,
  onJump,
  onNewRoom,
  onResume,
  onFinale,
  onResults,
  onClose,
}: {
  totalQuestions: number;
  // Starting a new room then asks for confirmation first.
  inProgress: boolean;
  onJump: (index: number) => void;
  onNewRoom: (runthrough: boolean) => void;
  onResume: () => void;
  onFinale: () => void;
  onResults: () => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState('');
  const altHeld = useAltHeld();
  const number = Number(value);
  const valid = Number.isInteger(number) && number >= 1 && number <= totalQuestions;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onJump(number - 1);
    onClose();
  };

  const then = (action: () => void) => () => {
    action();
    onClose();
  };

  return (
    <div className="jump-box-backdrop" onClick={onClose}>
      <form className="jump-box" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
        <label className="hint" htmlFor="jump-box-input">
          {t('host.jump.label', { total: totalQuestions })}
        </label>
        <input
          id="jump-box-input"
          type="number"
          min={1}
          max={totalQuestions}
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && onClose()}
        />
        <button className="btn btn-primary" disabled={!valid}>
          {t('host.jump.go')}
        </button>
        <div className="jump-box-actions">
          <button type="button" className="btn" onClick={then(onResume)}>
            {t('host.jump.resume')}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              if (inProgress && !window.confirm(t('host.jump.confirmNewRoom'))) return;
              then(() => onNewRoom(altHeld))();
            }}
          >
            {altHeld ? t('host.jump.newRunthrough') : t('host.jump.newRoom')}
          </button>
          <button type="button" className="btn" onClick={then(onFinale)}>
            {t('host.jump.finale')}
          </button>
          <button type="button" className="btn" onClick={then(onResults)}>
            {t('host.jump.results')}
          </button>
        </div>
      </form>
    </div>
  );
}

function useAltHeld(): boolean {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => setHeld(e.altKey);
    const onBlur = () => setHeld(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      window.removeEventListener('blur', onBlur);
    };
  }, []);
  return held;
}
