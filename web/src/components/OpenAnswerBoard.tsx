import { FormEvent, useRef, useState } from 'react';
import { useCountdown } from './Countdown';
import { t } from '../texts';

// A free text answer. Whatever has been typed is sent when time runs out.
export function OpenAnswerBoard({
  startedAt,
  timeLimitSec,
  onSubmit,
}: {
  startedAt: number | null;
  timeLimitSec: number;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const textRef = useRef(text);
  const submittedRef = useRef(false);
  textRef.current = text;

  const submit = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);
    onSubmit(textRef.current.trim());
  };
  useCountdown(startedAt, timeLimitSec, submit);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (text.trim()) submit();
  };

  return (
    <form className="open-answer" onSubmit={handleSubmit}>
      <input
        type="text"
        maxLength={100}
        autoComplete="off"
        placeholder={t('boards.openAnswer.placeholder')}
        value={text}
        disabled={submitted}
        onChange={(e) => setText(e.target.value)}
      />
      <button className="btn btn-primary btn-lg" disabled={submitted || !text.trim()}>
        {t('boards.openAnswer.done')}
      </button>
    </form>
  );
}
