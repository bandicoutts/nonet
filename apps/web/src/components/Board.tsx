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
import styles from './Board.module.css';

export interface BoardProps {
  readonly session: SessionState;
  readonly onAction: (action: Action) => void;
  /**
   * Pause is a board control but not a board rule — the timer lives above this
   * component, so `P` is forwarded rather than handled.
   */
  readonly onPause?: () => void;
  readonly label?: string;
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
export function Board({ session, onAction, onPause, label = 'Sudoku puzzle' }: BoardProps) {
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
      className={styles.grid}
      role="grid"
      aria-label={label}
      aria-disabled={locked ? true : undefined}
      onKeyDown={handleKeyDown}
    >
      {Array.from({ length: UNIT_SIZE }, (_, row) => (
        <div className={styles.row} role="row" key={row}>
          {Array.from({ length: UNIT_SIZE }, (_, col) => (
            <Cell
              key={col}
              cell={cellAt(row, col)}
              session={session}
              isFocused={cellAt(row, col) === focused}
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
  readonly onSelect: () => void;
  readonly onActivate: () => void;
}

function Cell({ cell, session, isFocused, onSelect, onActivate }: CellProps) {
  const value = getCell(session.grid, cell);
  const given = getCell(session.givens, cell) !== 0;
  const notes = digitsOf(session.notes[cell] ?? 0);

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

  return (
    <div
      className={styles.cell}
      role="gridcell"
      data-cell={cell}
      data-given={given ? '' : undefined}
      data-selected={session.selected === cell ? '' : undefined}
      data-hinted={session.hintedCells.includes(cell) ? '' : undefined}
      data-unit={inSelectedUnit(session, cell) ? '' : undefined}
      data-matching={matchesSelectedDigit(session, cell) ? '' : undefined}
      tabIndex={isFocused ? 0 : -1}
      aria-label={describe(cell, value, given, notes, wrong)}
      aria-readonly={given ? true : undefined}
      aria-invalid={wrong || conflicting ? true : undefined}
      aria-selected={session.selected === cell ? true : undefined}
      onClick={onActivate}
      onFocus={onSelect}
    >
      {value !== 0 ? (
        <span className={styles.digit} data-role="digit">
          {value}
        </span>
      ) : notes.length > 0 ? (
        // A fixed 3x3 so every pencil mark keeps its position as others come
        // and go. The cell's aria-label already reads them out, so this is
        // presentation only.
        <span className={styles.notes} data-role="notes" aria-hidden="true">
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
