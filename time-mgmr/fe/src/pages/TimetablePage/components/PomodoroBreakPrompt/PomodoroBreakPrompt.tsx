import styles from './PomodoroBreakPrompt.module.scss';

interface PomodoroBreakPromptProps {
  focusTitle: string;
  breakTitle: string;
  isOpening: boolean;
  onOpenBreak: () => void;
  onContinueWorking: () => void;
}

export function PomodoroBreakPrompt({
  focusTitle,
  breakTitle,
  isOpening,
  onOpenBreak,
  onContinueWorking,
}: PomodoroBreakPromptProps) {
  return (
    <section
      className={styles.prompt}
      role="alertdialog"
      aria-labelledby="pomodoro-break-title"
      aria-describedby="pomodoro-break-description"
    >
      <p className={styles.eyebrow}>Pomodoro break prompt</p>
      <h2 id="pomodoro-break-title">Ready for a {breakTitle.toLowerCase()}?</h2>
      <p id="pomodoro-break-description">
        The planned focus period for “{focusTitle}” has ended.
      </p>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primary}
          onClick={onOpenBreak}
          disabled={isOpening}
        >
          {isOpening ? 'Opening…' : 'Open break'}
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
