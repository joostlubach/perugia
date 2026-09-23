import { PlayerRoomView } from '../../types';
import { AnswerButton } from '../../components/AnswerButton';
import { DragCanvas, dragSoundPropsFor } from '../../components/DragCanvas';

export function PlayerQuestion({ view, onAnswer }: { view: PlayerRoomView; onAnswer: (value: number) => void }) {
  if (view.hasAnswered) {
    return (
      <div className="page">
        <h1 className="title">Risposta inviata! ✅</h1>
        <p className="subtitle">Waiting for everyone else...</p>
      </div>
    );
  }

  const question = view.question;
  if (!question) return null;

  if (question.type === 'drag_count') {
    return (
      <div className="page">
        <h1 className="title">Guarda lo schermo! 👀</h1>
        <p className="subtitle">{question.text}</p>
        <DragCanvas
          dragLabel={question.dragLabel}
          {...dragSoundPropsFor(question.dragLabel)}
          startedAt={view.questionStartedAt}
          timeLimitSec={question.timeLimitSec}
          onSubmit={onAnswer}
        />
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="title">Guarda lo schermo! 👀</h1>
      <p className="subtitle">Pick the shape that matches the right answer</p>
      <div className="player-answer-grid">
        {question.options.map((_, i) => (
          <AnswerButton key={i} index={i} onClick={() => onAnswer(i)} />
        ))}
      </div>
    </div>
  );
}
