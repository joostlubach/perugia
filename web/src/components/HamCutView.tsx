import { HamLine } from '../types';
import { clipLineToUnitSquare } from './HamCutBoard';

// The ham with a cut drawn across it, for showing someone's answer.
export function HamCutView({ imageUrl, line }: { imageUrl: string; line?: HamLine }) {
  const clipped = line && clipLineToUnitSquare(line.p1, line.p2);
  return (
    <div className="ham-cut-canvas">
      <img src={imageUrl} alt="" className="ham-cut-image" draggable={false} />
      <svg className="ham-cut-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        {clipped && (
          <line
            x1={clipped[0].x * 100}
            y1={clipped[0].y * 100}
            x2={clipped[1].x * 100}
            y2={clipped[1].y * 100}
            stroke="#cd212a"
            strokeWidth={3}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
    </div>
  );
}
