import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function RoomCodeBadge({ code }: { code: string }) {
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    const url = `${window.location.origin}/play?code=${code}`;
    QRCode.toDataURL(url, { margin: 1, width: 220 })
      .then(setQr)
      .catch(() => setQr(null));
  }, [code]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div className="room-code">{code}</div>
      {qr && (
        <div className="qr-box">
          <img src={qr} alt="Scan to join" width={180} height={180} />
        </div>
      )}
      <div className="hint">Go to this site on your phone and enter the code, or scan the QR</div>
    </div>
  );
}
