import { HostRoomView } from '../../types';
import { AnswerOption } from '../../components/AnswerOption';
import { Countdown } from '../../components/Countdown';
import { MenuCard } from '../../components/MenuCard';
import { TravelMap } from '../../components/TravelMap';
import { Vase } from '../../components/MoneyVase';
import { QuestionText } from '../../components/QuestionText';
import { t } from '../../texts';

// Answering is open; the server moves on to the reveal once time is up or everyone has answered.
export function HostQuestion({ view }: { view: HostRoomView }) {
  const question = view.question!;

  const maxCount = Math.max(1, ...view.optionCounts);

  return (
    <div className="page">
      <div className="hint">
        {t('host.questionHeader', {
          number: view.currentQuestionIndex + 1,
          total: view.totalQuestions,
          title: question.title,
        })}
      </div>
      <h1 className="question-text"><QuestionText text={question.text} /></h1>
      {question.type === 'multiple_choice' && question.imageUrl && (
        <img className="question-image" src={question.imageUrl} alt="" />
      )}
      <div className="answer-status">
        <Countdown startedAt={view.questionStartedAt} timeLimitSec={question.timeLimitSec} />
        <div className="answer-tally">
          <span className="answer-tally-count">
            {view.answeredCount} / {view.playerCount}
          </span>
          {t('host.question.answered')}
        </div>
      </div>
      {question.type === 'menu_order' ? (
        <MenuCard menu={question.menu} counts={view.optionCounts} wide />
      ) : question.type === 'multiple_choice' ? (
        <div className="option-grid">
          {question.options.map((text, i) => (
            <AnswerOption key={i} index={i} text={text} count={view.optionCounts[i] ?? 0} maxCount={maxCount} />
          ))}
        </div>
      ) : question.type === 'travel_map' ? (
        <TravelMap
          mapUrl={question.mapUrl}
          aspectRatio={question.aspectRatio}
          landmarks={question.landmarks}
          stops={question.stops}
          large
        />
      ) : question.type === 'money_vase' ? (
        <>
          <Vase total={null} large />
          <p className="subtitle">{t('host.question.money_vase')}</p>
        </>
      ) : question.type === 'podium_order' ? (
        <p className="subtitle">{t('host.question.podium_order')}</p>
      ) : question.type === 'plate_assignment' ? (
        <p className="subtitle">{t('host.question.plate_assignment')}</p>
      ) : question.type === 'ham_cut' ? (
        <p className="subtitle">{t('host.question.ham_cut')}</p>
      ) : question.type === 'trace_marks' ? (
        <p className="subtitle">{t('host.question.trace_marks')}</p>
      ) : question.type === 'multi_select' ? (
        <p className="subtitle">{t('host.question.multi_select')}</p>
      ) : (
        <p className="subtitle">{t('host.question.drag_count', { label: question.dragLabel })}</p>
      )}
    </div>
  );
}
