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
  reaction('mario', '🍄', ['lobby']),
  // No Luigi emoji, so his green it is.
  reaction('luigi', '💚', ['game', 'final']),
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

// Several files are taken in turn, so the same one never plays twice in a row.
const SOUND_URLS: Record<ReactionKind, string[]> = {
  mammamia: ['/audio/mamma-mia_caQRETK.mp3'],
  mario: ['/audio/its-me-mario.mp3'],
  losing: ['/audio/losing-a-mini-game.mp3'],
  gibberish: ['/audio/gibberish1.mp3', '/audio/gibberish2.mp3'],
  congratulations: ['/audio/mario-congratulations.mp3'],
  letsgo: ['/audio/sm64_mario_lets_go.mp3'],
  luigi: ['/audio/luigi-ho-hoh.mp3', '/audio/oaaahhhhhhoohh.mp3'],
};

export function playReaction(kind: ReactionKind) {
  if (audio.isMuted()) return;
  const urls = SOUND_URLS[kind];
  const turn = turns.get(kind) ?? 0;
  turns.set(kind, turn + 1);
  const el = soundElement(urls[turn % urls.length]);
  // Still playing for an earlier reaction: overlap with a copy rather than cut it off.
  const player = el.paused || el.ended ? el : (el.cloneNode() as HTMLAudioElement);
  player.currentTime = 0;
  player.play().catch(() => {});
}

// Called when the big screen opens, so reactions sound the moment they come in.
export function preloadReactionSounds() {
  Object.values(SOUND_URLS).flat().forEach(soundElement);
}

const turns = new Map<ReactionKind, number>();
const elements = new Map<string, HTMLAudioElement>();

function soundElement(url: string): HTMLAudioElement {
  let el = elements.get(url);
  if (!el) {
    el = new Audio(url);
    el.preload = 'auto';
    elements.set(url, el);
  }
  return el;
}
