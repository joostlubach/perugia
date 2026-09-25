import { useState } from 'react';
import { avatarName, avatarSrc } from '../avatar';
import { SketchPiece } from '../types';

// A piece of a situation sketch: a go-kart with the avatar's face on the
// driver's seat (or empty), or a body lying on the ground. Fills its
// container's width. The face stays upright however far the piece is `rotation`-turned.
export function SketchFigure({ avatar, kind, rotation = 0 }: SketchPiece & { rotation?: number }) {
  const [broken, setBroken] = useState(false);
  const figure = FIGURES[kind];
  return (
    <div className="sketch-figure" style={{ aspectRatio: String(figure.aspectRatio) }}>
      <img className="sketch-figure-image" src={figure.imageUrl} alt="" draggable={false} />
      {avatar && (
        <div
          className="sketch-figure-face"
          style={{
            left: `${figure.face.x * 100}%`,
            top: `${figure.face.y * 100}%`,
            width: `${figure.faceSize * 100}%`,
            // Explicit rather than aspect-ratio, which Safari ignores on absolutely positioned boxes.
            height: `${figure.faceSize * figure.aspectRatio * 100}%`,
            transform: `translate(-50%, -50%) rotate(${-rotation}deg)`,
          }}
        >
          {broken ? (
            <span>{avatarName(avatar)[0]}</span>
          ) : (
            <img src={avatarSrc(avatar)} alt={avatarName(avatar)} draggable={false} onError={() => setBroken(true)} />
          )}
        </div>
      )}
    </div>
  );
}

export function pieceLabel(piece: SketchPiece): string {
  return piece.label ?? (piece.avatar ? avatarName(piece.avatar) : '');
}

// Same figure, turned to how it first goes on the map, in a box that fits it.
export function UprightSketchFigure(piece: SketchPiece) {
  const figure = FIGURES[piece.kind];
  const width = figure.trayWidth;
  const height = width / figure.aspectRatio;
  const sideways = figure.rotation % 180 !== 0;
  return (
    <div className="sketch-upright" style={{ width: sideways ? height : width, height: sideways ? width : height }}>
      <div style={{ width, transform: `translate(-50%, -50%) rotate(${figure.rotation}deg)` }}>
        <SketchFigure {...piece} rotation={figure.rotation} />
      </div>
    </div>
  );
}

interface Figure {
  imageUrl: string;
  aspectRatio: number;
  // Width on the map, as a fraction of the shown area's width. Larger than
  // life, so the faces stay recognizable on a phone.
  mapWidth: number;
  // Width in pixels in the tray.
  trayWidth: number;
  // How it's turned when it comes out of the tray: upright.
  rotation: number;
  // Center of the face, in fractions of the image, and its diameter as a fraction of the image width.
  face: { x: number; y: number };
  faceSize: number;
}

export const FIGURES: Record<SketchPiece['kind'], Figure> = {
  kart: {
    imageUrl: '/images/gokart.png',
    aspectRatio: 615 / 916,
    mapWidth: 0.085,
    trayWidth: 44,
    rotation: 180,
    face: { x: 0.515, y: 0.36 },
    faceSize: 0.62,
  },
  body: {
    imageUrl: '/images/body.png',
    aspectRatio: 706 / 602,
    mapWidth: 0.16,
    trayWidth: 72,
    rotation: 90,
    face: { x: 0.075, y: 0.47 },
    faceSize: 0.2,
  },
};
