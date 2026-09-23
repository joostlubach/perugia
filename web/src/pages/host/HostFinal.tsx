import { HostRoomView } from '../../types';
import { Podium } from '../../components/Podium';

export function HostFinal({ view }: { view: HostRoomView }) {
  return (
    <div className="page">
      <h1 className="title">Tanti Auguri! 🎉</h1>
      <p className="subtitle">Grazie mille for playing, bellissimo people!</p>
      <Podium top={view.leaderboard.slice(0, 3)} />
      <ol className="leaderboard-list">
        {view.leaderboard.slice(3, 10).map((p, i) => (
          <li key={p.id}>
            <span>#{i + 4} {p.name}</span>
            <span>{p.score}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
