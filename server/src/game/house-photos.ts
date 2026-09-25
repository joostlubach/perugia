import { FloorPhoto } from './types';

export const HOUSE_FLOORS = ['Ground floor', '1st floor', '2nd floor'];

// `floor` indexes HOUSE_FLOORS. Neutral filenames, so they don't give the answer away.
export const HOUSE_PHOTOS: FloorPhoto[] = [
  { imageUrl: '/images/floors/1.jpg', floor: 1 },
  { imageUrl: '/images/floors/2.jpg', floor: 0 },
  { imageUrl: '/images/floors/3.jpg', floor: 1 },
  { imageUrl: '/images/floors/4.jpg', floor: 2 },
  { imageUrl: '/images/floors/5.jpg', floor: 2 },
];

export const HOUSE_PHOTO_SEC = 4;
