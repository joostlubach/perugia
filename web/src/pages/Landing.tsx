import { useNavigate } from 'react-router-dom';

// Players don't start here: they join through the QR code in the host's lobby.

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
      </div>
    </div>
  );
}
