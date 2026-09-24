import { HostRoomView } from '../../types';
import { Podium } from '../../components/Podium';
import { Celebration } from '../../components/Celebration';
import { t } from '../../texts';

export function HostFinal({ view }: { view: HostRoomView }) {
  return (
    <div className="page">
      <h1 className="title">{t('host.final.title')}</h1>
      <p className="subtitle">{t('host.final.subtitle')}</p>
      <Podium top={view.leaderboard.slice(0, 3)} />
      <ol className="leaderboard-list">
        {view.leaderboard.slice(3, 10).map((p, i) => (
          <li key={p.id}>
            <span>#{i + 4} {p.name}</span>
            <span>{p.score}</span>
          </li>
        ))}
      </ol>
      <Celebration />
    </div>
  );
}
