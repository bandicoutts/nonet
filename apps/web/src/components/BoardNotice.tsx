'use client';

import Link from 'next/link';

/**
 * An inline notice above the board.
 *
 * **The dismiss is a real target.** `components.md` draws it as an 11px mono
 * label with 6px of padding, which `layout.md` measured at ~22px — the single
 * WCAG AA target-size breach in the whole design, against a 24px minimum
 * (NONET-9). It is built at the product's own 44px standard instead: the label
 * keeps its drawn size and the hit area is padded out around it, so nothing
 * about the design changes and the control is reachable.
 *
 * Copy verbatim from `design/export/copy.md`.
 */
export function BoardNotice({
  children,
  onDismiss,
}: {
  readonly children: React.ReactNode;
  readonly onDismiss: () => void;
}) {
  return (
    <div
      /* Polite: a notice above a puzzle is context, never an interruption. */
      role="status"
      aria-live="polite"
      className="mb-s flex flex-wrap items-center justify-between gap-s border border-line2 bg-surface px-m py-s"
    >
      <p className="type-body-small m-0 text-fg2">{children}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="type-mono-label -my-s inline-flex min-h-(--tap-target-min) cursor-pointer items-center border-0 bg-transparent px-2xs text-fg3-text hover:text-fg focus-visible:outline-(--border-focus-ring) focus-visible:outline-offset-(--focus-offset)"
      >
        Dismiss
      </button>
    </div>
  );
}

/**
 * First time here.
 *
 * Shown only to a player with no history at all, and only once — dismissing it
 * is remembered, because an offer to read the rules that reappears every visit
 * stops reading as an offer.
 */
export function FirstRunNotice({ onDismiss }: { readonly onDismiss: () => void }) {
  return (
    <BoardNotice onDismiss={onDismiss}>
      First time here?{' '}
      <Link href="/how-to-play" className="text-accent underline underline-offset-4 hover:text-fg">
        Read how Nonet works
      </Link>{' '}
      — it takes a minute.
    </BoardNotice>
  );
}

/**
 * This board arrived from another device.
 *
 * Said because the alternative is silently confusing: a player who opens a
 * puzzle on their laptop and finds twenty cells already filled has no way to
 * tell whether that is their own work or a bug. It can only be known because
 * the sign-in merge marks the board it kept (NONET-34).
 */
export function ResumedNotice({
  placed,
  time,
  onDismiss,
}: {
  readonly placed: number;
  /** A node, not a string, so a live readout can be dropped in without a wrapper. */
  readonly time: React.ReactNode;
  readonly onDismiss: () => void;
}) {
  return (
    <BoardNotice onDismiss={onDismiss}>
      Resumed from your other device — {placed} of 81 placed, timer at {time}.
    </BoardNotice>
  );
}
