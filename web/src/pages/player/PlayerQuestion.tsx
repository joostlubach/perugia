import { HamLine, MultiSelectAnswer, PlateAnswer, PlayerRoomView, TraceAnswer } from '../../types';
import { Countdown } from '../../components/Countdown';
import { Shape } from '../../components/Shape';
import { MenuCard } from '../../components/MenuCard';
import { DragCanvas, dragSoundPropsFor } from '../../components/DragCanvas';
import { PodiumOrder } from '../../components/PodiumOrder';
import { PlateBoard } from '../../components/PlateBoard';
import { HamCutBoard } from '../../components/HamCutBoard';
import { MultiSelectBoard } from '../../components/MultiSelectBoard';
import { TraceMarksBoard } from '../../components/TraceMarksBoard';
import { TravelMapBoard } from '../../components/TravelMapBoard';
import { MoneyVaseBoard } from '../../components/MoneyVase';
import { QuestionText } from '../../components/QuestionText';

export function PlayerQuestion({
  view,
  onAnswer,
}: {
  view: PlayerRoomView;
  onAnswer: (value: number | string[][] | PlateAnswer | HamLine | MultiSelectAnswer | TraceAnswer) => void;
}) {
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

  const startedAt = view.questionStartedAt;

  return (
    <div className="page">
      <div className="hint">
        Question {view.currentQuestionIndex + 1} / {view.totalQuestions} · {question.title} · {question.points} pts
      </div>
      <h1 className="question-text"><QuestionText text={question.text} /></h1>
      {question.type === 'multiple_choice' && question.imageUrl && (
        <img className="question-image" src={question.imageUrl} alt="" />
      )}

      {question.type === 'multiple_choice' && (
        <>
          <Countdown startedAt={startedAt} timeLimitSec={question.timeLimitSec} />
          {question.menu ? (
            <MenuCard menu={question.menu} onPick={onAnswer} />
          ) : (
            <div className="option-grid">
              {question.options.map((text, i) => (
                <button key={i} className={`shape-btn shape-${i}`} onClick={() => onAnswer(i)}>
                  <Shape index={i} />
                  <span style={{ flex: 1, textAlign: 'left' }}>{text}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {question.type === 'drag_count' && (
        <DragCanvas
          dragLabel={question.dragLabel}
          {...dragSoundPropsFor(question.dragLabel)}
          startedAt={startedAt}
          timeLimitSec={question.timeLimitSec}
          onSubmit={onAnswer}
        />
      )}

      {question.type === 'podium_order' && (
        <PodiumOrder
          groups={question.groups}
          groupLabels={question.groupLabels}
          startedAt={startedAt}
          timeLimitSec={question.timeLimitSec}
          onSubmit={onAnswer}
        />
      )}

      {question.type === 'money_vase' && (
        <MoneyVaseBoard
          denominations={question.denominations}
          startedAt={startedAt}
          timeLimitSec={question.timeLimitSec}
          onSubmit={onAnswer}
        />
      )}

      {question.type === 'travel_map' && (
        <TravelMapBoard
          mapUrl={question.mapUrl}
          aspectRatio={question.aspectRatio}
          landmarks={question.landmarks}
          stops={question.stops}
          people={question.people}
          startedAt={startedAt}
          timeLimitSec={question.timeLimitSec}
          onSubmit={onAnswer}
        />
      )}

      {question.type === 'plate_assignment' && (
        <PlateBoard
          head={question.head}
          left={question.left}
          right={question.right}
          startedAt={startedAt}
          timeLimitSec={question.timeLimitSec}
          onSubmit={onAnswer}
        />
      )}

      {question.type === 'ham_cut' && (
        <HamCutBoard
          imageUrl={question.imageUrl}
          startedAt={startedAt}
          timeLimitSec={question.timeLimitSec}
          onSubmit={onAnswer}
        />
      )}

      {question.type === 'multi_select' && (
        <MultiSelectBoard
          options={question.options}
          startedAt={startedAt}
          timeLimitSec={question.timeLimitSec}
          onSubmit={(selected) => onAnswer({ selected })}
        />
      )}

      {question.type === 'trace_marks' && (
        <TraceMarksBoard
          imageUrl={question.imageUrl}
          aspectRatio={question.aspectRatio}
          startedAt={startedAt}
          timeLimitSec={question.timeLimitSec}
          onSubmit={(strokes) => onAnswer({ strokes })}
        />
      )}
    </div>
  );
}
