import { Point } from './types';

// Hand-traced centre lines of the scratch marks in web/public/images/bowie-marks.jpg,
// as normalized [0,1] image coordinates. Used only for server-side scoring.
export const BOWIE_MARKS: Point[][] = [
  [{ x: 0.473, y: 0.172 }, { x: 0.475, y: 0.194 }, { x: 0.479, y: 0.225 }, { x: 0.487, y: 0.275 }],
  [{ x: 0.575, y: 0.231 }, { x: 0.55, y: 0.259 }, { x: 0.525, y: 0.278 }],
  [{ x: 0.397, y: 0.353 }, { x: 0.392, y: 0.37 }],
  [{ x: 0.373, y: 0.45 }, { x: 0.396, y: 0.475 }, { x: 0.429, y: 0.491 }, { x: 0.467, y: 0.499 }, { x: 0.5, y: 0.501 }],
  [{ x: 0.373, y: 0.472 }, { x: 0.4, y: 0.503 }, { x: 0.438, y: 0.525 }, { x: 0.479, y: 0.537 }],
  [{ x: 0.521, y: 0.516 }, { x: 0.554, y: 0.531 }, { x: 0.6, y: 0.539 }],
  [{ x: 0.508, y: 0.545 }, { x: 0.537, y: 0.541 }],
  [{ x: 0.375, y: 0.553 }, { x: 0.404, y: 0.566 }, { x: 0.429, y: 0.57 }, { x: 0.458, y: 0.566 }],
  [{ x: 0.537, y: 0.613 }, { x: 0.5, y: 0.637 }, { x: 0.458, y: 0.653 }],
  [{ x: 0.525, y: 0.719 }, { x: 0.554, y: 0.724 }, { x: 0.571, y: 0.722 }],
  [{ x: 0.375, y: 0.856 }, { x: 0.412, y: 0.841 }],
];

// Width / height of both Bowie images.
export const BOWIE_ASPECT_RATIO = 3 / 4;
