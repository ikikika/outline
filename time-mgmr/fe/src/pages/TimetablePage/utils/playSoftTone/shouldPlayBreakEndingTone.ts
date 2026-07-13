export const ENDING_TONE_SECONDS = 10;
/** @deprecated Use ENDING_TONE_SECONDS */
export const BREAK_ENDING_TONE_SECONDS = ENDING_TONE_SECONDS;

type EndingToneInput = {
  isRunning: boolean;
  previousRemainingSeconds: number | null;
  remainingSeconds: number;
};

/**
 * True once when a running focus or break crosses into the ending-warning window.
 * Ignores the first sample so a session already under the threshold
 * does not chime immediately.
 */
export function shouldPlayEndingTone({
  isRunning,
  previousRemainingSeconds,
  remainingSeconds,
}: EndingToneInput): boolean {
  if (!isRunning) return false;
  if (previousRemainingSeconds == null) return false;
  return (
    previousRemainingSeconds > ENDING_TONE_SECONDS &&
    remainingSeconds <= ENDING_TONE_SECONDS &&
    remainingSeconds > 0
  );
}

/** @deprecated Use shouldPlayEndingTone */
export function shouldPlayBreakEndingTone({
  isBreak,
  isRunning,
  previousRemainingSeconds,
  remainingSeconds,
}: EndingToneInput & { isBreak: boolean }): boolean {
  if (!isBreak) return false;
  return shouldPlayEndingTone({
    isRunning,
    previousRemainingSeconds,
    remainingSeconds,
  });
}
