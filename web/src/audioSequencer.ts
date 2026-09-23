import { audio } from './audio';

const bufferCache = new Map<string, Promise<AudioBuffer>>();
let sharedContext: AudioContext | null = null;

function getContext(): AudioContext {
  if (!sharedContext) sharedContext = new AudioContext();
  return sharedContext;
}

function loadBuffer(url: string): Promise<AudioBuffer> {
  let promise = bufferCache.get(url);
  if (!promise) {
    promise = fetch(url)
      .then((res) => res.arrayBuffer())
      .then((data) => getContext().decodeAudioData(data));
    bufferCache.set(url, promise);
  }
  return promise;
}

export interface AudioSequencer {
  // Plays the next slice of the file (per `boundaries`), wrapping back to
  // the start after the last one. No-op (silently) if still preloading.
  playNext(): void;
}

// `boundaries` is a list of timestamps in seconds marking slice edges, e.g.
// [0, 0.6, 1.2, 1.8, 2.4, 3.0] for 5 slices -- edit these by ear to line up
// with the actual words in the recording. Cycles through them one per call
// to playNext() -- e.g. a recording of "pedro pedro pedro pedro PE" sliced
// so each drag plays the next word in the chant.
export function createAudioSequencer(url: string, boundaries: number[]): AudioSequencer {
  getContext(); // start warming up the context as soon as we're constructed
  let buffer: AudioBuffer | null = null;
  loadBuffer(url).then((b) => {
    buffer = b;
  });
  const segmentCount = boundaries.length - 1;
  let index = 0;
  // End time of the last scheduled slice, in the context's clock. Queuing
  // each new slice after this (instead of always "now") means fast dragging
  // queues slices back-to-back instead of overlapping or cutting each other
  // off -- the chant just keeps playing until it catches up to however many
  // have actually been dropped.
  let nextStartTime = 0;

  return {
    playNext() {
      if (!buffer || audio.isMuted() || segmentCount < 1) return;
      const context = getContext();
      if (context.state === 'suspended') context.resume();

      const offset = boundaries[index];
      const duration = boundaries[index + 1] - offset;
      const startTime = Math.max(context.currentTime, nextStartTime);

      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.start(startTime, offset, duration);

      nextStartTime = startTime + duration;
      index = (index + 1) % segmentCount;
    },
  };
}
