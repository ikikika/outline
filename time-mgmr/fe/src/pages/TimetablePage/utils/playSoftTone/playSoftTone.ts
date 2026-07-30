type SoftToneOptions = {
  /** Peak gain from 0–1. Defaults to a quiet chime. */
  volume?: number;
};

type AudioContextCtor = typeof AudioContext;

function resolveAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const scoped = window as Window & {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return scoped.AudioContext ?? scoped.webkitAudioContext ?? null;
}

/**
 * Plays a soft five-note chime via the Web Audio API.
 * Safe to call from browsers without AudioContext (no-ops).
 */
export function playSoftTone(options: SoftToneOptions = {}): void {
  const Ctor = resolveAudioContextCtor();
  if (!Ctor) return;

  const volume = Math.min(1, Math.max(0, options.volume ?? 0.12));
  const ctx = new Ctor();
  void ctx.resume?.();

  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);

  // Gentle C-major arpeggio: C5 E5 G5 C6 G5
  const notes = [
    { frequency: 523.25, start: 0, duration: 0.45 },
    { frequency: 659.25, start: 0.22, duration: 0.45 },
    { frequency: 783.99, start: 0.44, duration: 0.45 },
    { frequency: 1046.5, start: 0.66, duration: 0.5 },
    { frequency: 783.99, start: 0.92, duration: 0.7 },
  ];

  for (const note of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = note.frequency;

    const startAt = now + note.start;
    const endAt = startAt + note.duration;
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(1, startAt + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, endAt);

    osc.connect(gain);
    gain.connect(master);
    osc.start(startAt);
    osc.stop(endAt + 0.02);
  }

  const closeAtMs = (notes[notes.length - 1].start + notes[notes.length - 1].duration + 0.1) * 1000;
  window.setTimeout(() => {
    void ctx.close().catch(() => undefined);
  }, closeAtMs);
}
