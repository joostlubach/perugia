import { t } from '../../texts';

// A pause after the last question, before the final results are revealed.
export function HostFinale({ onNext }: { onNext: () => void }) {
  return (
    <div className="page">
      <h1 className="title">{t('host.finale.title')}</h1>
      <p className="subtitle narrow">{t('host.finale.subtitle')}</p>
      <button className="btn btn-gold btn-lg" onClick={onNext}>
        {t('host.finale.showResults')}
      </button>
    </div>
  );
}
