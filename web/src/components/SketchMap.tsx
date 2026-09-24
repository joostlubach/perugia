import { Fragment, PointerEvent, Ref, useEffect, useState } from 'react';
import { MapArea, SketchPiece, SketchPlacement } from '../types';
import { FIGURES, pieceLabel, SketchFigure } from './SketchFigure';

// The map, or the `zoom` part of it, with the pieces placed on it.
// `zoomIn` first fits the whole map inside the box, then zooms into that part. Interactive
// when the pointer handlers are given: pieces can be picked up, and the
// selected one shows a handle to rotate it by.
export function SketchMap({
  mapUrl,
  aspectRatio,
  zoom = WHOLE_MAP,
  zoomIn,
  pieces,
  placements = [],
  large,
  showLabels,
  mapRef,
  selected,
  draggingId,
  onPiecePointerDown,
  onRotatePointerDown,
  onBackgroundPointerDown,
}: {
  mapUrl: string;
  aspectRatio: number;
  zoom?: MapArea;
  zoomIn?: boolean;
  pieces: SketchPiece[];
  placements?: SketchPlacement[];
  large?: boolean;
  // Names under all pieces, rather than just under the selected one.
  showLabels?: boolean;
  mapRef?: Ref<HTMLDivElement>;
  selected?: string | null;
  draggingId?: string | null;
  onPiecePointerDown?: (id: string, e: PointerEvent) => void;
  onRotatePointerDown?: (id: string, e: PointerEvent) => void;
  onBackgroundPointerDown?: () => void;
}) {
  const [zoomed, setZoomed] = useState(!zoomIn);
  useEffect(() => {
    if (zoomed) return;
    const timer = setTimeout(() => setZoomed(true), ZOOM_DELAY_MS);
    return () => clearTimeout(timer);
  }, [zoomed]);

  const shownAspectRatio = (aspectRatio * zoom.width) / zoom.height;

  return (
    <div
      ref={mapRef}
      className={`sketch-map ${large ? 'large' : ''} ${zoomIn ? 'zoom-in' : ''}`}
      style={{
        aspectRatio: String(shownAspectRatio),
        width: large ? `min(100%, calc(64vh * ${shownAspectRatio}))` : '100%',
      }}
      onPointerDown={onBackgroundPointerDown}
    >
      <div className="sketch-map-clip">
        <div
          className="sketch-map-image"
          style={{
            backgroundImage: `url(${mapUrl})`,
            width: `${100 / zoom.width}%`,
            height: `${100 / zoom.height}%`,
            left: `${(-zoom.x / zoom.width) * 100}%`,
            top: `${(-zoom.y / zoom.height) * 100}%`,
            transform: zoomed ? undefined : wholeMapTransform(zoom),
          }}
        />
      </div>

      {placements.map((placement) => {
        const piece = pieces.find((p) => p.id === placement.id);
        if (!piece) return null;
        const isSelected = selected === piece.id;
        const reach = halfHeight(piece.kind, placement.rotation, shownAspectRatio);
        return (
          <Fragment key={piece.id}>
            <div
              className={`sketch-piece ${onPiecePointerDown ? 'draggable' : ''} ${isSelected ? 'selected' : ''} ${
                draggingId === piece.id ? 'dragging' : ''
              }`}
              style={{
                left: `${placement.x * 100}%`,
                top: `${placement.y * 100}%`,
                width: `${FIGURES[piece.kind].mapWidth * 100}%`,
                transform: `translate(-50%, -50%) rotate(${placement.rotation}deg)`,
              }}
              onPointerDown={
                onPiecePointerDown &&
                ((e) => {
                  e.stopPropagation();
                  onPiecePointerDown(piece.id, e);
                })
              }
            >
              <SketchFigure {...piece} rotation={placement.rotation} />
            </div>
            {isSelected && onRotatePointerDown && (
              <div
                className="sketch-rotate-handle"
                style={{ left: `${placement.x * 100}%`, top: `${(placement.y - reach) * 100}%` }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onRotatePointerDown(piece.id, e);
                }}
              >
                ↻
              </div>
            )}
            {(isSelected || showLabels) && (
              <div
                className="sketch-piece-label"
                style={{ left: `${placement.x * 100}%`, top: `${(placement.y + reach) * 100}%` }}
              >
                {pieceLabel(piece)}
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

const WHOLE_MAP: MapArea = { x: 0, y: 0, width: 1, height: 1 };
const ZOOM_DELAY_MS = 600;

// Half of how tall a turned piece is, as a fraction of the shown area's height.
function halfHeight(kind: SketchPiece['kind'], rotation: number, shownAspectRatio: number): number {
  const figure = FIGURES[kind];
  const width = figure.mapWidth;
  const height = width / figure.aspectRatio;
  const angle = (rotation * Math.PI) / 180;
  return ((Math.abs(width * Math.sin(angle)) + Math.abs(height * Math.cos(angle))) / 2) * shownAspectRatio;
}

// Scales the map down and centers it so all of it fits inside the box.
function wholeMapTransform(zoom: MapArea): string {
  const scale = Math.min(zoom.width, zoom.height);
  const x = (zoom.width - scale) / 2 + zoom.x;
  const y = (zoom.height - scale) / 2 + zoom.y;
  return `translate(${x * 100}%, ${y * 100}%) scale(${scale})`;
}
