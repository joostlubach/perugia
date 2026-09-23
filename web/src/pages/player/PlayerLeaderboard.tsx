import { PlayerRoomView } from '../../types';

export function PlayerLeaderboard({ view }: { view: PlayerRoomView }) {
  return (
    <div className="page">
      <h1 className="title">You're #{view.rank}!</h1>
      <p className="subtitle">out of {view.playerCount} players</p>
      <div className="card">
        <p>Total score: {view.score}</p>
      </div>
    </div>
  );
}
