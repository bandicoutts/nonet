import { useCallback, useEffect, useRef, useState } from 'react';
import { DIGITS, UNIT_SIZE, getCell } from '@nonet/engine';
import type { Action, Digit, SessionState } from '@nonet/engine';
import styles from './NumberPad.module.css';

/**
 * How long a press has to last before it arms as a note.
 *
 * 340ms, from `design/export/components.md`. The gesture takes a pencil mark
 * from four taps to two (GAME-RULES.md), and the spec is explicit that
 * **arming is a visible step, not silent**: the key shows it is held as soon as
 * the press begins, then changes again when it arms, so a player can tell
 * whether letting go will place a digit or pencil one.
 */
export const HOLD_MS = 340;

export interface NumberPadProps {
  readonly session: SessionState;
  readonly onAction: (action: Action) => void;
  readonly label?: string;
}

/**
 * The digit pad.
 *
 * Keys show how many of each digit are still unplaced and become
 * non-interactive at zero. A spent key is dimmed *and* hatched: the hatch is
 * the non-colour cue, and it is what keeps the dimmed `--fg3` inside the WCAG
 * exemption for disabled controls rather than being a contrast failure
 * (DECISIONS.md NONET-5). Removing it would break that.
 */
export function NumberPad({ session, onAction, label = 'Number pad' }: NumberPadProps) {
  const locked = session.status !== 'playing';

  const remaining = useCallback(
    (digit: Digit) => {
      let placed = 0;
      for (let cell = 0; cell < 81; cell += 1) {
        if (getCell(session.grid, cell) === digit) placed += 1;
      }
      return Math.max(0, UNIT_SIZE - placed);
    },
    [session.grid],
  );

  /** A short press: load in digit-first, place in cell-first. */
  const press = useCallback(
    (digit: Digit) => {
      if (locked) return;

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
    [locked, onAction, session.mode, session.notesMode, session.selected],
  );

  /** A long press always writes a note, whatever the mode or the toggle says. */
  const longPress = useCallback(
    (digit: Digit) => {
      if (locked) return;
      const cell = session.selected;
      if (cell === null) return;
      onAction({ type: 'toggleNote', cell, digit });
    },
    [locked, onAction, session.selected],
  );

  const eraseOrLoad = useCallback(() => {
    if (locked) return;

    if (session.mode === 'digitFirst') {
      onAction({ type: 'loadDigit', digit: 'erase' });
      return;
    }

    const cell = session.selected;
    if (cell === null) return;
    onAction({ type: 'erase', cell });
  }, [locked, onAction, session.mode, session.selected]);

  return (
    <div className={styles.padGroup} role="group" aria-label={label} aria-disabled={locked ? true : undefined}>
      <div className={styles.pad}>
      {DIGITS.map((digit) => (
        <PadKey
          key={digit}
          digit={digit}
          remaining={remaining(digit)}
          loaded={session.mode === 'digitFirst' && session.loadedDigit === digit}
          showPressed={session.mode === 'digitFirst'}
          onPress={() => press(digit)}
          onLongPress={() => longPress(digit)}
        />
      ))}


        {/*
          ERASE takes the tenth slot of the pad grid, but only below the drawer
          breakpoint — above it the toolbar carries Erase as a chip, and having
          both would put the same control on screen twice. layout.md.
        */}
        <button
          className={styles.eraseKey}
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
  readonly onPress: () => void;
  readonly onLongPress: () => void;
}

function PadKey({ digit, remaining, loaded, showPressed, onPress, onLongPress }: PadKeyProps) {
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
      if (hold === 'armed') onLongPress();
      else onPress();
    }
    setHold('idle');
  }, [clear, hold, onLongPress, onPress, spent]);

  const cancel = useCallback(() => {
    clear();
    setHold('idle');
  }, [clear]);

  return (
    <button
      className={styles.key}
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
        if (!spent) onPress();
      }}
    >
      <span data-role="digit">{digit}</span>
      <span className={styles.count} data-role="count" aria-hidden="true">
        {hold === 'idle' ? remaining : 'NOTE'}
      </span>
    </button>
  );
}
