'use client';

import { useEffect, useRef } from 'react';
import type { Difficulty } from '@nonet/engine';
import type { InFlightBoard } from '@/lib/home';
import { difficultyLabel, formatDuration } from '@/lib/result';

/**
 * Starting a practice puzzle while one is open.
 *
 * The only control on Home that destroys something: practice boards are not
 * kept, so the open one is gone rather than set aside. That is why this asks —
 * everywhere else in the product, leaving a puzzle preserves it.
 *
 * Focus lands on the first action, Tab is trapped, Escape is the second action
 * and focus returns to the opener, per the prototype's Focus screen. Copy from
 * `copy.md`.
 */
export function AbandonConfirm({
  board,
  difficulty,
  onDiscard,
  onKeep,
}: {
  readonly board: InFlightBoard;
  readonly difficulty: Difficulty;
  readonly onDiscard: () => void;
  readonly onKeep: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLButtonElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    opener.current = document.activeElement;
    first.current?.focus();

    return () => {
      // Focus goes back where it came from, unless the dialog's action moved
      // the page out from under it.
      if (opener.current instanceof HTMLElement && document.contains(opener.current)) {
        opener.current.focus();
      }
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-veil/90 p-ml"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          onKeep();
          return;
        }
        if (event.key !== 'Tab') return;

        // Without a trap, Tab walks out into a page the player cannot act on
        // while the dialog is covering it.
        const focusable = panel.current?.querySelectorAll<HTMLElement>('button');
        if (focusable === undefined || focusable.length === 0) return;

        const edge = event.shiftKey ? focusable[0] : focusable[focusable.length - 1];
        if (document.activeElement === edge) {
          event.preventDefault();
          (event.shiftKey ? focusable[focusable.length - 1] : focusable[0])?.focus();
        }
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Practice in progress"
        /* In dark the panel is separated by its rule border, not the shadow
           (NONET-7). Do not drop the border. */
        className="flex max-w-[44ch] flex-col gap-s border border-rule bg-bg p-l shadow-(--shadow-dialog)"
      >
        <p className="type-kicker text-fg3-text">Practice in progress</p>
        <p className="type-body text-fg2">
          {difficultyLabel(board.ref.difficulty)} · {board.placed} of 81 placed ·{' '}
          {formatDuration(board.elapsedMs)}. Starting {difficultyLabel(difficulty)} discards it —
          practice puzzles are not kept.
        </p>

        <div className="mt-s flex flex-wrap gap-s">
          <button
            ref={first}
            type="button"
            onClick={onDiscard}
            className="type-button min-h-(--tap-target-min) cursor-pointer border-0 bg-fg px-l text-bg transition-colors duration-(--motion-hover) ease-(--ease-hover) hover:bg-accent hover:text-accent-ink focus-visible:outline-(--border-focus-ring) focus-visible:outline-offset-(--focus-offset-prominent)"
          >
            Discard and start
          </button>
          <button
            type="button"
            onClick={onKeep}
            className="type-button min-h-(--tap-target-min) cursor-pointer border border-fg bg-transparent px-l text-fg transition-colors duration-(--motion-hover) ease-(--ease-hover) hover:bg-hover focus-visible:outline-(--border-focus-ring) focus-visible:outline-offset-(--focus-offset-prominent)"
          >
            Keep playing
          </button>
        </div>
      </div>
    </div>
  );
}
