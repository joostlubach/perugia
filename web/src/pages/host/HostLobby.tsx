import { HostRoomView } from '../../types';
import { JoinQrCode } from '../../components/JoinQrCode';
import { avatarSrc } from '../../avatar';
import { audio } from '../../audio';

export function HostLobby({ view, onStart }: { view: HostRoomView; onStart: () => void }) {
  return (
    <div className="page">
      <h1 className="title">Benvenuti! 🇮🇹</h1>
      <JoinQrCode />
      <div className="card">
        <h2>{view.playerCount} player{view.playerCount === 1 ? '' : 's'} joined</h2>
        <div className="lobby-players">
          {view.players.map((p) => (
            <div key={p.id} className="lobby-player">
              <img className="avatar-img" src={avatarSrc(p.avatar)} alt="" />
              <span>{p.name}</span>
            </div>
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
