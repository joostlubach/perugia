import { PlayerRoomView } from '../../types';

export function PlayerReveal({ view }: { view: PlayerRoomView }) {
  const correct = view.lastResult?.correct;
  // podium_order hands out partial credit, so points can come without `correct`.
  const points = view.lastResult?.pointsAwarded ?? 0;
  return (
    <div className="page">
      {view.lastResult ? (
        <>
          <h1 className="title">{correct ? 'Perfetto! 🎉' : points > 0 ? 'Quasi! 👌' : 'Peccato! 😅'}</h1>
          <p className="subtitle">
            {points > 0 ? `+${points} points` : 'Better luck next time'}
          </p>
        </>
      ) : (
        <h1 className="title">Tempo scaduto! ⏰</h1>
      )}
      <div className="card">
        <p>Total score: {view.score}</p>
      </div>
    </div>
  );
}
