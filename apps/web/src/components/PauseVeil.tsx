import { useEffect, useRef } from 'react';
import styles from './PauseVeil.module.css';

export interface PauseVeilProps {
  /** Why the grid is covered. Locked is not resumable; paused is. */
  readonly reason: 'paused' | 'locked';
  readonly onResume?: () => void;
  readonly onRetry?: () => void;
}

/**
 * The veil over the grid.
 *
 * Two jobs, one surface. Pause hides the puzzle so a player can look away
 * without memorising it — which means the grid underneath must be genuinely
 * unreadable, not merely dimmed. A locked board uses the same overlay with an
 * error rule, because the puzzle is over and showing it serves nothing.
 *
 * The grid stays mounted beneath so the board is not rebuilt on resume, but it
 * is hidden from assistive technology by the caller: a veil that a screen
 * reader can read straight through is not a pause.
 */
export function PauseVeil({ reason, onResume, onRetry }: PauseVeilProps) {
  const actionRef = useRef<HTMLButtonElement>(null);

  // Focus lands on the way out, so a keyboard player is not left stranded on a
  // control that is now behind a veil.
  useEffect(() => {
    actionRef.current?.focus();
  }, []);

  const paused = reason === 'paused';

  return (
    <div
      className={styles.veil}
      data-reason={reason}
      role="dialog"
      aria-modal="true"
      aria-label={paused ? 'Paused' : 'Board locked'}
      onKeyDown={(event) => {
        // Esc resumes, matching the dialog convention. A locked board has
        // nothing to resume to, so Esc does nothing there.
        if (event.key === 'Escape' && paused) onResume?.();
      }}
    >
      <p className={styles.kicker}>{paused ? 'Paused' : 'Board locked'}</p>
      <p className={styles.copy}>
        {paused
          ? 'The grid is hidden while you are away.'
          : 'Three mistakes. Start this puzzle again to keep going.'}
      </p>

      <button
        ref={actionRef}
        className={styles.action}
        type="button"
        onClick={paused ? onResume : onRetry}
      >
        {paused ? 'Resume' : 'Try again'}
      </button>
    </div>
  );
}
