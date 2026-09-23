import { HostRoomView } from '../../types';
import { AnswerOption } from '../../components/AnswerOption';
import { PodiumStand } from '../../components/PodiumStand';
import { Seat } from '../../components/PlateBoard';

export function HostReveal({ view, onNext }: { view: HostRoomView; onNext: () => void }) {
  const question = view.question!;
  const maxCount = Math.max(1, ...view.optionCounts);

  return (
    <div className="page">
      <h1 className="title">La risposta giusta è...</h1>
      <div className="hint">{question.title}</div>
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
      ) : question.type === 'plate_assignment' ? (
        <>
          <div className="plate-board">
            <Seat
              seatKey={question.head}
              side="head"
              marks={{
                primo: Boolean(question.correctPrimo?.includes(question.head)),
                secondo: Boolean(question.correctSecondo?.includes(question.head)),
              }}
            />
            <div className="dinner-table-body">
              <div className="dinner-side">
                {question.left.map((s) => (
                  <Seat
                    key={s}
                    seatKey={s}
                    side="left"
                    marks={{
                      primo: Boolean(question.correctPrimo?.includes(s)),
                      secondo: Boolean(question.correctSecondo?.includes(s)),
                    }}
                  />
                ))}
              </div>
              <div className="dinner-table-rect" />
              <div className="dinner-side">
                {question.right.map((s) => (
                  <Seat
                    key={s}
                    seatKey={s}
                    side="right"
                    marks={{
                      primo: Boolean(question.correctPrimo?.includes(s)),
                      secondo: Boolean(question.correctSecondo?.includes(s)),
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <ol className="leaderboard-list">
            {view.guesses
              .slice()
              .sort((a, b) => b.value - a.value)
              .map((g) => (
                <li key={g.playerId} style={{ background: g.correct ? 'var(--gold)' : 'white' }}>
                  <span>{g.correct ? '✅' : '🍽️'} {g.name}</span>
                  <span>
                    {g.value} / {(question.left.length + question.right.length + 1) * 2}
                  </span>
                </li>
              ))}
          </ol>
        </>
      ) : question.type === 'ham_cut' ? (
        <>
          <img src={question.imageUrl} alt="" style={{ maxWidth: 200, borderRadius: 16 }} />
          <p className="subtitle">The goal was a perfect 50/50 split by area.</p>
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

      <button className="btn btn-primary btn-lg" onClick={onNext}>
        📊 Show Leaderboard
      </button>
    </div>
  );
}
