import { audio } from './audio';
import { ReactionKind } from './types';
import { t } from './texts';

export type ReactionPhase = 'lobby' | 'game' | 'final';

// `phases` limits where a reaction is offered; without it, it's always there.
export const REACTIONS: {
  kind: ReactionKind;
  emoji: string;
  label: string;
  callout: string;
  phases?: ReactionPhase[];
}[] = [
  reaction('letsgo', '🏁', ['lobby']),
  reaction('mammamia', '😱'),
  reaction('mario', '🍄'),
  reaction('losing', '😭', ['game', 'final']),
  reaction('gibberish', '🤌'),
  reaction('congratulations', '🎉', ['final']),
];

export function reactionInfo(kind: ReactionKind) {
  return REACTIONS.find((r) => r.kind === kind)!;
}

// Label and callout wording lives in texts.yaml under `reactions`.
function reaction(kind: ReactionKind, emoji: string, phases?: ReactionPhase[]) {
  return { kind, emoji, label: t(`reactions.${kind}.label`), callout: t(`reactions.${kind}.callout`), phases };
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
