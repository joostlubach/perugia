import { useRef } from 'react';
import { HostRoomView } from '../../types';
import { AnswerOption } from '../../components/AnswerOption';
import { Countdown } from '../../components/Countdown';

export function HostQuestion({ view, onExpire }: { view: HostRoomView; onExpire: () => void }) {
  const question = view.question!;
  const firedRef = useRef(false);

  const handleExpire = () => {
    if (firedRef.current) return;
    firedRef.current = true;
    onExpire();
  };

  const maxCount = Math.max(1, ...view.optionCounts);

  return (
    <div className="page">
      <div className="hint">
        Question {view.currentQuestionIndex + 1} / {view.totalQuestions}
      </div>
      <h1 className="question-text">{question.text}</h1>
      <Countdown startedAt={view.questionStartedAt} timeLimitSec={question.timeLimitSec} onExpire={handleExpire} />
      <div className="hint">{view.answeredCount} / {view.playerCount} answered</div>
      {question.type === 'multiple_choice' ? (
        <div className="option-grid">
          {question.options.map((text, i) => (
            <AnswerOption key={i} index={i} text={text} count={view.optionCounts[i] ?? 0} maxCount={maxCount} />
          ))}
        </div>
      ) : (
        <p className="subtitle">Drag as many "{question.dragLabel}" as you count, then lock it in!</p>
      )}
    </div>
  );
}
