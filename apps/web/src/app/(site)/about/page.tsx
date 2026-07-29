import type { Metadata } from 'next';
import { PUZZLE_EPOCH } from '@nonet/engine';

export const metadata: Metadata = {
  title: 'About',
  description: 'A nonet is a set of nine.',
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** `1 January 2026`, from the parts so no timezone can shift it. */
function longDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return `${day} ${MONTHS[(month ?? 1) - 1]} ${year}`;
}

/**
 * About.
 *
 * Copy from `design/export/copy.md`, with two lines that could not be
 * transcribed:
 *
 * **The first edition is derived, not written.** The export says "No. 1 · 26
 * February 2023", which belongs to the same invented three-year history as the
 * prototype's "No. 1247" — rejected in NONET-16 on the grounds that a product
 * whose streak model rests on not overstating things should not open by
 * overstating its own age. It reads from `PUZZLE_EPOCH`, so it cannot drift
 * from the archive.
 *
 * **The contact address is omitted.** The export gives `hello@nonet.app`, and
 * that domain is not owned (NONET-30) — a contact address that bounces is worse
 * than no contact at all, because it looks like being ignored rather than like
 * an omission.
 *
 * The *site* address is settled even though the mailbox is not: it is
 * `SITE_URL` in `lib/site.ts`, currently the Vercel deployment, and that is the
 * product's address by choice rather than a placeholder waiting on a custom
 * domain. A custom domain would change that one constant. A contact address
 * needs a mailbox as well as a domain, which is why it is still absent here.
 */
export default function Page() {
  return (
    <section className="mx-auto flex w-full max-w-[52rem] flex-col gap-l px-m py-l drawer:px-2xl rail:px-4xl">
      <header className="flex flex-col gap-s">
        <p className="type-kicker text-fg3-text">About</p>
        <h1 className="type-display text-fg">A nonet is a set of nine.</h1>
        <p className="type-body text-fg2 max-w-[56ch]">
          Nine rows, nine columns, nine boxes. One puzzle a day, set by hand and checked by
          machine, published at 00:05 UTC and gone by midnight &mdash; plus as much practice as you
          want, whenever you want it.
        </p>
        <p className="type-body text-fg2 max-w-[56ch]">
          No advertising, no notifications, no confetti. The grid is the interface; everything else
          stays out of the way.
        </p>
      </header>

      <dl className="flex flex-col border-t border-rule pt-m">
        {(
          [
            ['Typeface', 'Archivo, IBM Plex Mono'],
            ['Puzzles', 'Generated and verified for a single solution'],
            ['First edition', `No. 1 · ${longDate(PUZZLE_EPOCH)}`],
          ] as const
        ).map(([term, value]) => (
          <div
            key={term}
            className="flex flex-col gap-2xs border-b border-line2 py-s drawer:flex-row drawer:items-baseline drawer:justify-between drawer:gap-l"
          >
            <dt className="type-mono-label text-fg3-text">{term}</dt>
            <dd className="type-body-small text-fg2">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
