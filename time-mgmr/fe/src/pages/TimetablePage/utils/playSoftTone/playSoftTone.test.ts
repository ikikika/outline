import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { playSoftTone } from './playSoftTone';
import {
  BREAK_ENDING_TONE_SECONDS,
  shouldPlayBreakEndingTone,
} from './shouldPlayBreakEndingTone';

describe('shouldPlayBreakEndingTone', () => {
  it('plays when a running break crosses the threshold', () => {
    expect(
      shouldPlayBreakEndingTone({
        isBreak: true,
        isRunning: true,
        previousRemainingSeconds: BREAK_ENDING_TONE_SECONDS + 1,
        remainingSeconds: BREAK_ENDING_TONE_SECONDS,
      })
    ).toBe(true);
  });

  it('does not play for focus blocks', () => {
    expect(
      shouldPlayBreakEndingTone({
        isBreak: false,
        isRunning: true,
        previousRemainingSeconds: 11,
        remainingSeconds: 10,
      })
    ).toBe(false);
  });

  it('does not play when the break is not running', () => {
    expect(
      shouldPlayBreakEndingTone({
        isBreak: true,
        isRunning: false,
        previousRemainingSeconds: 11,
        remainingSeconds: 10,
      })
    ).toBe(false);
  });

  it('does not play on the first remaining sample', () => {
    expect(
      shouldPlayBreakEndingTone({
        isBreak: true,
        isRunning: true,
        previousRemainingSeconds: null,
        remainingSeconds: 10,
      })
    ).toBe(false);
  });

  it('does not replay while still under the threshold', () => {
    expect(
      shouldPlayBreakEndingTone({
        isBreak: true,
        isRunning: true,
        previousRemainingSeconds: 10,
        remainingSeconds: 9,
      })
    ).toBe(false);
  });
});

describe('playSoftTone', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('creates a soft five-note chime and closes the audio context', () => {
    const stop = vi.fn();
    const start = vi.fn();
    const connect = vi.fn();
    const setValueAtTime = vi.fn();
    const linearRampToValueAtTime = vi.fn();
    const exponentialRampToValueAtTime = vi.fn();
    const close = vi.fn().mockResolvedValue(undefined);

    const gainNode = {
      gain: {
        value: 0,
        setValueAtTime,
        linearRampToValueAtTime,
        exponentialRampToValueAtTime,
      },
      connect,
    };
    const oscNode = {
      type: 'sine',
      frequency: { value: 0 },
      connect,
      start,
      stop,
    };

    const ctx = {
      currentTime: 0,
      createGain: vi.fn(() => gainNode),
      createOscillator: vi.fn(() => oscNode),
      destination: {},
      resume: vi.fn().mockResolvedValue(undefined),
      close,
    };

    function AudioContextMock() {
      return ctx;
    }
    vi.stubGlobal('AudioContext', AudioContextMock);
    vi.stubGlobal('window', {
      AudioContext: AudioContextMock,
      webkitAudioContext: undefined,
      setTimeout: window.setTimeout.bind(window),
    });

    playSoftTone({ volume: 0.2 });

    expect(ctx.createOscillator).toHaveBeenCalledTimes(5);
    expect(start).toHaveBeenCalledTimes(5);
    expect(stop).toHaveBeenCalledTimes(5);

    vi.runAllTimers();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('no-ops when AudioContext is unavailable', () => {
    vi.stubGlobal('window', {
      ...window,
      AudioContext: undefined,
      webkitAudioContext: undefined,
    });

    expect(() => playSoftTone()).not.toThrow();
  });
});
