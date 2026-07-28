import { useCallback, useEffect, useRef } from 'react';
import {
  DIGITS,
  UNIT_SIZE,
  boxOf,
  cellAt,
  colOf,
  conflictsAt,
  digitsOf,
  getCell,
  rowOf,
} from '@nonet/engine';
import type { Action, CellIndex, Digit, SessionState } from '@nonet/engine';

/**
 * Cells meet edge to edge, so every rule is an inset shadow — a real border
 * would shift the grid by a pixel per cell and the 3x3 boxes would stop lining
 * up. Three things then have to share one `box-shadow`, and the order inside it
 * decides what is visible, because the first shadow paints on top:
 *
 *   selection ring → box rule → hairline
 *
 * The Phase 2 stylesheet expressed the box rules as `:nth-child` selectors and
 * the ring as `[data-selected]`. That put them in competition rather than in
 * sequence, and specificity (0,3,0) against (0,2,0) meant the ring lost on all
 * 32 cells in columns 3 and 6 and rows 3 and 6. Composing the whole stack per
 * cell removes the cascade from the question.
 *
 * Every combination is written out in full because Tailwind generates only the
 * classes it can find in the source — a string built at runtime produces no CSS.
 */
const CELL_SHADOWS = {
  'false-false-false': 'shadow-[var(--border-cell-thin)]',
  'false-false-true': 'shadow-[var(--border-selected-ring),var(--border-cell-thin)]',
  'true-false-false': 'shadow-[inset_2px_0_0_var(--rule),var(--border-cell-thin)]',
  'true-false-true':
    'shadow-[var(--border-selected-ring),inset_2px_0_0_var(--rule),var(--border-cell-thin)]',
  'false-true-false': 'shadow-[inset_0_2px_0_var(--rule),var(--border-cell-thin)]',
  'false-true-true':
    'shadow-[var(--border-selected-ring),inset_0_2px_0_var(--rule),var(--border-cell-thin)]',
  'true-true-false':
    'shadow-[inset_2px_0_0_var(--rule),inset_0_2px_0_var(--rule),var(--border-cell-thin)]',
  'true-true-true':
    'shadow-[var(--border-selected-ring),inset_2px_0_0_var(--rule),inset_0_2px_0_var(--rule),var(--border-cell-thin)]',
} as const;

function cellShadow(boxLeft: boolean, boxTop: boolean, selected: boolean): string {
  return CELL_SHADOWS[`${boxLeft}-${boxTop}-${selected}` as keyof typeof CELL_SHADOWS];
}

/**
 * Cell shading, weakest to strongest, resolved to a single winning class.
 *
 * The stylesheet used to layer four rules and rely on source order for
 * "selection always reads loudest". Tailwind utilities have no source order in
 * JSX, so the precedence is decided here instead — and is now visible rather
 * than implied by where the rules happened to sit in a file.
 */
function cellBackground(wrong: boolean, selected: boolean, matching: boolean, unit: boolean): string {
  if (wrong) return 'bg-error-soft';
  if (selected) return 'bg-cell-sel';
  if (matching) return 'bg-cell-same';
  if (unit) return 'bg-cell-hl';
  return '';
}

/**
 * Focus is drawn inside, because cells meet edge to edge and an outline would
 * be clipped by the neighbour. The ring is ink where selection is cobalt, so
 * the two are never told apart by colour alone.
 *
 * Focused *and* selected stacks both at 2 / 4 / 6px: cobalt innermost, the cell
 * ground as a separator, then the ink ring. The second variant is written as an
 * explicit selector so it outranks the first on specificity — (0,3,0) against
 * (0,2,0) — rather than depending on the order Tailwind happens to emit them in.
 */
const FOCUS_RINGS =
  'focus-visible:outline-none focus-visible:z-[1] ' +
  'focus-visible:shadow-[inset_0_0_0_2px_var(--surface),inset_0_0_0_4px_var(--fg)] ' +
  '[&[data-selected]:focus-visible]:shadow-[inset_0_0_0_2px_var(--accent),inset_0_0_0_4px_var(--cell-sel),inset_0_0_0_6px_var(--fg)]';

