import { HostRoomView } from '../../types';
import { AnswerOption } from '../../components/AnswerOption';
import { MenuCard } from '../../components/MenuCard';
import { TravelMap } from '../../components/TravelMap';
import { Vase } from '../../components/MoneyVase';
import { PodiumStand } from '../../components/PodiumStand';
import { SketchMap } from '../../components/SketchMap';
import { TallyList } from '../../components/TallyList';
import { QuestionText } from '../../components/QuestionText';
import { isCorrectOption } from '../../scoring';
import { HostGradeBox } from './HostGradeBox';
import { OpenAnswerSummary } from './OpenAnswerSummary';
import { CorrectTally } from './CorrectTally';
import { t } from '../../texts';

export function HostReveal({
  view,
  onNext,
  onGrade,
}: {
  view: HostRoomView;
  onNext: () => void;
  onGrade: (correctAnswer: string) => void;
}) {
  const question = view.question!;
  const maxCount = Math.max(1, ...view.optionCounts);
  const correctTally = <CorrectTally guesses={view.guesses} partialCredit={question.type !== 'multiple_choice'} />;

  return (
    <div className="page">
      <h1 className="title">{t('host.reveal.title')}</h1>
      <h2 className="question-text"><QuestionText text={question.playerText ?? question.text} /></h2>
      {question.type === 'multiple_choice' && question.imageUrl && (
        <img className="question-image" src={question.imageUrl} alt="" />
      )}

      {question.type === 'open_answer' ? (
        <>
          {question.correctAnswer === undefined ? (
            // Only when the answer key player didn't answer (or there isn't one).
            <HostGradeBox onGrade={onGrade} />
          ) : (
            <OpenAnswerSummary
              guesses={view.guesses}
              correctAnswer={question.correctAnswer}
              answerFrom={question.answerFrom}
              showAnswersOf={question.showAnswersOf ?? []}
            />
          )}
        </>
      ) : question.type === 'menu_order' ? (
        <>
          <MenuCard menu={question.menu} counts={view.optionCounts} correctIndexes={question.correctIndexes} wide />
          {correctTally}
        </>
      ) : question.type === 'multiple_choice' ? (
        <>
          <div className="option-grid">
            {question.options.map((text, i) => (
              <AnswerOption
                key={i}
                index={i}
                text={text}
                count={view.optionCounts[i] ?? 0}
                maxCount={maxCount}
                revealed
                isCorrect={question.correctIndex !== undefined && isCorrectOption(question.correctIndex, i)}
              />
            ))}
          </div>
          {correctTally}
        </>
      ) : question.type === 'travel_map' ? (
        <>
          <TravelMap
            mapUrl={question.mapUrl}
            aspectRatio={question.aspectRatio}
            landmarks={question.landmarks}
            stops={question.stops}
            groups={question.correctGroups}
            large
          />
          {correctTally}
        </>
      ) : question.type === 'money_vase' ? (
        <>
          <Vase total={question.correctCents ?? 0} large />
          {correctTally}
        </>
      ) : question.type === 'podium_order' ? (
        <>
          <div className="podium-order">
            {question.correctOrder?.map((group, g) => (
              <div key={g} className="podium-order-group">
                <div className="hint">{question.groupLabels[g]}</div>
                <PodiumStand order={group} groupIndex={g} />
              </div>
            ))}
          </div>
          {correctTally}
        </>
      ) : question.type === 'situation_sketch' ? (
        <>
          <SketchMap
            mapUrl={question.mapUrl}
            aspectRatio={question.aspectRatio}
            zoom={question.zoom}
            pieces={question.pieces}
            placements={question.correctPlacements}
            large
            showLabels
          />
          {correctTally}
        </>
      ) : question.type === 'ham_cut' ? (
        <>
          <img src={question.imageUrl} alt="" style={{ maxWidth: 200, borderRadius: 16 }} />
          <p className="subtitle">{t('host.reveal.hamGoal')}</p>
          {correctTally}
        </>
      ) : question.type === 'trace_marks' ? (
        <>
          <img src={question.revealImageUrl} alt="" style={{ maxWidth: 260, borderRadius: 16 }} />
          {correctTally}
        </>
      ) : question.type === 'multi_text' ? (
        <>
          <TallyList items={question.correctAnswers ?? []} counts={view.optionCounts} />
          {correctTally}
        </>
      ) : question.type === 'multi_select' ? (
        <>
          <TallyList
            items={question.options}
            counts={view.optionCounts}
            isCorrect={(i) => !!question.correctIndexes?.includes(i)}
          />
          {correctTally}
        </>
      ) : (
        <>
          <div
            className="countdown"
            style={{
              borderRadius: 16,
              width: 'auto',
              height: 'auto',
              padding: '12px 28px',
            }}
          >
            {question.correctCount}
          </div>
          {correctTally}
        </>
      )}

      <button
        className="btn btn-primary btn-lg"
        disabled={question.type === 'open_answer' && question.correctAnswer === undefined}
        onClick={onNext}
      >
        {view.afterReveal === 'leaderboard'
          ? t('host.reveal.toLeaderboard')
          : view.afterReveal === 'finale'
            ? t('host.reveal.toFinale')
            : t('host.reveal.toNextQuestion')}
      </button>
    </div>
  );
}
