import { HostRoomView } from '../../types';
import { AnswerOption } from '../../components/AnswerOption';

export function HostReveal({ view, onNext }: { view: HostRoomView; onNext: () => void }) {
  const question = view.question!;
  const maxCount = Math.max(1, ...view.optionCounts);

  return (
    <div className="page">
      <h1 className="title">La risposta giusta è...</h1>
      <h2 className="question-text">{question.text}</h2>

      {question.type === 'multiple_choice' ? (
        <div className="option-grid">
          {question.options.map((text, i) => (
            <AnswerOption
              key={i}
              index={i}
              text={text}
              count={view.optionCounts[i] ?? 0}
              maxCount={maxCount}
              revealed
              isCorrect={i === question.correctIndex}
            />
          ))}
        </div>
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

      <button className="btn btn-primary btn-lg" onClick={onNext}>
        📊 Show Leaderboard
      </button>
    </div>
  );
}
