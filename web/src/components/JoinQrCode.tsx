import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function JoinQrCode({ joinCode }: { joinCode: string }) {
  const [qr, setQr] = useState<string | null>(null);
  const url = `${window.location.origin}/play/${joinCode}`;

  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 220 })
      .then(setQr)
      .catch(() => setQr(null));
  }, [url]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      {qr && (
        <div className="qr-box">
          <img src={qr} alt="Scan to join" width={180} height={180} />
        </div>
      )}
      <div className="hint">Scan to join on your phone</div>
      <div className="join-url">
        <div className="hint">or go to this URL on your phone</div>
        <div className="join-url-text">{url.replace(/^https?:\/\//, '')}</div>
      </div>
    </div>
  );
}