export interface BoardProps {
  readonly session: SessionState;
  readonly onAction: (action: Action) => void;
  /**
   * Pause is a board control but not a board rule — the timer lives above this
   * component, so `P` is forwarded rather than handled.
   */
  readonly onPause?: () => void;
  readonly label?: string;
  /**
   * Shading, from Settings.
   *
   * Both default on, matching the stored defaults — a board rendered without
   * them behaves as it always did. These are *display* settings and never touch
   * the session, so turning them off changes what is drawn and nothing about
   * what is true (OPEN-QUESTIONS #2, NONET-24).
   */
  readonly highlightMatching?: boolean;
  readonly highlightUnits?: boolean;
}

const DIGIT_KEYS = new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9']);

/**
 * The 9x9 board.
 *
 * Every rule lives in `@nonet/engine`; this component renders a session and
 * turns input into actions. That split is deliberate — the two rules that are
 * invisible on screen (digit-first mistake containment, and undo never
 * uncounting a mistake) are proven by the engine's tests, and cannot drift by
 * being reimplemented here.
 *
 * The prototype this is built from has no accessibility semantics at all: every
 * control is a `<span onClick>` and the accessibility tree comes back empty.
 * The roles, labels and roving tabindex below are new work, not a port.
 */
export function Board({
  session,
  onAction,
  onPause,
  label = 'Sudoku puzzle',
  highlightMatching = true,
  highlightUnits = true,
}: BoardProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const locked = session.status !== 'playing';

  // The cell that owns the tab stop. Falls back to the first cell so the grid is
  // always reachable, even before anything is selected.
  const focused: CellIndex = session.selected ?? 0;

  const move = useCallback(
    (rowDelta: number, colDelta: number) => {
      const row = Math.min(UNIT_SIZE - 1, Math.max(0, rowOf(focused) + rowDelta));
      const col = Math.min(UNIT_SIZE - 1, Math.max(0, colOf(focused) + colDelta));
      onAction({ type: 'selectCell', cell: cellAt(row, col) });
    },
    [focused, onAction],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const { key, shiftKey, metaKey, ctrlKey } = event;

      if (key === 'ArrowLeft') return void (event.preventDefault(), move(0, -1));
      if (key === 'ArrowRight') return void (event.preventDefault(), move(0, 1));
      if (key === 'ArrowUp') return void (event.preventDefault(), move(-1, 0));
      if (key === 'ArrowDown') return void (event.preventDefault(), move(1, 0));

      if ((metaKey || ctrlKey) && key.toLowerCase() === 'z') {
        event.preventDefault();
        onAction({ type: shiftKey ? 'redo' : 'undo' });
        return;
      }

      if (key === 'p' || key === 'P') {
        event.preventDefault();
        onPause?.();
        return;
      }

      if (key === 'h' || key === 'H') {
        event.preventDefault();
        onAction({ type: 'hint' });
        return;
      }

      if (key === ' ' || key === 'Spacebar') {
        event.preventDefault();
        onAction({ type: 'toggleNotesMode' });
        return;
      }

      if (key === 'Backspace' || key === 'Delete') {
        event.preventDefault();
        onAction({ type: 'erase', cell: focused });
        return;
      }

      if (DIGIT_KEYS.has(key)) {
        event.preventDefault();
        const digit = Number(key) as Digit;
        // Shift writes a pencil mark; the NOTES toggle does the same thing for
        // players who would rather hold a mode than a modifier.
        onAction(
          shiftKey
            ? { type: 'toggleNote', cell: focused, digit }
            : { type: 'placeDigit', cell: focused, digit },
        );
      }
    },
    [focused, move, onAction, onPause],
  );

  /**
   * What a tap does depends on the mode. Cell-first selects and waits for a
   * digit; digit-first applies whatever is loaded — a digit, or the eraser —
   * and keeps it loaded so the next cell takes it too.
   */
  const activate = useCallback(
    (cell: CellIndex) => {
      onAction({ type: 'selectCell', cell });

      if (session.mode !== 'digitFirst') return;

      const loaded = session.loadedDigit;
      if (loaded === null) return;
      if (loaded === 'erase') {
        onAction({ type: 'erase', cell });
        return;
      }

      onAction(
        session.notesMode
          ? { type: 'toggleNote', cell, digit: loaded }
          : { type: 'placeDigit', cell, digit: loaded },
      );
    },
    [onAction, session.loadedDigit, session.mode, session.notesMode],
  );

  // Keep DOM focus with the selection, but only while focus is already inside
  // the grid — otherwise selecting a cell would steal focus from elsewhere.
  useEffect(() => {
    const grid = gridRef.current;
    if (grid === null) return;
    if (!grid.contains(document.activeElement)) return;

    const cell = grid.querySelector<HTMLElement>(`[data-cell="${focused}"]`);
    if (cell !== null && cell !== document.activeElement) cell.focus();
  }, [focused]);

  return (
    <div
      ref={gridRef}
      /* 9 x 80 at 1440, per layout.md. Below that the grid fills its column.
         The grid owns keyboard focus through its cells, never itself.

         `touch-action: manipulation` because cells are 31.6px at 320 and a
         player fills a grid by tapping quickly across neighbouring ones. That
         is indistinguishable from a double tap, and a board that zooms mid
         puzzle costs a pinch to undo. It removes the double-tap zoom gesture
         and nothing else — pinch zoom, and every other way in, are untouched. */
      className="grid aspect-square w-full max-w-[720px] grid-rows-9 bg-surface outline-none [touch-action:manipulation] shadow-[var(--border-cell-box)]"
      role="grid"
      aria-label={label}
      aria-disabled={locked ? true : undefined}
      onKeyDown={handleKeyDown}
    >
      {Array.from({ length: UNIT_SIZE }, (_, row) => (
        <div className="grid grid-cols-9" role="row" key={row}>
          {Array.from({ length: UNIT_SIZE }, (_, col) => (
            <Cell
              key={col}
              cell={cellAt(row, col)}
              session={session}
              isFocused={cellAt(row, col) === focused}
              highlightMatching={highlightMatching}
              highlightUnits={highlightUnits}
              onSelect={() => onAction({ type: 'selectCell', cell: cellAt(row, col) })}
              onActivate={() => activate(cellAt(row, col))}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

interface CellProps {
  readonly cell: CellIndex;
  readonly session: SessionState;
  readonly isFocused: boolean;
  readonly highlightMatching: boolean;
  readonly highlightUnits: boolean;
  readonly onSelect: () => void;
  readonly onActivate: () => void;
}

function Cell({
  cell,
  session,
  isFocused,
  highlightMatching,
  highlightUnits,
  onSelect,
  onActivate,
}: CellProps) {
  const value = getCell(session.grid, cell);
  const given = getCell(session.givens, cell) !== 0;
  const notes = digitsOf(session.notes[cell] ?? 0);
  const row = rowOf(cell);
  const col = colOf(cell);

  // Auto-check flags a wrong digit immediately. With checking off nothing is
  // flagged, so nothing is announced as incorrect either.
  //
  // Only the player's own entries can be wrong. A given that a bad entry
  // happens to clash with is not a mistake and must not be dressed as one —
  // otherwise placing a duplicate paints two cells red and the player has to
  // work out which of them is theirs.
  const wrong = session.checking && !given && value !== 0 && session.solution[cell] !== value;
  const conflicting =
    !given && value !== 0 && conflictsAt(session.grid, cell).length > 0;

  const selected = session.selected === cell;
  const flagged = wrong || conflicting;

  // Selection is not a highlight. Turning the shading off must not take the
  // board's most important affordance with it (DESIGN.md).
  const matching = highlightMatching && matchesSelectedDigit(session, cell);
  const unit = highlightUnits && inSelectedUnit(session, cell);

  const className = [
    'relative grid cursor-pointer place-items-center select-none',
    'type-cell-digit transition-colors duration-(--motion-hover) ease-(--ease-hover)',
    // Givens are the puzzle; player entries are the player's. Weight carries the
    // distinction as well as colour, so it survives without hue.
    given
      ? 'cursor-default font-[number:var(--type-cell-digit-weight)] text-fg'
      : 'font-normal text-accent',
    flagged && 'text-error [text-decoration:var(--border-error-underline)] underline-offset-[0.18em]',
    cellBackground(flagged, selected, matching, unit),
    cellShadow(col % 3 === 0 && col !== 0, row % 3 === 0 && row !== 0, selected),
    FOCUS_RINGS,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={className}
      role="gridcell"
      data-cell={cell}
      data-given={given ? '' : undefined}
      data-selected={selected ? '' : undefined}
      data-hinted={session.hintedCells.includes(cell) ? '' : undefined}
      data-unit={unit ? '' : undefined}
      data-matching={matching ? '' : undefined}
      tabIndex={isFocused ? 0 : -1}
      aria-label={describe(cell, value, given, notes, wrong)}
      aria-readonly={given ? true : undefined}
      aria-invalid={flagged ? true : undefined}
      aria-selected={selected ? true : undefined}
      onClick={onActivate}
      onFocus={onSelect}
    >
      {value !== 0 ? (
        <span className="animate-[place_var(--motion-place)_var(--ease-place)]" data-role="digit">
          {value}
        </span>
      ) : notes.length > 0 ? (
        // A fixed 3x3 so every pencil mark keeps its position as others come
        // and go. The cell's aria-label already reads them out, so this is
        // presentation only.
        <span
          className="type-cell-note grid h-full w-full grid-cols-3 content-center p-[8%] text-center text-fg3-text"
          data-role="notes"
          aria-hidden="true"
        >
          {DIGITS.map((digit) => (
            <span key={digit}>{notes.includes(digit) ? digit : ''}</span>
          ))}
        </span>
      ) : null}
    </div>
  );
}

/**
 * What a screen reader says. Position first, because it is the thing a sighted
 * player reads from the grid at a glance and the thing a blind player otherwise
 * has to count for.
 */
function describe(
  cell: CellIndex,
  value: number,
  given: boolean,
  notes: readonly number[],
  wrong: boolean,
): string {
  const parts = [`Row ${rowOf(cell) + 1}, column ${colOf(cell) + 1}`];

  if (value !== 0) {
    parts.push(String(value));
    if (given) parts.push('given');
    if (wrong) parts.push('incorrect');
  } else if (notes.length > 0) {
    parts.push('empty', `notes ${notes.join(', ')}`);
  } else {
    parts.push('empty');
  }

  return parts.join(', ');
}

/** Row, column and box of the selection — the highlight the design calls for. */
function inSelectedUnit(session: SessionState, cell: CellIndex): boolean {
  const selected = session.selected;
  if (selected === null || selected === cell) return false;
  return (
    rowOf(selected) === rowOf(cell) ||
    colOf(selected) === colOf(cell) ||
    boxOf(selected) === boxOf(cell)
  );
}

/**
 * Cells sharing the selected cell's digit. In digit-first this follows the
 * loaded digit instead — and it highlights only existing instances, never legal
 * placements, which would be auto-candidate assistance (GAME-RULES.md).
 */
function matchesSelectedDigit(session: SessionState, cell: CellIndex): boolean {
  const value = getCell(session.grid, cell);
  if (value === 0) return false;

  if (session.mode === 'digitFirst') return session.loadedDigit === value;

  const selected = session.selected;
  if (selected === null || selected === cell) return false;
  return getCell(session.grid, selected) === value;
}
