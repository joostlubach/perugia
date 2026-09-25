import { HostRoomView } from '../../types';
import { JoinQrCode } from '../../components/JoinQrCode';
import { avatarSrc } from '../../avatar';
import { audio } from '../../audio';
import { t } from '../../texts';

export function HostLobby({ view, onStart }: { view: HostRoomView; onStart: () => void }) {
  return (
    <div className="page">
      <h1 className="title">{t('host.lobby.title')}</h1>
      <JoinQrCode joinCode={view.joinCode} />
      <div className="card">
        <h2>{t('host.lobby.playersJoined', { count: view.playerCount })}</h2>
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
        disabled={view.playerCount === 0 && !view.runthrough}
        onClick={() => {
          audio.stop('background');
          onStart();
        }}
      >
        {t('host.lobby.start')}
      </button>
    </div>
  );
}
