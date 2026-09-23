import { useNavigate } from 'react-router-dom';

export function Landing() {
  const navigate = useNavigate();
  return (
    <div className="page">
      <h1 className="title">🇮🇹 Perugia Quiz Party 🍫</h1>
      <p className="subtitle">Mamma mia, get ready for some bellissimo trivia!</p>
      <div className="btn-row">
        <button className="btn btn-primary btn-lg" onClick={() => navigate('/host')}>
          📺 I'm the Host
        </button>
        <button className="btn btn-accent btn-lg" onClick={() => navigate('/play')}>
          📱 I'm a Player
        </button>
      </div>
    </div>
  );
}
