import { useState } from 'react';
import { api } from '../../api';
import { t } from '../../texts';

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
      <h1 className="title">{t('host.setup.title')}</h1>
      <div className="card">
        <button className="btn btn-primary btn-lg" disabled={loading} onClick={create}>
          {t('host.setup.createRoom')}
        </button>
        {error && <p className="error-text">{error}</p>}
      </div>
    </div>
  );
}
