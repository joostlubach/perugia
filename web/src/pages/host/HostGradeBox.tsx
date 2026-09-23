import { FormEvent, useState } from 'react';
import { t } from '../../texts';

// At the reveal of an open question without an answer from its answer key
// player: the host types the right answer, which scores everyone's answers.
export function HostGradeBox({ onGrade }: { onGrade: (answer: string) => void }) {
  const [value, setValue] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim()) onGrade(value.trim());
  };

  return (
    <form className="grade-box" onSubmit={submit}>
      <label className="subtitle" htmlFor="grade-box-input">
        {t('host.reveal.typeCorrectAnswer')}
      </label>
      <div className="grade-box-row">
        <input id="grade-box-input" type="text" maxLength={100} autoFocus value={value} onChange={(e) => setValue(e.target.value)} />
        <button className="btn btn-primary" disabled={!value.trim()}>
          {t('host.reveal.checkAnswers')}
        </button>
      </div>
    </form>
  );
}
