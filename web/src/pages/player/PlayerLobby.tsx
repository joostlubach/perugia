import { PlayerRoomView } from '../../types';

export function PlayerLobby({ view }: { view: PlayerRoomView }) {
  return (
    <div className="page">
      <h1 className="title">You're in! 🍕</h1>
      <p className="subtitle">Sit tight, the host will start soon...</p>
      <div className="card">
        <p>{view.playerCount} player{view.playerCount === 1 ? '' : 's'} in the room</p>
      </div>
    </div>
  );
}
