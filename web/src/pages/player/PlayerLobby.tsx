import { PlayerRoomView } from '../../types';
import { t } from '../../texts';

export function PlayerLobby({ view }: { view: PlayerRoomView }) {
  return (
    <div className="page">
      <h1 className="title">{t('player.lobby.title')}</h1>
      <p className="subtitle">{t('player.lobby.subtitle')}</p>
      <div className="card sound-notice">{t('player.lobby.soundOn')}</div>
      <div className="card">
        <p>{t('player.lobby.playersInRoom', { count: view.playerCount })}</p>
      </div>
    </div>
  );
}
