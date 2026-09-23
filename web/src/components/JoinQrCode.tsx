import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function JoinQrCode() {
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    const url = `${window.location.origin}/play`;
    QRCode.toDataURL(url, { margin: 1, width: 220 })
      .then(setQr)
      .catch(() => setQr(null));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      {qr && (
        <div className="qr-box">
          <img src={qr} alt="Scan to join" width={180} height={180} />
        </div>
      )}
      <div className="hint">Scan to join on your phone</div>
    </div>
  );
}
