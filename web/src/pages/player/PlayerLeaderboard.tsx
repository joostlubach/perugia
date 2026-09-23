import { PlayerRoomView } from '../../types';
import { t } from '../../texts';

export function PlayerLeaderboard({ view }: { view: PlayerRoomView }) {
  return (
    <div className="page">
      <h1 className="title">{t('player.leaderboard.title', { rank: view.rank })}</h1>
      <p className="subtitle">{t('player.leaderboard.subtitle', { count: view.playerCount })}</p>
      <div className="card">
        <p>{t('player.leaderboard.totalScore', { score: view.score })}</p>
      </div>
    </div>
  );
}
