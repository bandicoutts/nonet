import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CELL_COUNT, DIGITS, UNIT_SIZE, getCell } from '@nonet/engine';
import type { Action, Digit, SessionState } from '@nonet/engine';

/**
 * How long a press has to last before it arms as a note.
 *
 * 340ms, from `design/export/components.md`. The gesture takes a pencil mark
 * from four taps to two (GAME-RULES.md), and the spec is explicit that
 * **arming is a visible step, not silent**: the key shows it is held as soon as
 * the press begins, then changes again when it arms, so a player can tell
 * whether letting go will place a digit or pencil one.
 *
 * Exported for the tests; no other module imports it.
 */
export const HOLD_MS = 340;

/**
 * Tablet is nine across, desktop three (it lives in a 320px rail), mobile five
 * over two rows with ERASE filling the tenth slot. layout.md.
 */
/*
 * `touch-action: manipulation` for the same reason as the grid: repeated taps
 * on one key are how a digit-first player fills a board, and the browser is
 * entitled to read them as a double tap and zoom. It suppresses that gesture
 * only — pinch zoom still works, and the viewport is left alone.
 */
const PAD =
  'grid w-full grid-cols-5 gap-2xs drawer:grid-cols-9 drawer:gap-xs rail:grid-cols-3 ' +
  '[touch-action:manipulation]';

/** 58 / 66 / 60 at 390 / 834 / 1440, per layout.md. */
const KEY_BASE =
  'relative grid min-h-[58px] cursor-pointer place-items-center gap-[2px] py-2xs ' +
  'drawer:min-h-[66px] rail:min-h-[60px] ' +
  'type-stat-number font-semibold ' +
  'border border-line bg-surface text-fg ' +
  'transition-[background-color,border-color] duration-(--motion-hover) ease-(--ease-hover) ' +
  'focus-visible:outline-(--border-focus-ring) focus-visible:outline-offset-(--focus-offset)';

/**
 * The key's state, resolved to one winning pair of classes.
 *
 * The stylesheet layered `[data-loaded]`, `[data-spent]`, `[data-held]` and
 * `[data-armed]` at equal specificity and let source order decide, which
 * Tailwind cannot reproduce in JSX. The precedence is stated here instead:
 * armed beats held beats spent beats loaded, exactly as the file order did.
 *
 * A spent key is dimmed *and* hatched. The hatch is the non-colour cue, and it
 * is what keeps the dimmed `--fg3` inside the WCAG exemption for disabled
 * controls rather than being a contrast failure (NONET-5). Do not remove the
 * hatch and keep the dimming.
 */
function keyState(
  hold: 'idle' | 'held' | 'armed',
  spent: boolean,
  loaded: boolean,
): { key: string; count: string } {
  // Armed: the dash goes solid, so letting go is never a guess.
  if (hold === 'armed') return { key: 'border border-accent bg-cell-same text-accent', count: 'text-inherit' };
  // Held, before it arms: dashed accent, and the count reads NOTE.
  if (hold === 'held') return { key: 'border-(--border-dashed-accent) text-fg2', count: 'text-inherit' };
  if (spent) {
    return {
      key: 'cursor-default bg-(image:--hatch-spent-key) font-normal text-fg3 [text-decoration:var(--border-spent-strike)]',
      count: 'text-fg3',
    };
  }
  if (loaded) return { key: 'border-accent bg-accent text-accent-ink', count: 'text-accent-ink' };
  return { key: 'hover:bg-hover', count: 'text-fg3-text' };
}

export interface NumberPadProps {
  readonly session: SessionState;
  readonly onAction: (action: Action) => void;
  readonly label?: string;
}

/**
 * The digit pad.
 *
 * Keys show how many of each digit are still unplaced and become
 * non-interactive at zero.
 */
