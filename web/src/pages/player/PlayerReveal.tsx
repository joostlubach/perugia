import { PlayerRoomView } from '../../types';
import { t } from '../../texts';

export function PlayerReveal({ view }: { view: PlayerRoomView }) {
  const correct = view.lastResult?.correct;
  // podium_order hands out partial credit, so points can come without `correct`.
  const points = view.lastResult?.pointsAwarded ?? 0;
  return (
    <div className="page">
      {view.lastResult ? (
        <>
          <h1 className="title">{correct
              ? t('player.reveal.correct')
              : points > 0
              ? t('player.reveal.partlyCorrect')
              : t('player.reveal.wrong')}</h1>
          <p className="subtitle">
            {points > 0 ? t('player.reveal.points', { points }) : t('player.reveal.noPoints')}
          </p>
        </>
      ) : (
        <h1 className="title">{t('player.reveal.timeUp')}</h1>
      )}
      <div className="card">
        <p>{t('player.reveal.totalScore', { score: view.score })}</p>
      </div>
    </div>
  );
}
