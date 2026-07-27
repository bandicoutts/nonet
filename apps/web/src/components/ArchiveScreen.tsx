'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { DIFFICULTIES } from '@nonet/engine';
import type { Difficulty } from '@nonet/engine';
import {
  NO_FILTERS,
  browsableMonths,
  leadingBlanks,
  matches,
  monthEditions,
} from '@/lib/archive';
import type { Edition, EditionStatus, Filters } from '@/lib/archive';
import { difficultyLabel, formatDuration } from '@/lib/result';
import { readFailures, refParams } from '@/lib/puzzles';
import type { FailureRecord } from '@/lib/puzzles';
import { readSolves } from '@/lib/storage';
import type { GuestSolve } from '@/lib/storage';

const CHIP =
  'type-chip inline-flex min-h-(--tap-target-min) cursor-pointer items-center border px-s ' +
  'focus-visible:outline-(--border-focus-ring) focus-visible:outline-offset-(--focus-offset)';

const CHIP_ON = 'border-accent bg-accent text-accent-ink';
const CHIP_OFF = 'border-line bg-transparent text-fg3-text hover:text-fg';

/** Per `components.md`'s calendar-day state table. */
const DAY_STYLE: Readonly<Record<EditionStatus, string>> = {
  solved: 'border border-fg bg-fg text-bg',
  failed: 'border border-error bg-error text-accent-ink',
  unplayed: 'border border-line bg-transparent text-fg3-text',
  today: 'border-2 border-accent bg-transparent text-accent',
  /*
   * `--deco` draws the border but never the text. It is contrast-exempt as a
   * decorative token (NONET-5), and a day number is something a sighted player
   * reads — so the dashed border carries "no puzzle here" and the numeral uses
   * the token that was sized to be readable.
   */
  future: 'border border-dashed border-deco bg-transparent text-fg3-text',
  'pre-epoch': 'border border-dashed border-deco bg-transparent text-fg3-text',
};

