import { Point } from './types';

// web/public/images/italy-map.svg is a Mercator crop of Natural Earth data,
// lon 5.8-19.2, lat 36.2-47.4. Positions are fractions of its width and height.
export const ITALY_MAP_URL = '/images/italy-map.svg';
export const ITALY_MAP_ASPECT_RATIO = 0.8881;
// 13.4 degrees of longitude at Perugia's latitude.
export const ITALY_MAP_WIDTH_KM = 1089;

export const PERUGIA: Point = { x: 0.4919, y: 0.4042 };
