import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  CELL_COUNT,
  DIGITS,
  UNIT_SIZE,
  boxOf,
  cellAt,
  colOf,
  digitsOf,
  getCell,
  hasConflictAt,
  rowOf,
} from '@nonet/engine';
import type { Action, CandidateMask, CellIndex, Digit, SessionState } from '@nonet/engine';

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

  /*
   * The three highlight layers, derived once per change instead of 81 times per
   * render.
   *
   * Each cell used to answer these for itself, which meant `conflictsAt` — an
   * array allocation and a sort — ran 81 times to produce 81 booleans, and the
   * row/column/box test ran 81 times against a selection that had not moved.
   * The work is the same work; it is just done once and looked up.
   *
   * The dependency lists are the point. `conflicting` depends on the grid and
   * nothing else, so selecting a cell does not recompute it; `matching` and
   * `unit` depend on the selection but not on the grid's contents beyond the
   * digits they read. Getting these wrong shows up as stale highlighting, which
   * is why each is keyed on exactly what it reads.
   */
  const conflicting = useMemo(() => {
    const flagged = new Set<CellIndex>();
    for (let cell = 0; cell < CELL_COUNT; cell += 1) {
      // Only the player's own entries can be wrong. A given that a bad entry
      // clashes with is not a mistake and must not be dressed as one.
      if (getCell(session.givens, cell) !== 0) continue;
      if (hasConflictAt(session.grid, cell)) flagged.add(cell);
    }
    return flagged;
  }, [session.givens, session.grid]);

  /*
   * Cells sharing the selected cell's digit — or in digit-first, the loaded
   * one. Existing instances only, never legal placements, which would be
   * auto-candidate assistance (GAME-RULES.md).
   *
   * Empty when the setting is off, so the gate costs one comparison per cell
   * rather than a lookup that has to be second-guessed at the call site.
   */
  const matching = useMemo(() => {
    const found = new Set<CellIndex>();
    if (!highlightMatching) return found;

    const target =
      session.mode === 'digitFirst'
        ? session.loadedDigit === 'erase' || session.loadedDigit === null
          ? 0
          : session.loadedDigit
        : session.selected === null
          ? 0
          : getCell(session.grid, session.selected);

    if (target === 0) return found;

    for (let cell = 0; cell < CELL_COUNT; cell += 1) {
      // In cell-first the selected cell is not "matching" itself — it is
      // selected, which reads louder anyway.
      if (session.mode !== 'digitFirst' && cell === session.selected) continue;
      if (getCell(session.grid, cell) === target) found.add(cell);
    }
    return found;
  }, [
    highlightMatching,
    session.grid,
    session.loadedDigit,
    session.mode,
    session.selected,
  ]);

  /** Row, column and box of the selection — the highlight the design calls for. */
  const inUnit = useMemo(() => {
    const found = new Set<CellIndex>();
    const selected = session.selected;
    if (!highlightUnits || selected === null) return found;

    for (let cell = 0; cell < CELL_COUNT; cell += 1) {
      if (cell === selected) continue;
      if (
        rowOf(selected) === rowOf(cell) ||
        colOf(selected) === colOf(cell) ||
        boxOf(selected) === boxOf(cell)
      ) {
        found.add(cell);
      }
    }
    return found;
  }, [highlightUnits, session.selected]);

  const hinted = useMemo(() => new Set(session.hintedCells), [session.hintedCells]);

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

  /*
   * The session, for the handlers.
   *
   * `activate` needs the mode, the loaded digit and the notes toggle, but it
   * needs them *when it fires* — not when it is defined. Listing them as
   * dependencies would mint a new function every time any of them changed, and
   * since the handler is a prop on all 81 cells, a new identity defeats the
   * memo on every one of them. Reading through a ref inside the event keeps the
   * behaviour identical and the identity stable for the life of the board.
   */
  const latest = useRef(session);
  latest.current = session;

  /**
   * What a tap does depends on the mode. Cell-first selects and waits for a
   * digit; digit-first applies whatever is loaded — a digit, or the eraser —
   * and keeps it loaded so the next cell takes it too.
   */
  const activate = useCallback(
    (cell: CellIndex) => {
      const session = latest.current;
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
    [onAction],
  );

  /** Focus selects. Stable, for the same reason as `activate`. */
  const select = useCallback(
    (cell: CellIndex) => onAction({ type: 'selectCell', cell }),
    [onAction],
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
          {Array.from({ length: UNIT_SIZE }, (_, col) => {
            const cell = cellAt(row, col);
            const value = getCell(session.grid, cell);
            const given = getCell(session.givens, cell) !== 0;

            /*
             * Auto-check flags a wrong digit immediately. With checking off
             * nothing is flagged, so nothing is announced as incorrect either.
             *
             * `wrong` and `conflicting` are separate props because they are
             * separate facts: both paint the cell, but only `wrong` is
             * announced as incorrect to a screen reader.
             */
            const wrong =
              session.checking && !given && value !== 0 && session.solution[cell] !== value;

            return (
              <Cell
                key={col}
                cell={cell}
                value={value}
                given={given}
                notes={session.notes[cell] ?? 0}
                selected={session.selected === cell}
                matching={matching.has(cell)}
                inUnit={inUnit.has(cell)}
                hinted={hinted.has(cell)}
                wrong={wrong}
                flagged={wrong || conflicting.has(cell)}
                isFocused={cell === focused}
                onSelect={select}
                onActivate={activate}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

interface CellProps {
  readonly cell: CellIndex;
  readonly value: number;
  readonly given: boolean;
  /** The raw mask, not the digits: a number compares by value, an array does not. */
  readonly notes: CandidateMask;
  readonly selected: boolean;
  readonly matching: boolean;
  readonly inUnit: boolean;
  readonly hinted: boolean;
  /** Wrong against the solution. Only this is announced as incorrect. */
  readonly wrong: boolean;
  /** Wrong *or* clashing with a peer — both paint the cell. */
  readonly flagged: boolean;
  readonly isFocused: boolean;
  readonly onSelect: (cell: CellIndex) => void;
  readonly onActivate: (cell: CellIndex) => void;
}

/**
 * One cell.
 *
 * **Memoised, and the props are why it works.** It used to take the whole
 * `SessionState` plus two closures built fresh in the parent's render, so every
 * prop changed identity on every render and a memo would have compared eleven
 * things to conclude nothing. Scalars and stable handlers mean the comparison
 * is cheap and usually true, so entering a digit re-renders the handful of
 * cells whose appearance actually changed rather than all 81.
 *
 * Everything here is now *given* to the cell. It derives nothing about the
 * board, which is what keeps 81 of these off the highlight logic.
 */
const Cell = memo(function Cell({
  cell,
  value,
  given,
  notes: mask,
  selected,
  matching,
  inUnit,
  hinted,
  wrong,
  flagged,
  isFocused,
  onSelect,
  onActivate,
}: CellProps) {
  const notes = digitsOf(mask);
  const row = rowOf(cell);
  const col = colOf(cell);

  const className = [
    'relative grid cursor-pointer place-items-center select-none',
    'type-cell-digit transition-colors duration-(--motion-hover) ease-(--ease-hover)',
    // Givens are the puzzle; player entries are the player's. Weight carries the
    // distinction as well as colour, so it survives without hue.
    given
      ? 'cursor-default font-[number:var(--type-cell-digit-weight)] text-fg'
      : 'font-normal text-accent',
    flagged && 'text-error [text-decoration:var(--border-error-underline)] underline-offset-[0.18em]',
    cellBackground(flagged, selected, matching, inUnit),
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
      data-hinted={hinted ? '' : undefined}
      data-unit={inUnit ? '' : undefined}
      data-matching={matching ? '' : undefined}
      tabIndex={isFocused ? 0 : -1}
      aria-label={describe(cell, value, given, notes, wrong)}
      aria-readonly={given ? true : undefined}
      aria-invalid={flagged ? true : undefined}
      aria-selected={selected ? true : undefined}
      // The handlers are shared by all 81 cells, so the cell names itself
      // rather than each cell carrying a closure that knows which it is.
      onClick={() => onActivate(cell)}
      onFocus={() => onSelect(cell)}
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
});

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
