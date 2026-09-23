import { useNavigate } from 'react-router-dom';
import { t } from '../texts';

// Players don't start here: they join through the QR code in the host's lobby.

export function Landing() {
  const navigate = useNavigate();
  return (
    <div className="page">
      <h1 className="title">{t('landing.title')}</h1>
      <p className="subtitle">{t('landing.subtitle')}</p>
      <div className="btn-row">
        <button className="btn btn-primary btn-lg" onClick={() => navigate('/host')}>
          {t('landing.hostButton')}
        </button>
      </div>
    </div>
  );
}
