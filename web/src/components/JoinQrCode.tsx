import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { t } from '../texts';

function joinUrl(joinCode: string) {
  return `${window.location.origin}/play/${joinCode}`;
}

function useQrDataUrl(url: string): string | null {
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 220 })
      .then(setQr)
      .catch(() => setQr(null));
  }, [url]);
  return qr;
}

export function JoinQrCode({ joinCode }: { joinCode: string }) {
  const url = joinUrl(joinCode);
  const qr = useQrDataUrl(url);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      {qr && (
        <div className="qr-box">
          <img src={qr} alt={t('host.lobby.scanToJoin')} width={180} height={180} />
        </div>
      )}
      <div className="hint">{t('host.lobby.scanToJoin')}</div>
      <div className="join-url">
        <div className="hint">{t('host.lobby.orGoToUrl')}</div>
        <div className="join-url-text">{url.replace(/^https?:\/\//, '')}</div>
      </div>
    </div>
  );
}

// Small corner version for during the game, so latecomers can still join
// (they just start at zero points).
export function JoinQrCorner({ joinCode }: { joinCode: string }) {
  const qr = useQrDataUrl(joinUrl(joinCode));
  if (!qr) return null;
  return (
    <div className="join-qr-corner">
      <img src={qr} alt={t('host.lateJoin')} width={96} height={96} />
      <div>{t('host.lateJoin')}</div>
    </div>
  );
}
