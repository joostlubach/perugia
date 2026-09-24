import { HostRoomView } from '../../types';
import { AnswerOption } from '../../components/AnswerOption';
import { MenuCard } from '../../components/MenuCard';
import { TravelMap } from '../../components/TravelMap';
import { formatEuro, Vase } from '../../components/MoneyVase';
import { PodiumStand } from '../../components/PodiumStand';
import { SketchMap } from '../../components/SketchMap';
import { QuestionText } from '../../components/QuestionText';
import { isCorrectOption } from '../../scoring';
import { HostGradeBox } from './HostGradeBox';
import { OpenAnswerSummary } from './OpenAnswerSummary';
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
          <ol className="leaderboard-list">
            {view.guesses
              .slice()
              .sort((a, b) => b.value - a.value)
              .map((g) => (
                <li key={g.playerId} style={{ background: g.correct ? 'var(--gold)' : 'white' }}>
                  <span>{g.correct ? '✅' : '🌾'} {g.name}</span>
                  <span>
                    {g.value} / {question.menu.length}
                  </span>
                </li>
              ))}
          </ol>
        </>
      ) : question.type === 'multiple_choice' ? (
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
          <ol className="leaderboard-list">
            {view.guesses
              .slice()
              .sort((a, b) => b.value - a.value)
              .map((g) => (
                <li key={g.playerId} style={{ background: g.correct ? 'var(--gold)' : 'white' }}>
                  <span>{g.correct ? '✅' : '🗺️'} {g.name}</span>
                  <span>
                    {g.value} / {question.people.length}
                  </span>
                </li>
              ))}
          </ol>
        </>
      ) : question.type === 'money_vase' ? (
        <>
          <Vase total={question.correctCents ?? 0} large />
          <ol className="leaderboard-list">
            {view.guesses
              .slice()
              .sort((a, b) => Math.abs(a.value - (question.correctCents ?? 0)) - Math.abs(b.value - (question.correctCents ?? 0)))
              .map((g) => {
                const diff = g.value - (question.correctCents ?? 0);
                return (
                  <li key={g.playerId} style={{ background: g.correct ? 'var(--gold)' : 'white' }}>
                    <span>
                      {g.correct ? '✅' : '💰'} {g.name}
                    </span>
                    <span>
                      {formatEuro(g.value)} ({diff >= 0 ? '+' : '−'}
                      {formatEuro(Math.abs(diff))})
                    </span>
                  </li>
                );
              })}
          </ol>
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
          <ol className="leaderboard-list">
            {view.guesses
              .slice()
              .sort((a, b) => b.value - a.value)
              .map((g) => (
                <li key={g.playerId} style={{ background: g.correct ? 'var(--gold)' : 'white' }}>
                  <span>{g.correct ? '✅' : '🏎️'} {g.name}</span>
                  <span>
                    {g.value} / {question.groups.flat().length}
                  </span>
                </li>
              ))}
          </ol>
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
          <ol className="leaderboard-list">
            {view.guesses
              .slice()
              .sort((a, b) => b.value - a.value)
              .map((g) => (
                <li key={g.playerId} style={{ background: g.correct ? 'var(--gold)' : 'white' }}>
                  <span>{g.correct ? '✅' : '🚨'} {g.name}</span>
                  <span>{g.value}%</span>
                </li>
              ))}
          </ol>
        </>
      ) : question.type === 'ham_cut' ? (
        <>
          <img src={question.imageUrl} alt="" style={{ maxWidth: 200, borderRadius: 16 }} />
          <p className="subtitle">{t('host.reveal.hamGoal')}</p>
          <ol className="leaderboard-list">
            {view.guesses
              .slice()
              .sort((a, b) => b.value - a.value)
              .map((g) => (
                <li key={g.playerId} style={{ background: g.correct ? 'var(--gold)' : 'white' }}>
                  <span>{g.correct ? '✅' : '🔪'} {g.name}</span>
                  <span>{g.value}%</span>
                </li>
              ))}
          </ol>
        </>
      ) : question.type === 'trace_marks' ? (
        <>
          <img src={question.revealImageUrl} alt="" style={{ maxWidth: 260, borderRadius: 16 }} />
          <ol className="leaderboard-list">
            {view.guesses
              .slice()
              .sort((a, b) => b.value - a.value)
              .map((g) => (
                <li key={g.playerId} style={{ background: g.correct ? 'var(--gold)' : 'white' }}>
                  <span>{g.correct ? '✅' : '🖍️'} {g.name}</span>
                  <span>{g.value}%</span>
                </li>
              ))}
          </ol>
        </>
      ) : question.type === 'multi_select' ? (
        <>
          <ol className="leaderboard-list">
            {question.options.map((text, i) => (
              <li key={i} style={{ background: question.correctIndexes?.includes(i) ? 'var(--gold)' : 'white' }}>
                <span>{question.correctIndexes?.includes(i) ? '✅' : '❌'} {text}</span>
              </li>
            ))}
          </ol>
          <ol className="leaderboard-list">
            {view.guesses
              .slice()
              .sort((a, b) => b.value - a.value)
              .map((g) => (
                <li key={g.playerId} style={{ background: g.correct ? 'var(--gold)' : 'white' }}>
                  <span>{g.correct ? '✅' : '❌'} {g.name}</span>
                  <span>
                    {g.value} / {question.options.length}
                  </span>
                </li>
              ))}
          </ol>
        </>
      ) : (
        <>
          <div className="countdown" style={{ borderRadius: 16, width: 'auto', height: 'auto', padding: '12px 28px' }}>
            {question.correctCount}
          </div>
          <ol className="leaderboard-list">
            {view.guesses
              .slice()
              .sort((a, b) => a.value - b.value)
              .map((g) => (
                <li key={g.playerId} style={{ background: g.correct ? 'var(--gold)' : 'white' }}>
                  <span>{g.correct ? '✅' : '❌'} {g.name}</span>
                  <span>{g.value}</span>
                </li>
              ))}
          </ol>
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
