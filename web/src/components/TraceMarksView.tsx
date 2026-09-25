import { Point } from '../types';

// A photo with someone's red-pen strokes over it, for showing their answer.
export function TraceMarksView({
  imageUrl,
  aspectRatio,
  strokes = [],
}: {
  imageUrl: string;
  aspectRatio: number;
  strokes?: Point[][];
}) {
  return (
    <div
      className="trace-canvas"
      style={{ aspectRatio: String(aspectRatio), width: `min(100%, 360px, calc(52vh * ${aspectRatio}))`, cursor: 'default' }}
    >
      <img src={imageUrl} alt="" className="trace-image" draggable={false} />
      <svg className="trace-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        {strokes.map((stroke, i) => (
          <polyline
            key={i}
            points={stroke.map((p) => `${p.x * 100},${p.y * 100}`).join(' ')}
            fill="none"
            stroke="#e0102a"
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </div>
  );
}
