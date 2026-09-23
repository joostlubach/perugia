const SOUND_FILES = {
  background: '/audio/tarantella-alt.mp3',
  quizMusic: '/audio/luncheon-kingdom.mp3',
  fidatidime: '/audio/fidatidime.mp3',
  finalLap: '/audio/mario-kart-wii-music-final-lap.mp3',
  died: '/audio/mario-died.mp3',
  coin: '/audio/mario_coin_sound_1.mp3',
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

  // Starts looping music, or keeps it going if it already is.
  loop(key: SoundKey, volume: number) {
    if (muted) return;
    const el = getElement(key);
    el.loop = true;
    el.volume = volume;
    el.play().catch(() => {});
  },

  stop(key: SoundKey) {
    elements.get(key)?.pause();
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
