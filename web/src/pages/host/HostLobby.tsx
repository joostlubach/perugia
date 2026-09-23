import { HostRoomView } from '../../types';
import { RoomCodeBadge } from '../../components/RoomCodeBadge';
import { audio } from '../../audio';

export function HostLobby({ view, onStart }: { view: HostRoomView; onStart: () => void }) {
  return (
    <div className="page">
      <h1 className="title">Benvenuti! 🇮🇹</h1>
      <RoomCodeBadge code={view.code} />
      <div className="card">
        <h2>{view.playerCount} player{view.playerCount === 1 ? '' : 's'} joined</h2>
        <div className="btn-row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
          {view.players.map((p) => (
            <span key={p.id} className="btn" style={{ cursor: 'default' }}>
              {p.name}
            </span>
          ))}
        </div>
      </div>
      <button
        className="btn btn-primary btn-lg"
        disabled={view.playerCount === 0}
        onClick={() => {
          audio.stopBackground();
          onStart();
        }}
      >
        🚀 Andiamo! Start Game
      </button>
    </div>
  );
}
