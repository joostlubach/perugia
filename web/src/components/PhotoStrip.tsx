import { ReactNode } from 'react';

// Photos next to each other. Only the first `shown` are visible, the rest are
// empty slots; `current` gets highlighted. Each can have a caption below it.
export function PhotoStrip({
  photoUrls,
  shown = photoUrls.length,
  current,
  captions,
  marks,
}: {
  photoUrls: string[];
  shown?: number;
  current?: number;
  captions?: ReactNode[];
  marks?: ('correct' | 'wrong')[];
}) {
  return (
    <div className="photo-strip">
      {photoUrls.map((url, i) => (
        <div key={i} className={`photo-strip-item ${i === current ? 'current' : ''} ${marks?.[i] ?? ''}`}>
          <div className="photo-strip-frame">{i < shown && <img src={url} alt="" />}</div>
          {captions?.[i] !== undefined && <div className="photo-strip-caption">{captions[i]}</div>}
        </div>
      ))}
    </div>
  );
}
