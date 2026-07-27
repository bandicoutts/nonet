import { MAX_HINTS, MAX_MISTAKES, hintNeedsConfirmation } from '@nonet/engine';
import type { Action, SessionState } from '@nonet/engine';
/**
 * Six chips below 1100, five at mobile (Erase lives on the pad there), and a
 * paired Undo/Redo row in the desktop rail — where every other chip spans the
 * full width. layout.md.
 */
const CHIPS =
  'grid grid-cols-5 gap-2xs drawer:grid-cols-6 drawer:gap-xs rail:grid-cols-2 rail:gap-2xs';

const CHIP =
  'min-h-[50px] cursor-pointer border border-line bg-transparent px-3xs ' +
  'drawer:min-h-[46px] drawer:px-sm ' +
  'type-control text-fg2 ' +
  'transition-colors duration-(--motion-hover) ease-(--ease-hover) ' +
  'focus-visible:outline-(--border-focus-ring) focus-visible:outline-offset-(--focus-offset) ' +
  'aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-accent-ink ' +
  // Disabled is a dashed border first and reduced contrast second. The dash is
  // the non-colour cue, which is what lets --fg3 sit here at all (NONET-5).
  'aria-disabled:cursor-default aria-disabled:border-(--border-dashed-line) aria-disabled:text-fg3 aria-disabled:opacity-[0.62]';

/** In the rail everything but Undo and Redo spans both columns. */
const CHIP_FULL_WIDTH = 'rail:col-span-2';

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
    <div className="flex flex-col gap-sm">
      <div className="flex items-baseline justify-between gap-s">
        <p className="type-timer m-0 text-fg" aria-label={`Elapsed time ${formatTime(elapsedMs)}`}>
          <span aria-hidden="true">{formatTime(elapsedMs)}</span>
        </p>

        {session.checking ? (
          <p
            className="m-0 flex gap-[5px]"
            aria-label={`${session.mistakes} of ${MAX_MISTAKES} mistakes`}
          >
            {Array.from({ length: MAX_MISTAKES }, (_, index) => (
              <span
                key={index}
                className={`size-[9px] border ${
                  index < session.mistakes
                    ? // Spent lives are filled, not merely recoloured.
                      'border-error bg-error'
                    : 'border-fg3-text'
                }`}
                data-spent={index < session.mistakes ? '' : undefined}
                aria-hidden="true"
              />
            ))}
          </p>
        ) : null}
      </div>

      <div className={CHIPS} role="group" aria-label="Board controls">
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
  const chip = label.toLowerCase();
  return (
    <button
      className={`${CHIP} ${chip === 'undo' || chip === 'redo' ? '' : CHIP_FULL_WIDTH} ${
        // Erase lives on the pad below the drawer breakpoint, so the toolbar
        // drops to five chips there. `hidden` also takes it out of the
        // accessibility tree, so exactly one Erase is ever exposed.
        chip === 'erase' ? 'hidden drawer:block' : ''
      }`}
      type="button"
      data-chip={chip}
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
