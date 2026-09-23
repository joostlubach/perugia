const SOUND_FILES = {
  background: '/audio/background-tarantella.mp3',
  correct: '/audio/correct.mp3',
  reveal: '/audio/reveal.mp3',
  victory: '/audio/victory.mp3',
  funny: '/audio/funny-sting.mp3',
  pedro: '/audio/pedro.mp3',
  fidatidime: '/audio/fidatidime.mp3',
} as const;

export type SoundKey = keyof typeof SOUND_FILES;

const elements = new Map<SoundKey, HTMLAudioElement>();
let muted = localStorage.getItem('perugia_muted') === 'true';

function getElement(key: SoundKey): HTMLAudioElement {
  let el = elements.get(key);
  if (!el) {
    el = new Audio(SOUND_FILES[key]);
    elements.set(key, el);
  }
  return el;
}

export const audio = {
  play(key: SoundKey) {
    if (muted) return;
    const el = getElement(key);
    el.loop = false;
    el.currentTime = 0;
    el.play().catch(() => {
      // Autoplay can be blocked, or the file may be missing — fail silently.
    });
  },

  // Fires a fresh, independent instance so rapid repeats (e.g. dragging many
  // tokens in quick succession) overlap instead of cutting each other off.
  playOverlapping(key: SoundKey) {
    if (muted) return;
    new Audio(SOUND_FILES[key]).play().catch(() => {});
  },

  loopBackground() {
    if (muted) return;
    const el = getElement('background');
    el.loop = true;
    el.volume = 0.5;
    el.play().catch(() => {});
  },

  stopBackground() {
    const el = elements.get('background');
    if (el) el.pause();
  },

  isMuted() {
    return muted;
  },

  setMuted(value: boolean) {
    muted = value;
    localStorage.setItem('perugia_muted', String(value));
    if (value) {
      elements.forEach((el) => el.pause());
    }
  },

  toggleMuted() {
    audio.setMuted(!muted);
    return muted;
  },
};
