export const BREAK_ENDING_TONE_SECONDS = 10;

type BreakEndingToneInput = {
  isBreak: boolean;
  isRunning: boolean;
  previousRemainingSeconds: number | null;
  remainingSeconds: number;
};

/**
 * True once when a running break crosses into the ending-warning window.
 * Ignores the first sample so a break started already under the threshold
 * does not chime immediately.
 */
export function shouldPlayBreakEndingTone({
  isBreak,
  isRunning,
  previousRemainingSeconds,
  remainingSeconds,
}: BreakEndingToneInput): boolean {
  if (!isBreak || !isRunning) return false;
  if (previousRemainingSeconds == null) return false;
  return (
    previousRemainingSeconds > BREAK_ENDING_TONE_SECONDS &&
    remainingSeconds <= BREAK_ENDING_TONE_SECONDS &&
    remainingSeconds > 0
  );
}
