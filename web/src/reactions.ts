import { audio } from './audio';
import { ReactionKind } from './types';

export type ReactionPhase = 'lobby' | 'game' | 'final';

// `phases` limits where a reaction is offered; without it, it's always there.
export const REACTIONS: {
  kind: ReactionKind;
  emoji: string;
  label: string;
  callout: string;
  phases?: ReactionPhase[];
}[] = [
  { kind: 'letsgo', emoji: '🏁', label: "Let's go!", callout: "Let's-a go!", phases: ['lobby'] },
  { kind: 'mammamia', emoji: '😱', label: 'Mamma mia!', callout: 'Mamma mia!' },
  { kind: 'mario', emoji: '🍄', label: 'Mario!', callout: "It's-a me, Mario!" },
  { kind: 'losing', emoji: '😭', label: 'Nooo', callout: 'Nooooo!', phases: ['game', 'final'] },
  { kind: 'gibberish', emoji: '🤌', label: 'Blabla', callout: 'Blablabla!' },
  { kind: 'congratulations', emoji: '🎉', label: 'Bravo!', callout: 'Congratulations!', phases: ['final'] },
];

export function reactionInfo(kind: ReactionKind) {
  return REACTIONS.find((r) => r.kind === kind)!;
}

// Several files means one is picked at random each time.
const SOUND_URLS: Record<ReactionKind, string[]> = {
  mammamia: ['/audio/mamma-mia_caQRETK.mp3'],
  mario: ['/audio/its-me-mario.mp3'],
  losing: ['/audio/losing-a-mini-game.mp3'],
  gibberish: ['/audio/gibberish1.mp3', '/audio/gibberish2.mp3'],
  congratulations: ['/audio/mario-congratulations.mp3'],
  letsgo: ['/audio/sm64_mario_lets_go.mp3'],
};

export function playReaction(kind: ReactionKind) {
  if (audio.isMuted()) return;
  const urls = SOUND_URLS[kind];
  new Audio(urls[Math.floor(Math.random() * urls.length)]).play().catch(() => {});
}