export function NumberPad({ session, onAction, label = 'Number pad' }: NumberPadProps) {
  const locked = session.status !== 'playing';

  /*
   * How many of each digit are still unplaced — all nine in one pass.
   *
   * This was a function that scanned the whole grid for a single digit, called
   * once per key while rendering: nine scans, 729 `getCell` calls, to count the
   * contents of one 81-cell array. `useCallback` memoised the function, which
   * is not the expensive part.
   *
   * Indexed by digit, so slot 0 is unused and a key reads its own count
   * directly.
   */
  const remaining = useMemo(() => {
    const placed = new Array<number>(UNIT_SIZE + 1).fill(0);
    for (let cell = 0; cell < CELL_COUNT; cell += 1) {
      const value = getCell(session.grid, cell);
      // `?? 0` for the index checker only — `value` is 1..9 and the array is
      // sized for it, so the fallback is unreachable.
      if (value !== 0) placed[value] = (placed[value] ?? 0) + 1;
    }
    return placed.map((count) => Math.max(0, UNIT_SIZE - count));
  }, [session.grid]);

  /*
   * The session, for the handlers.
   *
   * They need the mode, the selection and the notes toggle at the moment the
   * key is pressed, not at the moment they are defined — and listing those as
   * dependencies would rebuild the handlers every time any of them changed,
   * which would defeat the memo on all nine keys. The ref keeps the behaviour
   * identical and the identities stable.
   */
  const latest = useRef(session);
  latest.current = session;

  /** A short press: load in digit-first, place in cell-first. */
  const press = useCallback(
    (digit: Digit) => {
      const session = latest.current;
      if (session.status !== 'playing') return;

      if (session.mode === 'digitFirst') {
        onAction({ type: 'loadDigit', digit });
        return;
      }

      const cell = session.selected;
      if (cell === null) return;
      onAction(
        session.notesMode
          ? { type: 'toggleNote', cell, digit }
          : { type: 'placeDigit', cell, digit },
      );
    },
    [onAction],
  );

  /** A long press always writes a note, whatever the mode or the toggle says. */
  const longPress = useCallback(
    (digit: Digit) => {
      const session = latest.current;
      if (session.status !== 'playing') return;
      const cell = session.selected;
      if (cell === null) return;
      onAction({ type: 'toggleNote', cell, digit });
    },
    [onAction],
  );

  const eraseOrLoad = useCallback(() => {
    const session = latest.current;
    if (session.status !== 'playing') return;

    if (session.mode === 'digitFirst') {
      onAction({ type: 'loadDigit', digit: 'erase' });
      return;
    }

    const cell = session.selected;
    if (cell === null) return;
    onAction({ type: 'erase', cell });
  }, [onAction]);

  return (
    <div
      className="flex w-full flex-col gap-2xs"
      role="group"
      aria-label={label}
      aria-disabled={locked ? true : undefined}
    >
      <div className={PAD}>
        {DIGITS.map((digit) => (
          <PadKey
            key={digit}
            digit={digit}
            remaining={remaining[digit] ?? 0}
            loaded={session.mode === 'digitFirst' && session.loadedDigit === digit}
            showPressed={session.mode === 'digitFirst'}
            // Shared by all nine keys; each names itself on the way out.
            onPress={press}
            onLongPress={longPress}
          />
        ))}

        {/*
          ERASE takes the tenth slot of the pad grid, but only below the drawer
          breakpoint — above it the toolbar carries Erase as a chip, and having
          both would put the same control on screen twice. layout.md.

          `drawer:hidden` is `display: none`, which removes it from the
          accessibility tree as well, so exactly one Erase is ever exposed.
        */}
        <button
          className={
            'grid min-h-[58px] cursor-pointer place-items-center border border-line bg-transparent ' +
            'type-control text-fg2 drawer:hidden ' +
            'focus-visible:outline-(--border-focus-ring) focus-visible:outline-offset-(--focus-offset) ' +
            'aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-accent-ink'
          }
          type="button"
          data-key="erase"
          aria-pressed={session.mode === 'digitFirst' ? session.loadedDigit === 'erase' : undefined}
          onClick={eraseOrLoad}
        >
          Erase
        </button>
      </div>
    </div>
  );
}

interface PadKeyProps {
  readonly digit: Digit;
  readonly remaining: number;
  readonly loaded: boolean;
  readonly showPressed: boolean;
  readonly onPress: (digit: Digit) => void;
  readonly onLongPress: (digit: Digit) => void;
}

/**
 * One key. Memoised, on scalars and stable handlers — so a placement re-renders
 * the one key whose count changed, and the one that gained or lost the loaded
 * state, rather than all nine.
 */
const PadKey = memo(function PadKey({
  digit,
  remaining,
  loaded,
  showPressed,
  onPress,
  onLongPress,
}: PadKeyProps) {
  const spent = remaining === 0;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hold, setHold] = useState<'idle' | 'held' | 'armed'>('idle');

  const clear = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => clear, [clear]);

  const start = useCallback(() => {
    if (spent) return;
    // Held straight away, armed at the threshold. Two visible steps, so
    // letting go is never a guess.
    setHold('held');
    timer.current = setTimeout(() => setHold('armed'), HOLD_MS);
  }, [spent]);

  const end = useCallback(() => {
    clear();
    if (!spent) {
      if (hold === 'armed') onLongPress(digit);
      else onPress(digit);
    }
    setHold('idle');
  }, [clear, digit, hold, onLongPress, onPress, spent]);

  const cancel = useCallback(() => {
    clear();
    setHold('idle');
  }, [clear]);

  const state = keyState(hold, spent, loaded);

  return (
    <button
      className={`${KEY_BASE} ${state.key}`}
      type="button"
      data-key={digit}
      data-spent={spent ? '' : undefined}
      data-loaded={loaded ? '' : undefined}
      data-held={hold !== 'idle' ? '' : undefined}
      data-armed={hold === 'armed' ? '' : undefined}
      aria-label={`${digit}, ${remaining === 0 ? 'none remaining' : `${remaining} remaining`}`}
      aria-disabled={spent ? true : undefined}
      aria-pressed={showPressed ? loaded : undefined}
      onPointerDown={start}
      onPointerUp={end}
      onPointerCancel={cancel}
      onPointerLeave={cancel}
      // Keyboard activation never reaches the pointer handlers, so it gets the
      // short-press behaviour directly. Long-press has a keyboard equivalent in
      // Shift+digit, handled by the board.
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        if (!spent) onPress(digit);
      }}
    >
      <span data-role="digit">{digit}</span>
      <span className={`type-mono-label font-normal ${state.count}`} data-role="count" aria-hidden="true">
        {hold === 'idle' ? remaining : 'NOTE'}
      </span>
    </button>
  );
});
