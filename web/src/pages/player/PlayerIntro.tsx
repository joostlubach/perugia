import { PlayerRoomView } from '../../types';
import { t } from '../../texts';

export function PlayerIntro({ view }: { view: PlayerRoomView }) {
  return (
    <div className="page">
      <div className="hint">
        {t('player.intro.header', { number: view.currentQuestionIndex + 1, total: view.totalQuestions })}
      </div>
      <h1 className="title">{t('player.intro.title')}</h1>
      <p className="subtitle">{t('player.intro.subtitle')}</p>
    </div>
  );
}
