import { Category } from './types';

// Each category gets a splash screen on the big screen before its first
// question. Without an image or video, the splash shows the emoji instead.
export const CATEGORIES = {
  stay: { title: 'Our stay', emoji: '🏡', imageUrl: '/images/aureli.jpg' },
  house: { title: 'Activities at the house', emoji: '🤸', imageUrl: '/images/pool.jpg' },
  food: { title: 'Food & drink', emoji: '🍝', imageUrl: '/images/wine.jpg' },
  trivia: { title: 'General trivia', emoji: '🧠', imageUrl: '/images/italy.jpg' },
  music: { title: 'Music round', emoji: '🎶', videoUrl: '/images/dance.mp4' },
  trips: { title: 'Day trips & activities', emoji: '🚗', imageUrl: '/images/karten.jpg' },
  finances: { title: 'Finances', emoji: '💶' },
} satisfies Record<string, Category>;

export type CategoryKey = keyof typeof CATEGORIES;
