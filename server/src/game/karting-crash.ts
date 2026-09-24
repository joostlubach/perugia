import { KARTING_WINNER_GROUP } from './karting';
import { MapArea, SketchPiece, SketchPlacement } from './types';

export const KARTING_CRASH_MAP_URL = '/images/arcobaleno.jpeg';
export const KARTING_CRASH_MAP_ASPECT_RATIO = 848 / 1234;

// The track, from the Le Cesi looping down to the slalom run.
export const KARTING_CRASH_ZOOM: MapArea = { x: 0.397, y: 0.152, width: 0.556, height: 0.348 };

// Everyone from the winner group in a kart, except Bas: he ended up on the
// ground, next to his empty kart.
export const KARTING_CRASH_PIECES: SketchPiece[] = [
  ...KARTING_WINNER_GROUP.filter((avatar) => avatar !== 'bas').map(
    (avatar): SketchPiece => ({ id: avatar, kind: 'kart', avatar }),
  ),
  // The only body, so it needs no face.
  { id: 'bas', kind: 'body', label: 'Bas' },
  { id: 'bas-kart', kind: 'kart', label: "Bas' kart" },
];

// Traced from a satellite photo onto the zoomed-in part of the map. Rotations
// are only for the reveal: karts face the way they were driving (0 = down,
// clockwise), through the looping and back along the straight.
export const KARTING_CRASH_CORRECT_PLACEMENTS: SketchPlacement[] = [
  { id: 'dex', x: 0.678, y: 0.286, rotation: 270 },
  { id: 'sanne', x: 0.784, y: 0.354, rotation: 315 },
  { id: 'pietro', x: 0.842, y: 0.361, rotation: 345 },
  { id: 'leonardo', x: 0.834, y: 0.427, rotation: 30 },
  { id: 'bas', x: 0.759, y: 0.427, rotation: 60 },
  { id: 'sally', x: 0.590, y: 0.533, rotation: 90 },
  { id: 'ruben', x: 0.669, y: 0.587, rotation: 110 },
  { id: 'milan', x: 0.505, y: 0.781, rotation: 270 },
  { id: 'bas-kart', x: 0.723, y: 0.699, rotation: 350 },
];
