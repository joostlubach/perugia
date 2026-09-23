import { MapPin } from './types';

// How everyone got from Amsterdam to Perugia, shown on
// web/public/images/travel-map.svg (a Mercator crop of Natural Earth data,
// lon 3.0-14.6, lat 42.4-53.1). Pin positions are fractions of the map's
// width and height, projected the same way.
export const TRAVEL_MAP_URL = '/images/travel-map.svg';
export const TRAVEL_MAP_ASPECT_RATIO = 0.7252;

export const TRAVEL_LANDMARKS: MapPin[] = [
  { label: 'Amsterdam', icon: '🏠', x: 0.164, y: 0.075, side: 'right' },
  { label: 'Perugia', icon: '🏁', x: 0.809, y: 0.94, side: 'right' },
];

export const TRAVEL_STOPS: MapPin[] = [
  { label: 'Interrail', icon: '🚆', x: 0.478, y: 0.561, side: 'left' },
  { label: "Ruben's car", icon: '🚗', x: 0.409, y: 0.448, side: 'right' },
  { label: "Bas' car", icon: '🚗', x: 0.734, y: 0.595, side: 'right' },
  { label: "Izzie's car", icon: '🚗', x: 0.27, y: 0.35, side: 'left' },
  { label: 'Airplane', icon: '✈️', x: 0.712, y: 0.883, side: 'left' },
];

// Same order as TRAVEL_STOPS.
export const TRAVEL_CORRECT_GROUPS: string[][] = [
  ['kyle', 'joost'],
  ['ruben', 'jaro', 'mark', 'dex'],
  ['bas', 'jasper', 'sanne', 'riemer'],
  ['ismail'],
  ['bowie', 'roland', 'milan', 'gokhan', 'sally'],
];
