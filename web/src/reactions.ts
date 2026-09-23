import { audio } from './audio';
import { ReactionKind } from './types';

export const REACTIONS: { kind: ReactionKind; emoji: string; label: string; callout: string }[] = [
  { kind: 'mammamia', emoji: '😱', label: 'Mamma mia!', callout: 'Mamma mia!' },
  { kind: 'mario', emoji: '🍄', label: 'Mario!', callout: 'Mario!' },
  { kind: 'chihuahua', emoji: '🐕', label: 'Woof!', callout: 'Yap yap yap!' },
];

export function reactionInfo(kind: ReactionKind) {
  return REACTIONS.find((r) => r.kind === kind)!;
}

// Drop real recordings here (see web/public/audio/SOURCES.md). Until a file
// exists, a stand-in is used: the browser's Italian voice for the shouts,
// and a synthesized yap for the chihuahua.
const SOUND_URLS: Record<ReactionKind, string> = {
  mammamia: '/audio/reaction-mamma-mia.mp3',
  mario: '/audio/reaction-mario.mp3',
  chihuahua: '/audio/reaction-chihuahua.mp3',
};

// Whether each file is really there, checked once. Vite's dev server answers
// unknown paths with index.html, so look at the content type too.
const available = new Map<ReactionKind, Promise<boolean>>();

function hasFile(kind: ReactionKind): Promise<boolean> {
  let check = available.get(kind);
  if (!check) {
    check = fetch(SOUND_URLS[kind], { method: 'HEAD' })
      .then((res) => res.ok && (res.headers.get('content-type') ?? '').startsWith('audio'))
      .catch(() => false);
    available.set(kind, check);
  }
  return check;
}

export async function playReaction(kind: ReactionKind) {
  if (audio.isMuted()) return;
  if (await hasFile(kind)) {
    new Audio(SOUND_URLS[kind]).play().catch(() => {});
  } else if (kind === 'chihuahua') {
    yap();
  } else {
    speak(kind === 'mammamia' ? 'Mamma mia!' : 'Mario!');
  }
}

function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'it-IT';
  const voice = speechSynthesis.getVoices().find((v) => v.lang.startsWith('it'));
  if (voice) utterance.voice = voice;
  utterance.rate = 1.05;
  utterance.pitch = 1.2;
  speechSynthesis.speak(utterance);
}

let context: AudioContext | null = null;

// Three quick high-pitched barks: a short pitch drop through a nasal filter.
function yap() {
  try {
    context ??= new AudioContext();
    const ctx = context;
    const start = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const at = start + i * 0.17 + Math.random() * 0.03;
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1300 + Math.random() * 200, at);
      osc.frequency.exponentialRampToValueAtTime(700, at + 0.09);
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1800;
      filter.Q.value = 3;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.5, at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.11);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.12);
    }
  } catch {
    // No Web Audio -- stay silent.
  }
}
