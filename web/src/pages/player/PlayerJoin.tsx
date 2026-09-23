import { useEffect, useState } from 'react';
import { api } from '../../api';
import { avatarName, avatarSrc } from '../../avatar';

export function PlayerJoin({
  joinCode,
  onJoined,
}: {
  joinCode: string;
  onJoined: (playerId: string, playerToken: string) => void;
}) {
  const [avatars, setAvatars] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getAvatars().then(setAvatars, (err) => setError((err as Error).message));
  }, []);

  const join = async () => {
    if (!selected) {
      setError('Pick an avatar first');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { playerId, playerToken } = await api.joinRoom(joinCode, avatarName(selected), selected);
      onJoined(playerId, playerToken);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page join-page">
      <h1 className="title">Who are you? 🎊</h1>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!avatars ? (
          <p className="hint">Loading...</p>
        ) : (
          <div className="avatar-grid">
            {avatars.map((key) => (
              <button
                key={key}
                className={`avatar-option ${selected === key ? 'selected' : ''}`}
                onClick={() => setSelected(key)}
              >
                <img src={avatarSrc(key)} alt="" className="avatar-img" />
                <span>{avatarName(key)}</span>
              </button>
            ))}
          </div>
        )}
        <button className="btn btn-primary btn-lg" disabled={loading || !selected} onClick={join}>
          🇮🇹 Andiamo!
        </button>
        {error && <p className="error-text">{error}</p>}
      </div>
    </div>
  );
}
