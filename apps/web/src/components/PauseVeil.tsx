import { useEffect, useRef } from 'react';
/**
 * layout.md gives the veil as -2 at 1440/834 and 18 left/right at 390 — but
 * that 18 is measured from the page, and at 390 the grid area already carries
 * 18px of horizontal padding. Against the grid itself the veil is flush at
 * every width. Insetting it by 18 here would leave the outer columns of the
 * puzzle on show, which defeats the point of pausing.
 */
const VEIL =
  'absolute -inset-[2px] z-[35] flex flex-col items-center justify-center gap-s p-l text-center bg-veil';

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
      className={`${VEIL} ${paused ? 'border-(--border-rule)' : 'border-2 border-error'}`}
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
      <p className={`type-kicker m-0 ${paused ? 'text-fg3-text' : 'text-error'}`}>{paused ? 'Paused' : 'Board locked'}</p>
      <p className="type-body m-0 max-w-[34ch] text-fg2">
        {paused
          ? 'The grid is hidden while you are away.'
          : 'Three mistakes. Start this puzzle again to keep going.'}
      </p>

      <button
        ref={actionRef}
        className={
          'min-h-[48px] cursor-pointer border-0 px-l bg-fg text-bg type-button ' +
          'transition-colors duration-(--motion-hover) ease-(--ease-hover) ' +
          'hover:bg-accent hover:text-accent-ink ' +
          'focus-visible:outline-(--border-focus-ring) focus-visible:outline-offset-(--focus-offset-prominent)'
        }
        type="button"
        onClick={paused ? onResume : onRetry}
      >
        {paused ? 'Resume' : 'Try again'}
      </button>
    </div>
  );
}
