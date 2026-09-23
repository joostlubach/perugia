import { HostRoomView } from '../../types';
import { t } from '../../texts';

export function HostLeaderboard({ view, onNext }: { view: HostRoomView; onNext: () => void }) {
  const isLast = view.currentQuestionIndex >= view.totalQuestions - 1;
  return (
    <div className="page">
      <h1 className="title">{t('host.leaderboard.title')}</h1>
      <ol className="leaderboard-list">
        {view.leaderboard.slice(0, 10).map((p, i) => (
          <li key={p.id}>
            <span>#{i + 1} {p.name}</span>
            <span>{p.score}</span>
          </li>
        ))}
      </ol>
      <button className="btn btn-primary btn-lg" onClick={onNext}>
        {isLast ? t('host.leaderboard.toFinalResults') : t('host.leaderboard.toNextQuestion')}
      </button>
    </div>
  );
}
