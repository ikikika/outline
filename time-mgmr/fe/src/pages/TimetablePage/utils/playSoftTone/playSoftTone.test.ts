import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { playSoftTone } from './playSoftTone';
import {
  ENDING_TONE_SECONDS,
  shouldPlayEndingTone,
} from './shouldPlayBreakEndingTone';

describe('shouldPlayEndingTone', () => {
  it('plays when a running timer crosses the threshold', () => {
    expect(
      shouldPlayEndingTone({
        isRunning: true,
        previousRemainingSeconds: ENDING_TONE_SECONDS + 1,
        remainingSeconds: ENDING_TONE_SECONDS,
      })
    ).toBe(true);
  });

  it('does not play when the timer is not running', () => {
    expect(
      shouldPlayEndingTone({
        isRunning: false,
        previousRemainingSeconds: 11,
        remainingSeconds: 10,
      })
    ).toBe(false);
  });

  it('does not play on the first remaining sample', () => {
    expect(
      shouldPlayEndingTone({
        isRunning: true,
        previousRemainingSeconds: null,
        remainingSeconds: 10,
      })
    ).toBe(false);
  });

  it('does not replay while still under the threshold', () => {
    expect(
      shouldPlayEndingTone({
        isRunning: true,
        previousRemainingSeconds: 10,
        remainingSeconds: 9,
      })
    ).toBe(false);
  });

  it('does not play after remaining hits zero', () => {
    expect(
      shouldPlayEndingTone({
        isRunning: true,
        previousRemainingSeconds: 1,
        remainingSeconds: 0,
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
