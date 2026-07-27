import { MAX_HINTS, MAX_MISTAKES, hintNeedsConfirmation } from '@nonet/engine';
import type { Action, SessionState } from '@nonet/engine';
import styles from './BoardToolbar.module.css';

export interface BoardToolbarProps {
  readonly session: SessionState;
  readonly onAction: (action: Action) => void;
  readonly onPause: () => void;
  /**
   * The first hint per puzzle confirms once — it is irreversible and forfeits
   * the percentile. The toolbar asks the shell to raise that dialog rather than
   * owning it, because the same confirm is reachable from the keyboard.
   */
  readonly onConfirmHint: () => void;
  readonly elapsedMs: number;
}

/** Display caps at 99:59+, so a long session never breaks the layout. */
export function formatTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes > 99) return '99:59+';
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function BoardToolbar({
  session,
  onAction,
  onPause,
  onConfirmHint,
  elapsedMs,
}: BoardToolbarProps) {
  const locked = session.status !== 'playing';
  const hintsLeft = MAX_HINTS - session.hintsUsed;

  const takeHint = () => {
    if (locked || hintsLeft === 0) return;
    // Hints two and three go straight through; the cost is already accepted.
    if (hintNeedsConfirmation(session)) onConfirmHint();
    else onAction({ type: 'hint' });
  };

  return (
    <div className={styles.toolbar}>
      <div className={styles.status}>
        <p className={styles.timer} aria-label={`Elapsed time ${formatTime(elapsedMs)}`}>
          <span aria-hidden="true">{formatTime(elapsedMs)}</span>
        </p>

        {session.checking ? (
          <p
            className={styles.mistakes}
            aria-label={`${session.mistakes} of ${MAX_MISTAKES} mistakes`}
          >
            {Array.from({ length: MAX_MISTAKES }, (_, index) => (
              <span
                key={index}
                className={styles.dot}
                data-spent={index < session.mistakes ? '' : undefined}
                aria-hidden="true"
              />
            ))}
          </p>
        ) : null}
      </div>

      <div className={styles.chips} role="group" aria-label="Board controls">
        <Chip
          label="Notes"
          pressed={session.notesMode}
          disabled={locked}
          onClick={() => onAction({ type: 'toggleNotesMode' })}
        />
        <Chip
          label="Undo"
          disabled={locked || !session.canUndo}
          onClick={() => onAction({ type: 'undo' })}
        />
        <Chip
          label="Redo"
          disabled={locked || !session.canRedo}
          onClick={() => onAction({ type: 'redo' })}
        />
        <Chip
          label="Erase"
          disabled={locked || session.selected === null}
          onClick={() => {
            if (session.selected !== null) onAction({ type: 'erase', cell: session.selected });
          }}
        />
        <Chip
          label="Hint"
          // The count is part of the name, so a screen reader hears what is
          // left without having to find a separate label.
          describedAs={`Hint, ${hintsLeft} of ${MAX_HINTS} left`}
          disabled={locked || hintsLeft === 0}
          onClick={takeHint}
        />
        <Chip label="Pause" disabled={locked} onClick={onPause} />
      </div>
    </div>
  );
}

interface ChipProps {
  readonly label: string;
  readonly describedAs?: string;
  readonly pressed?: boolean;
  readonly disabled?: boolean;
  readonly onClick: () => void;
}

function Chip({ label, describedAs, pressed, disabled = false, onClick }: ChipProps) {
  return (
    <button
      className={styles.chip}
      type="button"
      data-chip={label.toLowerCase()}
      // aria-disabled rather than disabled: a disabled button drops out of the
      // tab order, and a player navigating by keyboard should still be able to
      // reach Hint and hear that none are left.
      aria-disabled={disabled ? true : undefined}
      aria-pressed={pressed}
      aria-label={describedAs}
      onClick={() => {
        if (!disabled) onClick();
      }}
    >
      {label}
    </button>
  );
}
