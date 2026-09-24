import { HostRoomView } from '../../types';
import { AnswerOption } from '../../components/AnswerOption';
import { Countdown } from '../../components/Countdown';
import { MenuCard } from '../../components/MenuCard';
import { TravelMap } from '../../components/TravelMap';
import { SketchMap } from '../../components/SketchMap';
import { Vase } from '../../components/MoneyVase';
import { QuestionText } from '../../components/QuestionText';
import { t } from '../../texts';

// Answering is open; the server moves on to the reveal once time is up or everyone has answered.
// No tallies here: they'd give slower players hints.
export function HostQuestion({ view }: { view: HostRoomView }) {
  const question = view.question!;

  return (
    <div className="page">
      <div className="hint">
        {t('host.questionHeader', {
          number: view.currentQuestionIndex + 1,
          total: view.totalQuestions,
          title: question.title,
        })}
      </div>
      <h1 className="question-text"><QuestionText text={question.playerText ?? question.text} /></h1>
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
        <MenuCard menu={question.menu} wide />
      ) : question.type === 'multiple_choice' ? (
        <div className="option-grid">
          {question.options.map((text, i) => (
            <AnswerOption key={i} index={i} text={text} />
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
      ) : question.type === 'situation_sketch' ? (
        <>
          <p className="subtitle">{t('host.question.situation_sketch')}</p>
          <SketchMap
            mapUrl={question.mapUrl}
            aspectRatio={question.aspectRatio}
            zoom={question.zoom}
            zoomIn
            pieces={question.pieces}
            large
          />
        </>
      ) : question.type === 'ham_cut' ? (
        <p className="subtitle">{t('host.question.ham_cut')}</p>
      ) : question.type === 'trace_marks' ? (
        <p className="subtitle">{t('host.question.trace_marks')}</p>
      ) : question.type === 'open_answer' ? (
        <p className="subtitle">{t('host.question.open_answer')}</p>
      ) : question.type === 'multi_select' ? (
        <p className="subtitle">{t('host.question.multi_select')}</p>
      ) : question.type === 'multi_text' ? (
        <p className="subtitle">{t('host.question.multi_text')}</p>
      ) : (
        <p className="subtitle">{t('host.question.drag_count', { label: question.dragLabel })}</p>
      )}
    </div>
  );
}
