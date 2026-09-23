import { PlayerRoomView } from '../../types';
import { t } from '../../texts';

export function PlayerFinal({ view }: { view: PlayerRoomView }) {
  const medal = view.rank === 1 ? '🥇' : view.rank === 2 ? '🥈' : view.rank === 3 ? '🥉' : '🍝';
  return (
    <div className="page">
      <h1 className="title">{t('player.final.title', { medal })}</h1>
      <p className="subtitle">{t('player.final.subtitle', { rank: view.rank, count: view.playerCount })}</p>
      <div className="card">
        <p>{t('player.final.finalScore', { score: view.score })}</p>
      </div>
      <p className="hint">{t('player.final.goodbye')}</p>
    </div>
  );
}
