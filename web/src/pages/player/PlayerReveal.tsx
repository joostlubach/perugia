import { PlayerRoomView } from '../../types';

export function PlayerReveal({ view }: { view: PlayerRoomView }) {
  const correct = view.lastResult?.correct;
  return (
    <div className="page">
      {view.lastResult ? (
        <>
          <h1 className="title">{correct ? 'Perfetto! 🎉' : 'Peccato! 😅'}</h1>
          <p className="subtitle">
            {correct ? `+${view.lastResult.pointsAwarded} points` : 'Better luck next time'}
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
