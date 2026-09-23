import { PlayerRoomView } from '../../types';

export function PlayerFinal({ view }: { view: PlayerRoomView }) {
  const medal = view.rank === 1 ? '🥇' : view.rank === 2 ? '🥈' : view.rank === 3 ? '🥉' : '🍝';
  return (
    <div className="page">
      <h1 className="title">Finito! {medal}</h1>
      <p className="subtitle">You finished #{view.rank} of {view.playerCount}</p>
      <div className="card">
        <p>Final score: {view.score}</p>
      </div>
      <p className="hint">Grazie for playing — see you next reunion!</p>
    </div>
  );
}
