import { useState } from 'react';
import { api } from '../../api';

export function PlayerJoin({ onJoined }: { onJoined: (code: string, playerId: string, playerToken: string) => void }) {
  const params = new URLSearchParams(window.location.search);
  const [code, setCode] = useState(params.get('code')?.toUpperCase() ?? '');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const join = async () => {
    if (!code.trim() || !name.trim()) {
      setError('Enter both a room code and your name');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { playerId, playerToken } = await api.joinRoom(code.trim().toUpperCase(), name.trim());
      onJoined(code.trim().toUpperCase(), playerId, playerToken);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h1 className="title">Join the Party! 🎊</h1>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input
          type="text"
          placeholder="ROOM CODE"
          value={code}
          maxLength={5}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        <input
          type="text"
          placeholder="Your name"
          value={name}
          maxLength={24}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && join()}
        />
        <button className="btn btn-primary btn-lg" disabled={loading} onClick={join}>
          🇮🇹 Andiamo!
        </button>
        {error && <p className="error-text">{error}</p>}
      </div>
    </div>
  );
}
