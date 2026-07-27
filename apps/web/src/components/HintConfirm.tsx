'use client';

import { useEffect, useRef } from 'react';

/**
 * The first hint of a puzzle confirms once.
 *
 * It is irreversible, it forfeits the percentile, and it cannot be undone
 * (GAME-RULES.md), so the cost is stated before it is paid. Hints two and three
 * go straight through — the cost has already been accepted, and asking again
 * would be nagging rather than informing.
 *
 * Focus lands on the primary action and Esc is the second action, per the
 * prototype's Focus screen. Copy is verbatim from `design/export/copy.md`.
 */
export function HintConfirm({ onUse, onDismiss }: { onUse: () => void; onDismiss: () => void }) {
  const primaryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    primaryRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-veil/80 p-ml"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onDismiss();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Use a hint"
        /* In dark the dialog is separated by its rule border, not by the
           shadow — the shadow cannot carry it over a near-black scrim
           (NONET-7). Do not drop the border. */
        className="flex max-w-[42ch] flex-col gap-s border border-rule bg-surface p-l shadow-(--shadow-dialog)"
      >
        <p className="type-kicker text-fg3-text">Use a hint</p>
        <p className="type-body text-fg2">
          A hint fills the selected cell with its answer. It marks this solve assisted and gives up
          today&rsquo;s percentile. Your run is not affected, and two further hints stay available.
        </p>

        <div className="mt-xs flex flex-wrap gap-xs">
          <button
            ref={primaryRef}
            type="button"
            onClick={onUse}
            className="type-button min-h-(--tap-target-min) cursor-pointer border-0 bg-fg px-l text-bg transition-colors duration-(--motion-hover) ease-(--ease-hover) hover:bg-accent hover:text-accent-ink focus-visible:outline-(--border-focus-ring) focus-visible:outline-offset-(--focus-offset-prominent)"
          >
            Use a hint
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="type-button min-h-(--tap-target-min) cursor-pointer border border-line bg-transparent px-l text-fg2 transition-colors duration-(--motion-hover) ease-(--ease-hover) hover:bg-hover focus-visible:outline-(--border-focus-ring) focus-visible:outline-offset-(--focus-offset)"
          >
            Not yet
          </button>
        </div>
      </div>
    </div>
  );
}
