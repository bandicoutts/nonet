'use client';

import { useEffect, useRef } from 'react';
import type { SyncResult } from '@/lib/sync';

const ROW = 'flex items-baseline justify-between gap-s border-b border-line2 py-s last:border-b-0';

/**
 * What happened when this browser met the account.
 *
 * **It reports; it does not ask** (NONET-2). There is no conflict dialog and no
 * choice, because there is no version of this where a player is better off
 * adjudicating their own solve history at the moment they sign in. The rules
 * already decided — server wins for completed solves, latest wins for a board
 * in progress — and this states the outcome plainly enough that nobody has to
 * wonder what was lost.
 *
 * Shown once. Copy from `design/export/copy.md`.
 */
export function MergeSummary({ result, onDismiss }: { result: SyncResult; onDismiss: () => void }) {
  const actionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    actionRef.current?.focus();
  }, []);

  const { solves, keptBoard, discardedBecauseSolved, settingsFrom, streak, totalSolves } = result;
  const fromThisBrowser = solves.uploaded + solves.superseded;

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
        aria-label="Signed in"
        /* In dark the dialog is separated by its rule border, not the shadow
           (NONET-7). Do not drop the border. */
        className="flex max-w-[52ch] flex-col gap-s border border-rule bg-surface p-l shadow-(--shadow-dialog)"
      >
        <p className="type-kicker text-fg3-text">Signed in</p>
        <h2 className="type-display text-fg">Your history came across.</h2>
        <p className="type-body text-fg2">
          Nothing was lost. Completed solves from this browser and from the account are now one
          record; where both held the same day, the account&rsquo;s solve stands.
        </p>

        <dl className="mt-s">
          <div className={ROW}>
            <dt className="type-body-small text-fg2">Solves from this browser</dt>
            <dd className="type-mono-data text-fg">
              {fromThisBrowser}
              {solves.superseded > 0 ? ` · ${solves.superseded} already on the account` : ''}
            </dd>
          </div>
          <div className={ROW}>
            <dt className="type-body-small text-fg2">Added to the account</dt>
            <dd className="type-mono-data text-fg">{solves.uploaded}</dd>
          </div>
          <div className={ROW}>
            <dt className="type-body-small text-fg2">On the account now</dt>
            <dd className="type-mono-data text-fg">{totalSolves}</dd>
          </div>
          <div className={ROW}>
            <dt className="type-body-small text-fg2">Run after merge</dt>
            <dd className="type-mono-data text-fg">{streak} days</dd>
          </div>
          {keptBoard !== 'neither' ? (
            <div className={ROW}>
              <dt className="type-body-small text-fg2">Puzzle in progress</dt>
              <dd className="type-mono-data text-fg">
                kept from {keptBoard === 'guest' ? 'this browser' : 'your other device'}
              </dd>
            </div>
          ) : null}
        </dl>

        {discardedBecauseSolved ? (
          /* Not in copy.md. Said because a board silently disappearing is the
             one outcome here a player could mistake for lost work. */
          <p className="type-body-small text-fg3-text">
            An unfinished board was set aside — that puzzle is already solved on the account.
          </p>
        ) : null}

        {settingsFrom === 'account' ? (
          <p className="type-body-small text-fg3-text">
            Settings came from the account. Change them any time.
          </p>
        ) : null}

        <button
          ref={actionRef}
          type="button"
          onClick={onDismiss}
          className="type-button mt-s min-h-(--tap-target-min) cursor-pointer self-start border-0 bg-fg px-l text-bg transition-colors duration-(--motion-hover) ease-(--ease-hover) hover:bg-accent hover:text-accent-ink focus-visible:outline-(--border-focus-ring) focus-visible:outline-offset-(--focus-offset-prominent)"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
