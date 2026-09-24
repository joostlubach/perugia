import { HamLine, MultiSelectAnswer, PlayerRoomView, SketchAnswer, TextAnswer, TraceAnswer } from '../../types';
import { Countdown } from '../../components/Countdown';
import { Shape } from '../../components/Shape';
import { MenuOrderBoard } from '../../components/MenuOrderBoard';
import { DragCanvas, dragSoundPropsFor } from '../../components/DragCanvas';
import { PodiumOrder } from '../../components/PodiumOrder';
import { HamCutBoard } from '../../components/HamCutBoard';
import { MultiSelectBoard } from '../../components/MultiSelectBoard';
import { TraceMarksBoard } from '../../components/TraceMarksBoard';
import { TravelMapBoard } from '../../components/TravelMapBoard';
import { SketchBoard } from '../../components/SketchBoard';
import { MoneyVaseBoard } from '../../components/MoneyVase';
import { QuestionText } from '../../components/QuestionText';
import { OpenAnswerBoard } from '../../components/OpenAnswerBoard';
import { t } from '../../texts';

export function PlayerQuestion({
  view,
  onAnswer,
}: {
  view: PlayerRoomView;
  onAnswer: (value: number | string[][] | SketchAnswer | HamLine | MultiSelectAnswer | TraceAnswer | TextAnswer) => void;
}) {
  if (view.hasAnswered) {
    return (
      <div className="page">
        <h1 className="title">{t('player.question.answeredTitle')}</h1>
        <p className="subtitle">{t('player.question.answeredSubtitle')}</p>
      </div>
    );
  }

  const question = view.question;
  if (!question) return null;

  const startedAt = view.questionStartedAt;

  return (
    <div className="page">
      <div className="hint">
        {t('player.question.header', {
          number: view.currentQuestionIndex + 1,
          total: view.totalQuestions,
          title: question.title,
          points: question.points,
        })}
      </div>
      <Countdown startedAt={startedAt} timeLimitSec={question.timeLimitSec} floating />
      <h1 className="question-text"><QuestionText text={question.text} /></h1>
      {question.type === 'multiple_choice' && question.imageUrl && (
        <img className="question-image" src={question.imageUrl} alt="" />
      )}

      {question.type === 'multiple_choice' && (
        <div className="option-grid">
          {question.options.map((text, i) => (
            <button key={i} className={`shape-btn shape-${i}`} onClick={() => onAnswer(i)}>
              <Shape index={i} />
              <span style={{ flex: 1, textAlign: 'left' }}>{text}</span>
            </button>
          ))}
        </div>
      )}

      {question.type === 'open_answer' && (
        <OpenAnswerBoard
          startedAt={startedAt}
          timeLimitSec={question.timeLimitSec}
          onSubmit={(text) => onAnswer({ text })}
        />
      )}

      {question.type === 'menu_order' && (
        <MenuOrderBoard
          menu={question.menu}
          startedAt={startedAt}
          timeLimitSec={question.timeLimitSec}
          onSubmit={(selected) => onAnswer({ selected })}
        />
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

      {question.type === 'situation_sketch' && (
        <SketchBoard
          mapUrl={question.mapUrl}
          aspectRatio={question.aspectRatio}
          zoom={question.zoom}
          pieces={question.pieces}
          startedAt={startedAt}
          timeLimitSec={question.timeLimitSec}
          onSubmit={(placements) => onAnswer({ placements })}
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
