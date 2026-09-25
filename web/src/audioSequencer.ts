import { audio, audioContext } from './audio';

const bufferCache = new Map<string, Promise<AudioBuffer>>();

function loadBuffer(url: string): Promise<AudioBuffer> {
  let promise = bufferCache.get(url);
  if (!promise) {
    promise = fetch(url)
      .then((res) => res.arrayBuffer())
      .then((data) => audioContext().decodeAudioData(data));
    bufferCache.set(url, promise);
  }
  return promise;
}

// Fetches and decodes a file ahead of time, so its first play is instant.
export function preloadAudio(url: string) {
  loadBuffer(url).catch(() => {});
}

// iOS only lets an AudioContext start inside certain gestures (touchend and
// click, not pointerdown), and suspends it again when the phone locks or the
// tab goes to the background. So on every such gesture, wake it if needed --
// a drag's own touchend then also wakes it, playing the drop that was queued.
export function keepAudioUnlocked() {
  const unlock = () => {
    const context = audioContext();
    if (context.state === 'running') return;
    const source = context.createBufferSource();
    source.buffer = context.createBuffer(1, 1, 22050);
    source.connect(context.destination);
    source.start();
  };
  for (const type of ['touchend', 'click', 'keydown']) {
    window.addEventListener(type, unlock, { capture: true });
  }
}

export interface AudioSequencer {
  // Plays the next slice of the file (per `boundaries`), wrapping back to
  // the start after the last one. No-op (silently) if still preloading.
  playNext(): void;
  // Cuts off whatever is playing or queued.
  stop(): void;
}

// `boundaries` is a list of timestamps in seconds marking slice edges, e.g.
// [0, 0.6, 1.2, 1.8, 2.4, 3.0] for 5 slices -- edit these by ear to line up
// with the actual words in the recording. Cycles through them one per call
// to playNext() -- e.g. a recording of "pedro pedro pedro pedro PE" sliced
// so each drag plays the next word in the chant.
export function createAudioSequencer(url: string, boundaries: number[]): AudioSequencer {
  audioContext(); // start warming up the context as soon as we're constructed
  let buffer: AudioBuffer | null = null;
  // Plays requested before the file finished loading, caught up once it has.
  let pending = 0;
  loadBuffer(url).then((b) => {
    buffer = b;
    for (; pending > 0; pending--) sequencer.playNext();
  });
  const segmentCount = boundaries.length - 1;
  let index = 0;
  // End time of the last scheduled slice, in the context's clock. Queuing
  // each new slice after this (instead of always "now") means fast dragging
  // queues slices back-to-back instead of overlapping or cutting each other
  // off -- the chant just keeps playing until it catches up to however many
  // have actually been dropped.
  let nextStartTime = 0;
  let sources: AudioBufferSourceNode[] = [];

  const sequencer: AudioSequencer = {
    playNext() {
      if (audio.isMuted() || segmentCount < 1) return;
      if (!buffer) {
        pending++;
        return;
      }
      const context = audioContext();

      const offset = boundaries[index];
      const duration = boundaries[index + 1] - offset;
      const startTime = Math.max(context.currentTime, nextStartTime);

      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.start(startTime, offset, duration);
      sources.push(source);
      source.onended = () => {
        sources = sources.filter((s) => s !== source);
      };

      nextStartTime = startTime + duration;
      index = (index + 1) % segmentCount;
    },

    stop() {
      for (const source of sources) source.stop();
      sources = [];
      pending = 0;
      nextStartTime = 0;
    },
  };
  return sequencer;
}
