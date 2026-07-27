'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PUZZLE_EPOCH } from '@nonet/engine';
import { buildRecord, spellNumber, yearGrid } from '@/lib/record';
import type { Day, Record as RecordData, Window } from '@/lib/record';
import { difficultyLabel, formatDuration } from '@/lib/result';
import { localDate, readSolves } from '@/lib/storage';
import type { GuestSolve } from '@/lib/storage';

const TAB =
  'type-chip inline-flex min-h-(--tap-target-min) cursor-pointer items-center border px-s ' +
  'focus-visible:outline-(--border-focus-ring) focus-visible:outline-offset-(--focus-offset)';

/** Heat cell fills, per `components.md`'s `dayFill` table. */
const DAY_FILL: Readonly<Record<Day['status'], string>> = {
  solved: 'bg-fg',
  unplayed: 'bg-transparent border border-line',
  future: 'bg-transparent border border-dashed border-deco',
  'pre-epoch': 'bg-transparent border border-dashed border-deco',
};

/**
 * Record.
 *
 * Every figure is derived in `lib/record.ts` and none is stored (NONET-13), so
 * this renders and does not compute. Copy from `copy.md`, with two figures it
 * asks for that the data cannot honestly supply — both marked below.
 */
export function RecordScreen({ now }: { now?: Date }) {
  const [solves, setSolves] = useState<readonly GuestSolve[] | null>(null);
  const [window, setWindow] = useState<'all' | 'thirty'>('all');
  const [year, setYear] = useState(() => Number(PUZZLE_EPOCH.slice(0, 4)));

  /* Read in an effect: no localStorage on the server (NONET-15). */
  useEffect(() => setSolves(readSolves()), []);

  if (solves === null) return null;

  const today = localDate(now);
  const record = buildRecord(solves, today);
  const shown: Window = window === 'all' ? record.allTime : record.lastThirty;

  if (!record.hasHistory) {
    return (
      <section className="mx-auto flex w-full max-w-[52rem] flex-col gap-s px-m py-l drawer:px-2xl rail:px-4xl">
        <p className="type-kicker text-fg3-text">Record</p>
        <h1 className="type-display text-fg">No record yet.</h1>
        <p className="type-body text-fg2 max-w-[52ch]">
          Nothing recorded yet. Solve today&rsquo;s puzzle and this page starts filling in.
        </p>
        <Link
          href="/"
          className="type-button mt-s inline-flex min-h-(--tap-target-min) w-fit items-center border-0 bg-fg px-l text-bg no-underline transition-colors duration-(--motion-hover) ease-(--ease-hover) hover:bg-accent hover:text-accent-ink focus-visible:outline-(--border-focus-ring) focus-visible:outline-offset-(--focus-offset-prominent)"
        >
          Go to today&rsquo;s puzzle
        </Link>
      </section>
    );
  }

  const years = yearsSince(Number(PUZZLE_EPOCH.slice(0, 4)), Number(today.slice(0, 4)));
  const days = yearGrid(year, solves, today);
  const solvedInYear = days.filter((d) => d.status === 'solved').length;
  const unplayedInYear = days.filter((d) => d.status === 'unplayed').length;

  return (
    <section className="mx-auto flex w-full max-w-[62rem] flex-col gap-l px-m py-l drawer:px-2xl rail:px-4xl">
      <header className="flex flex-col gap-s">
        <p className="type-kicker text-fg3-text">Record</p>
        <h1 className="type-display text-fg">
          {spellNumber(record.allTime.current)} days, unbroken.
        </h1>
        <p className="type-body-small text-fg3-text max-w-[52ch]">
          These figures are stored in this browser only. Sign in if you would like them kept.
        </p>
      </header>

      <div className="flex flex-wrap gap-2xs" role="group" aria-label="Window">
        {(
          [
            ['all', 'All time'],
            ['thirty', 'Last 30 days'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={window === key}
            onClick={() => setWindow(key)}
            className={`${TAB} ${window === key ? 'border-fg bg-fg text-bg' : 'border-line bg-transparent text-fg3-text hover:text-fg'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <dl className="grid grid-cols-2 border-y border-line rail:grid-cols-4">
        <Stat label="Current streak" value={String(shown.current)} first />
        <Stat label="Best streak" value={String(shown.best)} />
        <Stat label="Dailies solved" value={String(shown.solved)} />
        <Stat
          label="Mistake-free"
          value={shown.mistakeFree === null ? '—' : `${shown.mistakeFree}%`}
        />
      </dl>

      <div className="flex flex-col gap-s border-t border-rule pt-m">
        <div className="flex flex-wrap items-baseline justify-between gap-s">
          <p className="type-mono-label text-fg3-text">Completion — {year}</p>
          <div className="flex flex-wrap gap-2xs" role="group" aria-label="Year">
            {years.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={year === option}
                onClick={() => setYear(option)}
                className={`type-chip min-h-(--tap-target-min) cursor-pointer border-0 bg-transparent px-2xs focus-visible:outline-(--border-focus-ring) ${
                  year === option
                    ? 'text-fg [text-decoration:var(--border-underline-active)]'
                    : 'text-fg3-text hover:text-fg'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Seven rows, filled column by column — a column is a week, which is
            what makes a run read as a horizontal streak. */}
        <div className="overflow-x-auto pb-2xs">
          <div
            className="grid w-max grid-flow-col grid-rows-7 gap-[3px]"
            role="img"
            aria-label={`${solvedInYear} solved and ${unplayedInYear} unplayed in ${year}`}
          >
            {days.map((day) => (
              <span
                key={day.date}
                title={day.date}
                className={`h-[9px] w-[9px] ${DAY_FILL[day.status]}`}
              />
            ))}
          </div>
        </div>

        {/* copy.md's summary counts failures. Nothing records a failed *day* —
            a locked board writes no solve row and attempts carry no date — so
            saying so would be a guess. See lib/record.ts. */}
        <p className="type-body-small text-fg3-text">
          {solvedInYear} solved · {unplayedInYear} unplayed
        </p>
      </div>

      <div className="flex flex-col gap-s border-t border-rule pt-m">
        <p className="type-mono-label text-fg3-text">Dailies by difficulty — all time</p>
        <Table
          heads={['Best', 'Median', 'Solved']}
          rows={record.byDifficulty.map((band) => [
            difficultyLabel(band.difficulty),
            band.best === null ? '—' : formatDuration(band.best),
            band.median === null ? '—' : formatDuration(band.median),
            String(band.solved),
          ])}
        />
        {/* copy.md gives "0.4 per puzzle". Not derivable: usedHint is a boolean
            in the guest record and in the solves table, so the count per puzzle
            is stored nowhere. The share says the same thing honestly. */}
        <p className="type-body-small text-fg3-text">
          Assisted solves, all time —{' '}
          {record.assistedShare === null ? '—' : `${record.assistedShare}%`}
        </p>
      </div>

      <div className="flex flex-col gap-s border-t border-rule pt-m">
        <p className="type-mono-label text-fg3-text">Practice — all time</p>
        <Table
          heads={['Played', 'Median']}
          rows={record.practice.map((band) => [
            difficultyLabel(band.difficulty),
            String(band.played),
            band.median === null ? '—' : formatDuration(band.median),
          ])}
        />
        <p className="type-body-small text-fg3-text">
          Practice never affects the streak or the daily percentile.
        </p>
      </div>
    </section>
  );
}

function Stat({ label, value, first = false }: { label: string; value: string; first?: boolean }) {
  return (
    <div
      className={`flex flex-col gap-2xs border-line px-0 py-m drawer:px-m ${
        first ? '' : 'border-l'
      }`}
    >
      <dt className="type-mono-label text-fg3-text">{label}</dt>
      <dd className="type-streak-number text-fg tabular-nums">{value}</dd>
    </div>
  );
}

function Table({ heads, rows }: { heads: readonly string[]; rows: readonly string[][] }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className="type-mono-label border-b border-line py-2xs text-left text-fg3-text" />
          {heads.map((head) => (
            <th
              key={head}
              className="type-mono-label border-b border-line py-2xs text-right text-fg3-text"
            >
              {head}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row[0]}>
            {row.map((value, column) => (
              <td
                key={column}
                className={`type-body-small border-b border-line2 py-s ${
                  column === 0 ? 'text-left text-fg' : 'text-right text-fg2 tabular-nums'
                }`}
              >
                {value}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Every year with editions in it, newest last. */
function yearsSince(from: number, to: number): number[] {
  return Array.from({ length: Math.max(1, to - from + 1) }, (_, i) => from + i);
}
