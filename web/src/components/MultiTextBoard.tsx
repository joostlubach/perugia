import { FormEvent, useRef, useState } from 'react';
import { useCountdown } from './Countdown';
import { t } from '../texts';

// Several free text answers, one per box. Whatever has been typed is sent when time runs out.
export function MultiTextBoard({
  boxes,
  startedAt,
  timeLimitSec,
  onSubmit,
}: {
  boxes: number;
  startedAt: number | null;
  timeLimitSec: number;
  onSubmit: (texts: string[]) => void;
}) {
  const [texts, setTexts] = useState(() => Array<string>(boxes).fill(''));
  const [submitted, setSubmitted] = useState(false);
  const textsRef = useRef(texts);
  const submittedRef = useRef(false);
  textsRef.current = texts;

  const submit = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);
    onSubmit(textsRef.current.map((text) => text.trim()));
  };
  useCountdown(startedAt, timeLimitSec, submit);

  const anyTyped = texts.some((text) => text.trim());
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (anyTyped) submit();
  };

  return (
    <form className="open-answer" onSubmit={handleSubmit}>
      {texts.map((text, i) => (
        <input
          key={i}
          type="text"
          maxLength={100}
          autoComplete="off"
          placeholder={t('boards.multiText.placeholder', { number: i + 1 })}
          value={text}
          disabled={submitted}
          onChange={(e) => setTexts((prev) => prev.map((old, j) => (j === i ? e.target.value : old)))}
        />
      ))}
      <button className="btn btn-primary btn-lg" disabled={submitted || !anyTyped}>
        {t('boards.multiText.done')}
      </button>
    </form>
  );
}
