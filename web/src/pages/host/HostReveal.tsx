import { useEffect, useState } from 'react';
import { HostPlayerAnswer, HostRoomView, RulingPick } from '../../types';
import { AnswerOption } from '../../components/AnswerOption';
import { MenuCard } from '../../components/MenuCard';
import { TravelMap } from '../../components/TravelMap';
import { Vase } from '../../components/MoneyVase';
import { PinMap } from '../../components/PinMap';
import { PodiumStand } from '../../components/PodiumStand';
import { SketchMap } from '../../components/SketchMap';
import { TallyList } from '../../components/TallyList';
import { QuestionText } from '../../components/QuestionText';
import { PhotoStrip } from '../../components/PhotoStrip';
import { isCorrectOption } from '../../scoring';
import { HostGradeBox } from './HostGradeBox';
import { OpenAnswerSummary } from './OpenAnswerSummary';
import { RivalAnswerReveal } from './RivalAnswerReveal';
import { CorrectTally } from './CorrectTally';
import { PlayerAnswerView } from './PlayerAnswerView';
import { PlayerPicker } from './PlayerPicker';
import { t } from '../../texts';

export function HostReveal({
  view,
  onNext,
  onGrade,
  onRule,
  loadAnswer,
}: {
  view: HostRoomView;
  onNext: () => void;
  onGrade: (correctAnswer: string) => void;
  onRule: (pick: RulingPick) => void;
  loadAnswer: (playerId: string) => Promise<HostPlayerAnswer>;
}) {
  const question = view.question!;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shown, setShown] = useState<HostPlayerAnswer | null>(null);
  // Refetched when their points change, e.g. once an open question is graded.
  const selectedPoints = view.guesses.find((g) => g.playerId === selectedId)?.pointsAwarded;

  useEffect(() => {
    if (!selectedId) {
      setShown(null);
      return;
    }
    let cancelled = false;
    loadAnswer(selectedId).then(
      (answer) => !cancelled && setShown(answer),
      () => {},
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selectedPoints]);
  const maxCount = Math.max(1, ...view.optionCounts);
  const correctTally = <CorrectTally guesses={view.guesses} partialCredit={question.type !== 'multiple_choice'} />;

  return (
    <div className="page">
      <PlayerPicker players={view.players} selectedId={selectedId} onSelect={setSelectedId} />
      <h1 className="title">{t('host.reveal.title')}</h1>
      <h2 className="question-text"><QuestionText text={question.playerText ?? question.text} /></h2>
      {question.type === 'multiple_choice' && question.imageUrl && (
        <img className="question-image" src={question.imageUrl} alt="" />
      )}

      {selectedId ? (
        shown?.playerId === selectedId && <PlayerAnswerView question={question} player={shown} />
      ) : question.type === 'open_answer' && question.answerFrom && question.rivalAnswerFrom ? (
        <RivalAnswerReveal
          guesses={view.guesses}
          answerFrom={question.answerFrom}
          rivalAnswerFrom={question.rivalAnswerFrom}
          correctAnswer={question.correctAnswer}
          rivalRevealed={view.rivalRevealed}
          onRevealRival={onNext}
          onRule={onRule}
        />
      ) : question.type === 'open_answer' ? (
        <>
          {question.correctAnswer === undefined ? (
            // Only when the answer key player didn't answer (or there isn't one).
            <HostGradeBox onGrade={onGrade} />
          ) : (
            <OpenAnswerSummary
              guesses={view.guesses}
              correctAnswer={question.correctAnswer ?? ''}
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
      ) : question.type === 'map_pin' ? (
        <>
          <PinMap
            mapUrl={question.mapUrl}
            aspectRatio={question.aspectRatio}
            pins={view.guesses.flatMap((g) =>
              g.point ? [{ key: g.playerId, avatar: g.avatar, ...g.point, label: g.name }] : [],
            )}
            answer={question.answer}
            large
          />
          <div className="pin-map-rankings">
            {[...view.guesses]
              .sort((a, b) => a.value - b.value)
              .slice(0, 3)
              .map((g, i) => (
                <span key={g.playerId}>
                  {['🥇', '🥈', '🥉'][i]} {t('host.reveal.distanceKm', { name: g.name, km: g.value })}
                </span>
              ))}
          </div>
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
      ) : question.type === 'photo_floors' ? (
        <>
          <PhotoStrip
            photoUrls={question.photoUrls}
            captions={question.photoUrls.map((_, i) => (
              <>
                <strong>{question.floors[question.correctFloors?.[i] ?? -1]}</strong>
                <span className="hint">{t('host.reveal.gotItRight', { count: view.optionCounts[i] ?? 0 })}</span>
              </>
            ))}
          />
          {correctTally}
        </>
      ) : question.type === 'multi_select' ? (
        <>
          <MultiSelectTally
            options={question.options}
            counts={view.optionCounts}
            correctIndexes={question.correctIndexes ?? []}
            order={question.revealOrder}
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

      {/* With a rival, the reveal has its own buttons until the host has ruled. */}
      {!(question.type === 'open_answer' && question.rivalAnswerFrom && question.correctAnswer === undefined) && (
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
      )}
    </div>
  );
}

// The correct options in one list, the wrong ones in a second list below it.
function MultiSelectTally({
  options,
  counts,
  correctIndexes,
  order = options.map((_, i) => i),
}: {
  options: string[];
  counts: number[];
  correctIndexes: number[];
  order?: number[];
}) {
  const maxCount = Math.max(1, ...counts);
  const list = (correct: boolean) => {
    const indexes = order.filter((i) => correctIndexes.includes(i) === correct);
    if (indexes.length === 0) return null;
    return (
      <TallyList
        items={indexes.map((i) => options[i])}
        counts={indexes.map((i) => counts[i] ?? 0)}
        isCorrect={() => correct}
        maxCount={maxCount}
      />
    );
  };
  return (
    <>
      {list(true)}
      {list(false)}
    </>
  );
}
