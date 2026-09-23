import { useState } from 'react';
import { api } from '../../api';

export function HostSetup({ onCreated }: { onCreated: (hostToken: string) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const create = async () => {
    setLoading(true);
    setError(null);
    try {
      const { hostToken } = await api.createRoom();
      onCreated(hostToken);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h1 className="title">Host Setup</h1>
      <div className="card">
        <button className="btn btn-primary btn-lg" disabled={loading} onClick={create}>
          🎉 Create Room
        </button>
        {error && <p className="error-text">{error}</p>}
      </div>
    </div>
  );
}