const STATUSES: readonly EditionStatus[] = ['unplayed', 'solved', 'failed', 'today'];
const STATUS_LABEL: Partial<Record<EditionStatus, string>> = {
  unplayed: 'Unplayed',
  solved: 'Solved',
  failed: 'Failed',
  today: 'Today',
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Archive.
 *
 * Every edition is derived from its date (NONET-16), so the whole page is
 * browsable with Supabase down and without a `puzzles` row existing — the same
 * property that lets the daily be played offline.
 *
 * A failed edition is drawn and filterable: failures are recorded with the day
 * they happened, so a day that was attempted and lost is distinguishable from
 * one never opened (NONET-27). A failure is not a solve row — NONET-17 keeps
 * those for finished runs — but its own record.
 */
export function ArchiveScreen({ now }: { now?: Date }) {
  const [solves, setSolves] = useState<readonly GuestSolve[] | null>(null);
  const [failures, setFailures] = useState<readonly FailureRecord[]>([]);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);

  const months = useMemo(() => browsableMonths(now), [now]);
  const [index, setIndex] = useState(0);

  /* Read in an effect: no localStorage on the server (NONET-15). */
  useEffect(() => {
    setSolves(readSolves());
    setFailures(readFailures());
  }, []);

  const shown = months[index] ?? months[0];
  const editions = useMemo(
    () =>
      solves === null || shown === undefined
        ? []
        : monthEditions(shown.year, shown.month, solves, failures, now),
    [solves, failures, shown, now],
  );

  if (solves === null || shown === undefined) return null;

  const playable = editions.filter((e) => e.status !== 'future' && e.status !== 'pre-epoch');
  const matching = playable.filter((e) => matches(e, filters));
  const filtered = filters.difficulties.length > 0 || filters.statuses.length > 0;

  const toggle = <T,>(list: readonly T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  return (
    <section className="mx-auto flex w-full max-w-[62rem] flex-col gap-l px-m py-l drawer:px-2xl rail:px-4xl">
      <header className="flex flex-col gap-s">
        <p className="type-kicker text-fg3-text">Archive</p>
        <h1 className="type-display text-fg">Every edition since No. 1.</h1>
        <p className="type-body text-fg2 max-w-[52ch]">
          All free, all playable. Archive solves are recorded, but only today&rsquo;s puzzle can
          extend a run.
        </p>
      </header>

      <div className="flex flex-col gap-s border-t border-rule pt-m">
        <ChipGroup
          label="Difficulty"
          options={DIFFICULTIES.map((d) => [d, difficultyLabel(d)] as const)}
          active={filters.difficulties}
          onToggle={(d) => setFilters((f) => ({ ...f, difficulties: toggle(f.difficulties, d) }))}
        />
        <ChipGroup
          label="Status"
          options={STATUSES.map((s) => [s, STATUS_LABEL[s] ?? s] as const)}
          active={filters.statuses}
          onToggle={(s) => setFilters((f) => ({ ...f, statuses: toggle(f.statuses, s) }))}
        />

        <div className="flex flex-wrap items-baseline gap-s">
          <p className="type-body-small text-fg3-text">
            {matching.length} of {playable.length} in {MONTHS[shown.month - 1]}
          </p>
          {filtered ? (
            <button
              type="button"
              onClick={() => setFilters(NO_FILTERS)}
              className="type-control min-h-(--tap-target-min) cursor-pointer border-0 bg-transparent text-fg2 hover:text-fg focus-visible:outline-(--border-focus-ring)"
            >
              Clear all
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-s">
        <div className="flex items-center justify-between gap-s">
          <button
            type="button"
            aria-label="Later month"
            aria-disabled={index === 0 || undefined}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            className={NAV}
          >
            &larr;
          </button>
          <p className="type-month-number text-fg">
            {MONTHS[shown.month - 1]} {shown.year}
          </p>
          <button
            type="button"
            aria-label="Earlier month"
            aria-disabled={index >= months.length - 1 || undefined}
            onClick={() => setIndex((i) => Math.min(months.length - 1, i + 1))}
            className={NAV}
          >
            &rarr;
          </button>
        </div>

        {/* Hidden below the drawer breakpoint, where the cells would be 30px
            and under any usable touch target, so the list is the only way in
            (layout.md). Not `aria-hidden`: it holds real links at this width,
            and hiding focusable content from the tree leaves a keyboard player
            tabbing through controls a screen reader cannot see. */}
        <div className="hidden drawer:block">
          <div className="grid grid-cols-7 gap-2xs">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((head, i) => (
              <p key={i} className="type-mono-label text-center text-fg3-text">
                {head}
              </p>
            ))}
            {Array.from({ length: leadingBlanks(shown.year, shown.month) }, (_, i) => (
              <span key={`blank-${i}`} />
            ))}
            {editions.map((edition) => (
              <Cell key={edition.date} edition={edition} dimmed={!matches(edition, filters)} />
            ))}
          </div>
        </div>

        <ul className="flex flex-col">
          {matching.length === 0 ? (
            <li className="type-body text-fg2 py-m">
              Nothing in this month matches the filter. Try another month, or clear it.
            </li>
          ) : (
            matching.map((edition) => (
              <li key={edition.date}>
                <Link
                  href={`/board?${refParams(edition.ref)}`}
                  className="type-body-small flex min-h-[56px] items-center justify-between gap-s border-b border-line py-s text-fg no-underline hover:text-accent"
                >
                  <span>
                    {formatShort(edition.date)} · No. {edition.number}
                  </span>
                  <span className="flex items-center gap-s text-fg3-text">
                    <span>{difficultyLabel(edition.difficulty)}</span>
                    <span className="tabular-nums">
                      {edition.durationMs === null ? '—' : formatDuration(edition.durationMs)}
                    </span>
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>

        <p className="type-body-small text-fg3-text">
          {playable.length} editions · No. 1 was 27 July 2026
        </p>
      </div>
    </section>
  );
}

const NAV =
  'type-control flex size-[44px] cursor-pointer items-center justify-center border-0 bg-transparent ' +
  'text-fg2 hover:text-fg aria-disabled:cursor-default aria-disabled:text-fg3 ' +
  'focus-visible:outline-(--border-focus-ring)';

function Cell({ edition, dimmed }: { edition: Edition; dimmed: boolean }) {
  const day = Number(edition.date.slice(8));
  const playable = edition.status !== 'future' && edition.status !== 'pre-epoch';

  const content = (
    <>
      <span className="type-mono-data tabular-nums">{day}</span>
      {playable ? (
        <span className="type-mono-label opacity-[.8]">
          {difficultyLabel(edition.difficulty).slice(0, edition.difficulty === 'expert' ? 2 : 1)}
        </span>
      ) : null}
    </>
  );

  const className = `flex min-h-[66px] flex-col items-start justify-between p-2xs ${DAY_STYLE[edition.status]} ${
    dimmed ? 'opacity-[.3]' : ''
  }`;

  // A future or pre-epoch day is not a link: there is nothing to play.
  if (!playable || dimmed) return <span className={className}>{content}</span>;

  return (
    <Link href={`/board?${refParams(edition.ref)}`} className={`${className} no-underline`}>
      {content}
    </Link>
  );
}

function ChipGroup<T extends string>({
  label,
  options,
  active,
  onToggle,
}: {
  label: string;
  options: readonly (readonly [T, string])[];
  active: readonly T[];
  onToggle: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2xs" role="group" aria-label={label}>
      <p className="type-mono-label mr-2xs text-fg3-text">{label}</p>
      {options.map(([value, text]) => (
        <button
          key={value}
          type="button"
          aria-pressed={active.includes(value)}
          onClick={() => onToggle(value)}
          className={`${CHIP} ${active.includes(value) ? CHIP_ON : CHIP_OFF}`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

/** `27 Jul 2026`, from the parts so no timezone can shift it. */
function formatShort(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return `${day} ${(MONTHS[(month ?? 1) - 1] ?? '').slice(0, 3)} ${year}`;
}
