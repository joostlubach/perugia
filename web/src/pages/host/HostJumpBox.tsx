import { FormEvent, useState } from 'react';
import { t } from '../../texts';

// Small overlay for jumping to a question by its 1-based number.
export function HostJumpBox({
  totalQuestions,
  onJump,
  onClose,
}: {
  totalQuestions: number;
  onJump: (index: number) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState('');
  const number = Number(value);
  const valid = Number.isInteger(number) && number >= 1 && number <= totalQuestions;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onJump(number - 1);
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
      </form>
    </div>
  );
}
