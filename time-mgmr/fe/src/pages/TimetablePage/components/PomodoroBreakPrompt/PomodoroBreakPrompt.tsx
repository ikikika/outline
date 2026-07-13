import styles from './PomodoroBreakPrompt.module.scss';

interface PomodoroBreakPromptProps {
  focusTitle: string;
  isOpening: boolean;
  onTakeBreak: () => void;
  onContinueWorking: () => void;
}

export function PomodoroBreakPrompt({
  focusTitle,
  isOpening,
  onTakeBreak,
  onContinueWorking,
}: PomodoroBreakPromptProps) {
  return (
    <section
      className={styles.prompt}
      role="alertdialog"
      aria-labelledby="pomodoro-break-title"
      aria-describedby="pomodoro-break-description"
    >
      <p className={styles.eyebrow}>Focus break</p>
      <h2 id="pomodoro-break-title">Time for a short break?</h2>
      <p id="pomodoro-break-description">
        You’ve been focusing on “{focusTitle}” for 25 minutes. Taking a break
        ends this focus session.
      </p>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primary}
          onClick={onTakeBreak}
          disabled={isOpening}
        >
          {isOpening ? 'Starting break…' : 'Take a short break'}
        </button>
        <button
          type="button"
          className={styles.secondary}
          onClick={onContinueWorking}
          disabled={isOpening}
        >
          Continue working
        </button>
      </div>
    </section>
  );
}
